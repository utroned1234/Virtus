import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// POST: Cancel signal orders that expired while the user had the browser closed
// Called on page load — if auto_close_at has passed and the user wasn't there → LOSS
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId
    const now = new Date()

    // Find ACTIVE signal orders that expired (user wasn't there to see the WIN)
    const expiredOrders = await prisma.futureOrder.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        signal_id: { not: null },
        auto_close_at: { lte: now },
      },
    })

    if (expiredOrders.length === 0) {
      return NextResponse.json({ cancelled: 0 })
    }

    // Mark them all as LOSS — user lost the signal by closing the browser
    await prisma.futureOrder.updateMany({
      where: {
        id: { in: expiredOrders.map(o => o.id) },
      },
      data: {
        status: 'LOSS',
        close_reason: 'EXPIRED_OFFLINE',
        exit_price: 0,
      },
    })

    return NextResponse.json({ cancelled: expiredOrders.length })
  } catch (error) {
    console.error('Cancel expired orders error:', error)
    return NextResponse.json({ error: 'Error al cancelar órdenes expiradas' }, { status: 500 })
  }
}
