import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
    const authResult = requireAuth(req)
    if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    try {
        const userId = authResult.user.userId

        const [ledgerSum, activePurchase] = await Promise.all([
            prisma.walletLedger.aggregate({
                where: { user_id: userId },
                _sum: { amount_bs: true },
            }),
            prisma.purchase.findFirst({
                where: { user_id: userId, status: 'ACTIVE' },
                orderBy: { vip_package: { investment_bs: 'desc' } },
                select: {
                    current_capital: true,
                    vip_package: { select: { investment_bs: true } },
                },
            }),
        ])

        const balance = ledgerSum._sum.amount_bs || 0
        const rawCapital = (activePurchase as any)?.current_capital ?? 0
        const baseCapital = activePurchase?.vip_package?.investment_bs ?? 0
        const current_capital = rawCapital > 0 ? rawCapital : baseCapital

        return NextResponse.json({ balance, current_capital })
    } catch (error) {
        console.error('Error fetching balance:', error)
        return NextResponse.json(
            { error: 'Error al obtener balance' },
            { status: 500 }
        )
    }
}
