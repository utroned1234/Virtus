import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// GET: Fetch orders (active or history)
export async function GET(req: NextRequest) {
    const authResult = requireAuth(req)
    if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    try {
        const { searchParams } = new URL(req.url)
        const statusParam = searchParams.get('status') || 'ACTIVE'

        const whereClause: any = {
            user_id: authResult.user.userId,
        }

        if (statusParam === 'ACTIVE') {
            whereClause.status = 'ACTIVE'
        } else if (statusParam === 'CLOSED') {
            whereClause.status = { in: ['WIN', 'LOSS'] }
        }

        const orders = await prisma.futureOrder.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
            take: 50 // Limit history to last 50 orders
        })

        return NextResponse.json({ orders })
    } catch (error) {
        console.error('Future Orders GET error:', error)
        return NextResponse.json({ error: 'Error al obtener órdenes' }, { status: 500 })
    }
}

// POST: Place new order
export async function POST(req: NextRequest) {
    const authResult = requireAuth(req)
    if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    try {
        const { type, pair, amount, leverage, entryPrice, tp, sl } = await req.json()

        // Validate inputs
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
        }

        // Check balance
        const ledgerSum = await prisma.walletLedger.aggregate({
            where: { user_id: authResult.user.userId },
            _sum: { amount_bs: true },
        })
        const balance = ledgerSum._sum.amount_bs || 0

        if (balance < amount) {
            return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
        }

        // Transaction: Deduct balance & create order
        const order = await prisma.$transaction(async (tx) => {
            // 1. Deduct balance
            await tx.walletLedger.create({
                data: {
                    user_id: authResult.user.userId,
                    type: 'FUTURE_ENTRY',
                    amount_bs: -amount,
                    description: `Entrada Futuros ${pair} ${type} x${leverage}`
                }
            })

            // 2. Create Order
            const newOrder = await tx.futureOrder.create({
                data: {
                    user_id: authResult.user.userId,
                    type,
                    pair,
                    amount_bs: amount,
                    leverage,
                    entry_price: entryPrice,
                    status: 'ACTIVE',
                    pnl_bs: 0
                }
            })

            return newOrder
        })

        return NextResponse.json({ order })

    } catch (error) {
        console.error('Future Order POST error:', error)
        return NextResponse.json({ error: 'Error al crear orden' }, { status: 500 })
    }
}
