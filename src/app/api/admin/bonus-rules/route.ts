import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const rules = await prisma.referralBonusRule.findMany({
      orderBy: { level: 'asc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Get bonus rules error:', error)
    return NextResponse.json(
      { error: 'Error al cargar reglas de bonos' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await req.json()
    const id = typeof body.id === 'string' ? parseInt(body.id, 10) : body.id
    const percentage = typeof body.percentage === 'string' ? parseFloat(body.percentage) : body.percentage

    if (!id || percentage === undefined || isNaN(percentage)) {
      return NextResponse.json({ error: 'Datos incompletos o inválidos' }, { status: 400 })
    }

    // Validar que el porcentaje esté en rango válido
    if (percentage < 0 || percentage > 100) {
      return NextResponse.json({ error: 'El porcentaje debe estar entre 0 y 100' }, { status: 400 })
    }

    const updated = await prisma.referralBonusRule.update({
      where: { id },
      data: {
        percentage,
      },
    })

    console.log(`[BONUS] Regla nivel ${updated.level} actualizada a ${updated.percentage}%`)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update bonus rule error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar regla' },
      { status: 500 }
    )
  }
}
