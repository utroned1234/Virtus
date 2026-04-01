import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// GET - Get tasks and user's completion status
// Tasks are unlocked when admin updates video URLs
// User must complete tasks (watch videos) that were updated after their last completion
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Verificar que el usuario tenga al menos un paquete JADE activo
    const activePackageCount = await prisma.purchase.count({
      where: {
        user_id: authResult.user.userId,
        status: 'ACTIVE',
      },
    })

    const hasActivePackage = activePackageCount > 0

    // Get all active tasks
    const tasks = await prisma.dailyTask.findMany({
      where: { is_active: true },
      orderBy: { position: 'asc' },
    })

    // Get user's most recent completion for each task
    const completions = await prisma.taskCompletion.findMany({
      where: {
        user_id: authResult.user.userId,
        task_id: { in: tasks.map(t => t.id) },
      },
      orderBy: { completed_at: 'desc' },
    })

    // Map tasks with completion status
    // A task is "completed" only if the completion was done AFTER the task was last updated
    const tasksWithStatus = tasks.map(task => {
      // Find the most recent completion for this task
      const completion = completions.find(c => c.task_id === task.id)

      // Task is completed only if:
      // 1. There's a completion record
      // 2. The completion was done AFTER the task was last updated (image changed)
      const isCompleted = completion && completion.completed_at > task.updated_at

      return {
        ...task,
        completed: isCompleted,
        rating: isCompleted ? completion?.rating : null,
        comment: isCompleted ? completion?.comment : null,
      }
    })

    // Count how many tasks are actually completed (after their last update)
    const completedCount = tasksWithStatus.filter(t => t.completed).length

    // Check if all 4 tasks are completed
    const allCompleted = tasks.length === 4 && completedCount === 4

    return NextResponse.json({
      tasks: tasksWithStatus,
      all_completed: allCompleted,
      completed_count: completedCount,
      total_tasks: tasks.length,
      has_active_package: hasActivePackage,
    })
  } catch (error) {
    console.error('Get user tasks error:', error)
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

// POST - Submit a task completion (video watched)
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Verificar que el usuario tenga al menos un paquete JADE activo
    const activePackageCount = await prisma.purchase.count({
      where: {
        user_id: authResult.user.userId,
        status: 'ACTIVE',
      },
    })

    if (activePackageCount === 0) {
      return NextResponse.json(
        { error: 'Debes tener al menos un paquete JADE activo para completar tareas' },
        { status: 403 }
      )
    }

    const { task_id } = await req.json()

    if (!task_id) {
      return NextResponse.json({ error: 'ID de tarea requerido' }, { status: 400 })
    }

    // Check if task exists
    const task = await prisma.dailyTask.findUnique({
      where: { id: task_id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    // Check if already completed after the task was last updated
    const existingCompletion = await prisma.taskCompletion.findFirst({
      where: {
        user_id: authResult.user.userId,
        task_id,
        completed_at: { gt: task.updated_at },
      },
    })

    if (existingCompletion) {
      return NextResponse.json({ error: 'Ya completaste esta tarea' }, { status: 400 })
    }

    // Create completion (video watched)
    const completion = await prisma.taskCompletion.create({
      data: {
        user_id: authResult.user.userId,
        task_id,
      },
    })

    // Check if all tasks are now completed
    const allTasks = await prisma.dailyTask.findMany({
      where: { is_active: true },
    })

    // Count completed tasks (completions after task update)
    let completedCount = 0
    for (const t of allTasks) {
      const comp = await prisma.taskCompletion.findFirst({
        where: {
          user_id: authResult.user.userId,
          task_id: t.id,
          completed_at: { gt: t.updated_at },
        },
      })
      if (comp) completedCount++
    }

    const allCompleted = allTasks.length === 4 && completedCount === 4

    return NextResponse.json({
      completion,
      message: 'Tarea completada',
      all_completed: allCompleted,
      completed_count: completedCount,
    })
  } catch (error) {
    console.error('Submit task completion error:', error)
    return NextResponse.json({ error: 'Error al completar tarea' }, { status: 500 })
  }
}
