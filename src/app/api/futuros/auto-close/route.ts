import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'
import { RANK_CONFIG } from '@/lib/ranks'

// POST: Auto-close expired signal-based orders
// Called periodically by the frontend to close orders whose auto_close_at has passed
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId
    const now = new Date()

    // Find ACTIVE signal-based orders that have expired for this user
    const expiredOrders = await prisma.futureOrder.findMany({
      where: {
        user_id: userId,
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
        // Get the signal execution for this order
        const execution = await (prisma as any).signalExecution.findFirst({
          where: {
            signal_id: order.signal_id,
            user_id: userId,
          },
        })

        if (!execution) continue

        // Recorrer ascendentes del usuario que ejecutó la señal
        // global_bonus almacena el pool del 60% (distributed)
        const ancestors: Array<{ id: string; rank: number; rankPct: number }> = []
        let nextSponsorId: string | null = null

        const executingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { sponsor_id: true },
        })
        nextSponsorId = (executingUser as any)?.sponsor_id ?? null

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
          // Prevent double-close: only update if still ACTIVE
          const updated = await tx.futureOrder.updateMany({
            where: { id: order.id, status: 'ACTIVE' },
            data: {
              status: 'WIN',
              exit_price: execution.capital_before + execution.capital_added,
              close_reason: 'SIGNAL_COMPLETE',
            },
          })

          // If already closed by another process, skip wallet credits
          if (updated.count === 0) return

          // Credit 40% gain to user's wallet
          await tx.walletLedger.create({
            data: {
              user_id: userId,
              type: 'SENAL_PROFIT',
              amount_bs: execution.capital_added,
              description: `Ganancia señal (40% de ${execution.gain_total.toFixed(2)})`,
            },
          })

          // Distribuir GLOBAL_BONUS a cada ascendente con rango
          for (const ancestor of ancestors) {
            const bonusAmount = Math.round(execution.global_bonus * ancestor.rankPct * 100) / 100
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
        console.error(`Error closing signal order ${order.id}:`, err)
      }
    }

    return NextResponse.json({ closed: closedCount })
  } catch (error) {
    console.error('Auto-close error:', error)
    return NextResponse.json({ error: 'Error al cerrar operaciones' }, { status: 500 })
  }
}
