import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        user_code: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    const userIds = users.map((u) => u.id)

    // Get balances for all users in one query using groupBy
    const balances = await prisma.walletLedger.groupBy({
      by: ['user_id'],
      where: { user_id: { in: userIds } },
      _sum: { amount_bs: true },
    })

    // Get active purchases for all users in one query
    const activePurchases = await prisma.purchase.findMany({
      where: {
        user_id: { in: userIds },
        status: 'ACTIVE',
      },
      select: {
        user_id: true,
        vip_package: {
          select: { name: true },
        },
      },
    })

    // Create maps for quick lookup
    const balanceMap = new Map(
      balances.map((b) => [b.user_id, b._sum.amount_bs || 0])
    )

    const activePurchaseMap = new Map(
      activePurchases.map((p) => [p.user_id, p.vip_package.name])
    )

    // Combine data
    const usersWithBalance = users.map((user) => ({
      ...user,
      balance: balanceMap.get(user.id) || 0,
      active_vip: activePurchaseMap.get(user.id) || null,
    }))

    return NextResponse.json(usersWithBalance)
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: 'Error al cargar usuarios' },
      { status: 500 }
    )
  }
}
