import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// GET: Fetch all future orders with stats
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'all'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const where: any = {}
    if (status === 'MANUAL') {
      where.signal_id = null
    } else if (status !== 'all') {
      where.status = status
    }

    const [orders, total, stats] = await Promise.all([
      prisma.futureOrder.findMany({
        where,
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
      }),
      prisma.futureOrder.count({ where }),
      prisma.futureOrder.aggregate({
        _sum: { amount_bs: true, pnl_bs: true },
        _count: true,
      }),
    ])

    // Stats by status
    const [activeCount, winCount, lossCount] = await Promise.all([
      prisma.futureOrder.count({ where: { status: 'ACTIVE' } }),
      prisma.futureOrder.count({ where: { status: 'WIN' } }),
      prisma.futureOrder.count({ where: { status: 'LOSS' } }),
    ])

    // Platform profit (sum of all PNL * -1, since user PNL loss = platform gain)
    const pnlAgg = await prisma.futureOrder.aggregate({
      where: { status: { in: ['WIN', 'LOSS'] } },
      _sum: { pnl_bs: true, amount_bs: true },
    })

    const totalPnlUsers = pnlAgg._sum.pnl_bs || 0
    // Platform profit = negative of user PNL (if users lose, platform wins)
    const platformProfit = -(totalPnlUsers)

    return NextResponse.json({
      orders,
      total,
      has_more: offset + limit < total,
      next_offset: offset + limit,
      stats: {
        total_orders: stats._count,
        total_volume: stats._sum.amount_bs || 0,
        total_pnl_users: totalPnlUsers,
        platform_profit: platformProfit,
        active: activeCount,
        wins: winCount,
        losses: lossCount,
      },
    })
  } catch (error) {
    console.error('Admin Futuros GET error:', error)
    return NextResponse.json({ error: 'Error al obtener órdenes de futuros' }, { status: 500 })
  }
}

// POST: Admin force-close a position
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { orderId, action, pnl = 0 } = await req.json()

    if (action === 'force-close' || action === 'admin-resolve') {
      const order = await prisma.futureOrder.findFirst({
        where: { id: orderId, status: 'ACTIVE' },
      })

      if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada o ya cerrada' }, { status: 404 })
      }

      const pnlAmount = typeof pnl === 'number' ? pnl : 0
      const isWin = pnlAmount > 0
      const payout = Math.max(0, order.amount_bs + pnlAmount)

      const closedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.futureOrder.update({
          where: { id: orderId },
          data: {
            exit_price: order.entry_price,
            status: isWin ? 'WIN' : 'LOSS',
            pnl_bs: pnlAmount,
            close_reason: 'ADMIN_RESOLVE',
          },
        })

        await tx.walletLedger.create({
          data: {
            user_id: order.user_id,
            type: 'FUTURE_PAYOUT',
            amount_bs: payout,
            description: `Cierre admin ${isWin ? 'GANANCIA' : 'PÉRDIDA'} $${pnlAmount.toFixed(2)} — ${order.pair} ${order.type}`,
          },
        })

        return updated
      })

      return NextResponse.json({ order: closedOrder, message: 'Posición cerrada por admin' })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Admin Futuros POST error:', error)
    return NextResponse.json({ error: 'Error al procesar acción' }, { status: 500 })
  }
}
