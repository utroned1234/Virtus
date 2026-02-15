import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            username: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.withdrawal.count({
      where: { status: 'PENDING' },
    })

    const userIds = Array.from(new Set(withdrawals.map((w) => w.user_id)))

    // Obtener saldo actual del ledger (ya incluye descuentos de solicitudes pendientes)
    const totals = userIds.length
      ? await prisma.walletLedger.groupBy({
          by: ['user_id'],
          where: { user_id: { in: userIds } },
          _sum: { amount_bs: true },
        })
      : []

    // Obtener suma de retiros pendientes por usuario (para sumar al saldo mostrado)
    const pendingWithdrawals = userIds.length
      ? await prisma.withdrawal.groupBy({
          by: ['user_id'],
          where: {
            user_id: { in: userIds },
            status: 'PENDING'
          },
          _sum: { amount_bs: true },
        })
      : []

    const totalsMap = new Map(
      totals.map((t) => [t.user_id, t._sum.amount_bs || 0])
    )

    const pendingMap = new Map(
      pendingWithdrawals.map((p) => [p.user_id, p._sum.amount_bs || 0])
    )

    // El saldo mostrado en admin = saldo actual + retiros pendientes (para revertir el descuento)
    const payload = withdrawals.map((w) => ({
      ...w,
      total_earnings_bs: (totalsMap.get(w.user_id) || 0) + (pendingMap.get(w.user_id) || 0),
    }))

    return NextResponse.json({
      withdrawals: payload,
      total_count: totalCount,
      has_more: offset + withdrawals.length < totalCount,
      next_offset: offset + withdrawals.length,
    })
  } catch (error) {
    console.error('Admin withdrawals error:', error)
    return NextResponse.json(
      { error: 'Error al cargar retiros' },
      { status: 500 }
    )
  }
}
