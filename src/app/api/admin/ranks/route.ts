import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { RANK_CONFIG, getEligibleRank } from '@/lib/ranks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''

    // Get users that have purchases, referrals, or a rank
    const users = await prisma.user.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { username: { contains: search, mode: 'insensitive' } },
                  { full_name: { contains: search, mode: 'insensitive' } },
                  { user_code: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          {
            OR: [
              { purchases: { some: { status: 'ACTIVE' } } },
              { referrals: { some: {} } },
              { current_rank: { gt: 0 } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        user_code: true,
        current_rank: true,
      },
      orderBy: [{ current_rank: 'desc' }, { username: 'asc' }],
      take: 100,
    })

    // For each user, calculate eligible rank and stats
    const results = await Promise.all(
      users.map(async (user) => {
        const currentRank = (user as any).current_rank ?? 0
        try {
          const { eligibleRank, stats } = await getEligibleRank(user.id, prisma)
          return {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            user_code: user.user_code,
            current_rank: currentRank,
            current_rank_title: currentRank > 0 ? RANK_CONFIG[currentRank]?.title : null,
            eligible_rank: eligibleRank,
            eligible_rank_title: eligibleRank > 0 ? RANK_CONFIG[eligibleRank]?.title : null,
            stats,
          }
        } catch {
          return {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            user_code: user.user_code,
            current_rank: currentRank,
            current_rank_title: currentRank > 0 ? RANK_CONFIG[currentRank]?.title : null,
            eligible_rank: 0,
            eligible_rank_title: null,
            stats: { frontals_activos: 0, total_org: 0, has_min_package: {}, own_package: 0 },
          }
        }
      })
    )

    // Summary count by rank
    const rankCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    results.forEach(u => {
      rankCounts[u.current_rank] = (rankCounts[u.current_rank] ?? 0) + 1
    })

    return NextResponse.json({ users: results, rank_counts: rankCounts })
  } catch (error) {
    console.error('Admin ranks error:', error)
    return NextResponse.json({ error: 'Error al obtener rangos' }, { status: 500 })
  }
}
