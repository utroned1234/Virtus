import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { RANK_CONFIG } from '@/lib/ranks'

// POST: Called by Vercel Cron every minute
// Closes ALL expired signal orders for ALL users — works even if browser is closed
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find ALL active signal-based orders that have expired, across all users
    const expiredOrders = await prisma.futureOrder.findMany({
      where: {
        status: 'ACTIVE',
        signal_id: { not: null },
        auto_close_at: { lte: now },
      },
    })

    if (expiredOrders.length === 0) {
      return NextResponse.json({ closed: 0 })
    }

    let closedCount = 0

    for (const order of expiredOrders) {
      try {
        // Get signal execution for this order
        const execution = await (prisma as any).signalExecution.findFirst({
          where: {
            signal_id: order.signal_id,
            user_id: order.user_id,
          },
        })

        if (!execution) continue

        // Walk up the sponsor tree to find ranked ancestors
        const ancestors: Array<{ id: string; rank: number; rankPct: number }> = []

        const executingUser = await prisma.user.findUnique({
          where: { id: order.user_id },
          select: { sponsor_id: true },
        })

        let nextSponsorId: string | null = (executingUser as any)?.sponsor_id ?? null
        let level = 0

        while (nextSponsorId && level < 20) {
          const ancestor = await (prisma as any).user.findUnique({
            where: { id: nextSponsorId },
            select: { id: true, sponsor_id: true, current_rank: true },
          })
          if (!ancestor) break

          const rank = ancestor.current_rank ?? 0
          if (rank > 0 && RANK_CONFIG[rank]) {
            ancestors.push({
              id: ancestor.id,
              rank,
              rankPct: RANK_CONFIG[rank].globalBonusPct / 100,
            })
          }

          nextSponsorId = ancestor.sponsor_id
          level++
        }

        await prisma.$transaction(async (tx) => {
          // Close the order as WIN
          await tx.futureOrder.update({
            where: { id: order.id },
            data: {
              status: 'WIN',
              exit_price: execution.capital_before + execution.capital_added,
              close_reason: 'SIGNAL_COMPLETE',
            },
          })

          // Distribute GLOBAL_BONUS to ranked ancestors
          for (const ancestor of ancestors) {
            const bonusAmount = execution.global_bonus * ancestor.rankPct
            if (bonusAmount > 0) {
              await tx.walletLedger.create({
                data: {
                  user_id: ancestor.id,
                  type: 'GLOBAL_BONUS' as any,
                  amount_bs: bonusAmount,
                  description: `Bono global ${ancestor.rank}R – señal de equipo`,
                },
              })
            }
          }
        })

        closedCount++
      } catch (err) {
        console.error(`[cron] Error closing order ${order.id}:`, err)
      }
    }

    console.log(`[cron/auto-close] Closed ${closedCount} of ${expiredOrders.length} expired signal orders`)
    return NextResponse.json({ closed: closedCount, total: expiredOrders.length })
  } catch (error) {
    console.error('[cron/auto-close] Fatal error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
