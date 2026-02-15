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

    const purchases = await prisma.purchase.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
          },
        },
        vip_package: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    })

    const totalInvestmentResult = await prisma.purchase.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { investment_bs: true },
    })
    const totalInvestment = totalInvestmentResult._sum.investment_bs || 0
    const totalCount = await prisma.purchase.count()

    return NextResponse.json({
      purchases,
      total_investment_bs: totalInvestment,
      total_count: totalCount,
      has_more: offset + purchases.length < totalCount,
      next_offset: offset + purchases.length,
    })
  } catch (error) {
    console.error('Admin purchases error:', error)
    return NextResponse.json(
      { error: 'Error al cargar compras' },
      { status: 500 }
    )
  }
}
