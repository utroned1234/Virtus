import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// POST: execute a signal with a code
// Capital = wallet balance (sum of WalletLedger)
// Invests 1% of wallet balance, auto-closes 15 min after signal was published
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId
    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Find active signal matching the code
    const signal = await (prisma as any).signal.findFirst({
      where: { code: cleanCode, status: 'ACTIVE' },
    })

    if (!signal) {
      return NextResponse.json({ error: 'Código inválido o señal no activa' }, { status: 400 })
    }

    // Señal válida para unirse: solo 5 minutos desde publicación
    const signalCreatedAt = new Date(signal.created_at)
    const expiresAt = new Date(signalCreatedAt.getTime() + 5 * 60 * 1000)   // +5 min para unirse
    const autoCloseAt = new Date(signalCreatedAt.getTime() + 15 * 60 * 1000) // +15 min para cerrar órdenes
    if (new Date() >= expiresAt) {
      return NextResponse.json({ error: 'Esta señal ha expirado (más de 5 minutos)' }, { status: 400 })
    }

    // Check if user already executed this signal
    const existingExecution = await (prisma as any).signalExecution.findUnique({
      where: { signal_id_user_id: { signal_id: signal.id, user_id: userId } },
    })

    if (existingExecution) {
      return NextResponse.json({ error: 'Ya ejecutaste esta señal' }, { status: 409 })
    }

    // Capital = wallet balance (billetera)
    const walletSum = await prisma.walletLedger.aggregate({
      where: { user_id: userId },
      _sum: { amount_bs: true },
    })

    const capitalBefore = walletSum._sum.amount_bs || 0

    if (capitalBefore <= 0) {
      return NextResponse.json({ error: 'No tienes saldo en billetera para operar' }, { status: 400 })
    }

    // Get user's ACTIVE purchase (needed for signalExecution record)
    const purchase = await prisma.purchase.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
      orderBy: { vip_package: { investment_bs: 'desc' } },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'No tienes un paquete activo para operar' }, { status: 400 })
    }

    // Get user's current rank
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { current_rank: true },
    })
    const userRank = (user as any)?.current_rank ?? 0

    // Calculate gains: 1% of wallet balance (rounded to 2 decimals)
    const round2 = (n: number) => Math.round(n * 100) / 100
    const gainTotal = round2(capitalBefore * 0.01)
    const capitalAdded = round2(gainTotal * 0.4)        // 40% → goes to user's wallet on auto-close
    const globalBonus = round2(gainTotal * 0.6)          // 60% → global bonus pool for ranked ancestors
    const newCapital = round2(capitalBefore + capitalAdded)  // se acredita al cerrar, no ahora

    await prisma.$transaction(async (tx) => {
      // Record execution (for tracking, profits credited on auto-close)
      await (tx as any).signalExecution.create({
        data: {
          signal_id: signal.id,
          user_id: userId,
          purchase_id: purchase.id,
          capital_before: capitalBefore,
          gain_total: gainTotal,
          capital_added: capitalAdded,
          senal_profit: 0,
          global_bonus: globalBonus,
          user_rank: userRank,
        },
      })

      // Create FutureOrder (signal-based)
      await tx.futureOrder.create({
        data: {
          user_id: userId,
          type: signal.direction || 'CALL',
          pair: signal.pair,
          amount_bs: gainTotal,
          leverage: 1,
          entry_price: gainTotal,
          status: 'ACTIVE',
          pnl_bs: gainTotal,
          signal_id: signal.id,
          auto_close_at: autoCloseAt,
        },
      })

    })

    return NextResponse.json({
      success: true,
      capital_before: capitalBefore,
      capital_after: newCapital,
      gain_total: gainTotal,
      capital_added: capitalAdded,
      senal_profit: 0,
      global_bonus: globalBonus,
      user_rank: userRank,
      auto_close_at: autoCloseAt.toISOString(),
      signal_code: signal.code,
    })
  } catch (error) {
    console.error('Execute signal error:', error)
    return NextResponse.json({ error: 'Error al ejecutar señal' }, { status: 500 })
  }
}
