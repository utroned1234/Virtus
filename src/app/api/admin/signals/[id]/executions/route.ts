import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// GET: Returns who executed a signal and who didn't (active users without execution)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const signal = await (prisma as any).signal.findUnique({
      where: { id: params.id },
    })

    if (!signal) {
      return NextResponse.json({ error: 'Señal no encontrada' }, { status: 404 })
    }

    // Get all executions for this signal
    const executions = await (prisma as any).signalExecution.findMany({
      where: { signal_id: params.id },
      include: {
        user: { select: { username: true, full_name: true } },
        purchase: {
          select: {
            vip_package: { select: { name: true, investment_bs: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    })

    // Get all FutureOrders for this signal to check current status (ACTIVE/WIN)
    const orders = await prisma.futureOrder.findMany({
      where: { signal_id: params.id },
      select: { user_id: true, status: true },
    })
    const orderStatusByUser = new Map(orders.map((o: any) => [o.user_id, o.status]))

    // Get all users with ACTIVE purchases (these are the ones who could have executed)
    const activeUsers = await prisma.purchase.findMany({
      where: { status: 'ACTIVE' },
      distinct: ['user_id'],
      select: {
        user_id: true,
        user: { select: { username: true, full_name: true } },
        vip_package: { select: { name: true, investment_bs: true } },
        current_capital: true,
      },
    })

    const executedUserIds = new Set(executions.map((e: any) => e.user_id))

    // Users with active packages who did NOT execute this signal
    const notExecuted = activeUsers
      .filter((u: any) => !executedUserIds.has(u.user_id))
      .map((u: any) => ({
        user_id: u.user_id,
        username: u.user.username,
        full_name: u.user.full_name,
        package_name: u.vip_package.name,
        current_capital: u.current_capital || u.vip_package.investment_bs,
      }))

    // Map executions to clean response
    const executedList = executions.map((e: any) => ({
      user_id: e.user_id,
      username: e.user.username,
      full_name: e.user.full_name,
      package_name: e.purchase?.vip_package?.name || '—',
      capital_before: e.capital_before,
      capital_after: e.capital_before + e.capital_added,
      gain_total: e.gain_total,
      capital_added: e.capital_added,
      senal_profit: e.senal_profit,
      global_bonus: e.global_bonus,
      user_rank: e.user_rank,
      order_status: orderStatusByUser.get(e.user_id) || 'ACTIVE',
      created_at: e.created_at,
    }))

    return NextResponse.json({
      signal: {
        id: signal.id,
        code: signal.code,
        label: signal.label,
        status: signal.status,
        created_at: signal.created_at,
      },
      executed: executedList,
      not_executed: notExecuted,
      executed_count: executedList.length,
      not_executed_count: notExecuted.length,
      total_active_users: activeUsers.length,
    })
  } catch (error) {
    console.error('Signal executions error:', error)
    return NextResponse.json({ error: 'Error al cargar ejecuciones' }, { status: 500 })
  }
}
