import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { RANK_CONFIG, recalculateUserRank } from '@/lib/ranks'

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId

    // Auto-recalculate rank on every load (only upgrades, never auto-downgrades)
    await recalculateUserRank(userId, prisma)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { current_rank: true },
    })

    const currentRank = (user as any)?.current_rank ?? 0
    const currentConfig = currentRank > 0 ? RANK_CONFIG[currentRank] : null

    return NextResponse.json({
      current_rank: currentRank,
      rank_title: currentConfig?.title ?? null,
      global_bonus_pct: currentConfig?.globalBonusPct ?? 0,
    })
  } catch (error) {
    console.error('User rank error:', error)
    return NextResponse.json({ error: 'Error al obtener rango' }, { status: 500 })
  }
}
