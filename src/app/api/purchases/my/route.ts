import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const purchases = await prisma.purchase.findMany({
      where: { user_id: authResult.user.userId },
      include: {
        vip_package: {
          select: {
            name: true,
            level: true,
            daily_profit_bs: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // Construir mapa de upgrades: qué paquete nuevo reemplazó a cuál
    const upgradeMap: Record<string, string> = {}
    for (const p of purchases) {
      if ((p as any).is_upgrade && (p as any).upgraded_from_purchase_id) {
        upgradeMap[(p as any).upgraded_from_purchase_id] = p.vip_package.name
      }
    }

    const result = purchases.map(p => ({
      id: p.id,
      vip_package: p.vip_package,
      investment_bs: p.investment_bs,
      status: p.status,
      created_at: p.created_at,
      activated_at: p.activated_at,
      is_upgrade: (p as any).is_upgrade ?? false,
      upgraded_from_purchase_id: (p as any).upgraded_from_purchase_id ?? null,
      upgraded_to_package: upgradeMap[p.id] ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('My purchases error:', error)
    return NextResponse.json(
      { error: 'Error al cargar compras' },
      { status: 500 }
    )
  }
}
