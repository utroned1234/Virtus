import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export async function POST(req: NextRequest) {
    const authResult = requireAuth(req)
    if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    try {
        const { orderId, closePrice, reason } = await req.json()

        // 1. Fetch order
        const order = await prisma.futureOrder.findFirst({
            where: {
                id: orderId,
                user_id: authResult.user.userId,
                status: 'ACTIVE'
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada o ya cerrada' }, { status: 404 })
        }

        // 2. Calculate PNL
        // Long (CALL): ((Close - Entry) / Entry) * Leverage * Amount
        // Short (PUT): ((Entry - Close) / Entry) * Leverage * Amount
        let pnlPercent = 0
        if (order.type === 'CALL') {
            pnlPercent = ((closePrice - order.entry_price) / order.entry_price) * order.leverage
        } else {
            pnlPercent = ((order.entry_price - closePrice) / order.entry_price) * order.leverage
        }

        const pnlBs = order.amount_bs * pnlPercent
        const totalPayout = order.amount_bs + pnlBs

        // 3. Close Order & Update Balance
        const closedOrder = await prisma.$transaction(async (tx) => {
            // Update Order
            const updated = await tx.futureOrder.update({
                where: { id: orderId },
                data: {
                    exit_price: closePrice,
                    status: pnlBs >= 0 ? 'WIN' : 'LOSS',
                    pnl_bs: pnlBs,
                    close_reason: reason || 'MANUAL'
                }
            })

            // Add Payout to Wallet (Initial Investment + PNL)
            // If PNL is negative (e.g. -50%), payout is 50% of investment.
            // If PNL is -100% (liquidation), payout is 0.
            if (totalPayout > 0) {
                await tx.walletLedger.create({
                    data: {
                        user_id: authResult.user.userId,
                        type: 'FUTURE_PAYOUT',
                        amount_bs: totalPayout,
                        description: `Cierre Futuros ${order.pair} ${order.type} (${reason || 'MANUAL'})`
                    }
                })
            }

            return updated
        })

        return NextResponse.json({ order: closedOrder })

    } catch (error) {
        console.error('Future Close POST error:', error)
        return NextResponse.json({ error: 'Error al cerrar orden' }, { status: 500 })
    }
}
