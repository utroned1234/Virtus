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

        // Signal-based orders: fixed gain proportional to elapsed time
        if (order.signal_id) {
            const execution = await (prisma as any).signalExecution.findFirst({
                where: { signal_id: order.signal_id, user_id: authResult.user.userId },
            })

            if (!execution) {
                return NextResponse.json({ error: 'Ejecución de señal no encontrada' }, { status: 404 })
            }

            // Calculate proportional gain based on elapsed time (max 15 min)
            const elapsed = (Date.now() - new Date(order.created_at).getTime()) / 1000
            const totalDuration = 15 * 60 // 15 min in seconds
            const progress = Math.min(elapsed / totalDuration, 1)
            const proportionalGain = Math.round(execution.capital_added * progress * 100) / 100

            const closedOrder = await prisma.$transaction(async (tx) => {
                // Prevent double-close: only update if still ACTIVE
                const result = await tx.futureOrder.updateMany({
                    where: { id: orderId, status: 'ACTIVE' },
                    data: {
                        exit_price: order.entry_price,
                        status: 'WIN',
                        pnl_bs: proportionalGain,
                        close_reason: reason || 'MANUAL'
                    }
                })

                if (result.count === 0) return null

                // Credit proportional gain to wallet
                if (proportionalGain > 0) {
                    await tx.walletLedger.create({
                        data: {
                            user_id: authResult.user.userId,
                            type: 'SENAL_PROFIT',
                            amount_bs: proportionalGain,
                            description: `Señal cerrada manual (${Math.round(progress * 100)}% del tiempo)`
                        }
                    })
                }

                return { id: orderId, status: 'WIN', pnl_bs: proportionalGain }
            })

            if (!closedOrder) {
                return NextResponse.json({ error: 'Orden ya fue cerrada' }, { status: 409 })
            }

            return NextResponse.json({ order: closedOrder })
        }

        // 2. Calculate PNL for manual (non-signal) orders
        // Long (CALL): ((Close - Entry) / Entry) * Leverage * Amount
        // Short (PUT): ((Entry - Close) / Entry) * Leverage * Amount
        let pnlPercent = 0
        if (order.type === 'CALL') {
            pnlPercent = ((closePrice - order.entry_price) / order.entry_price) * order.leverage
        } else {
            pnlPercent = ((order.entry_price - closePrice) / order.entry_price) * order.leverage
        }

        const pnlBs = Math.round(order.amount_bs * pnlPercent * 100) / 100
        const totalPayout = Math.round((order.amount_bs + pnlBs) * 100) / 100

        // 3. Close Order & Update Balance
        const closedOrder = await prisma.$transaction(async (tx) => {
            // Prevent double-close: only update if still ACTIVE
            const result = await tx.futureOrder.updateMany({
                where: { id: orderId, status: 'ACTIVE' },
                data: {
                    exit_price: closePrice,
                    status: pnlBs >= 0 ? 'WIN' : 'LOSS',
                    pnl_bs: pnlBs,
                    close_reason: reason || 'MANUAL'
                }
            })

            if (result.count === 0) return null

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

            return { id: orderId, status: pnlBs >= 0 ? 'WIN' : 'LOSS', pnl_bs: pnlBs }
        })

        if (!closedOrder) {
            return NextResponse.json({ error: 'Orden ya fue cerrada' }, { status: 409 })
        }

        return NextResponse.json({ order: closedOrder })

    } catch (error) {
        console.error('Future Close POST error:', error)
        return NextResponse.json({ error: 'Error al cerrar orden' }, { status: 500 })
    }
}
