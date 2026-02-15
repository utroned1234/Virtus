import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// POST: execute a signal with a code
// Creates a FutureOrder that auto-closes 15 min after signal was published
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

    // Get user's highest-value ACTIVE purchase for capital base
    const purchase = await prisma.purchase.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
      orderBy: { vip_package: { investment_bs: 'desc' } },
      include: { vip_package: { select: { investment_bs: true } } },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'No tienes un paquete activo para operar' }, { status: 400 })
    }

    // Use current_capital if set, otherwise fall back to vip_package.investment_bs
    const capitalBefore = (purchase as any).current_capital > 0
      ? (purchase as any).current_capital
      : purchase.vip_package.investment_bs

    // Get user's current rank
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { current_rank: true },
    })
    const userRank = (user as any)?.current_rank ?? 0

    // Calculate gains: 1% of capital
    const gainTotal = capitalBefore * 0.01
    const capitalAdded = gainTotal * 0.4
    const distributed = gainTotal * 0.6   // 60% pool → se distribuye entre ascendentes con rango
    const senalProfit = 0                 // El usuario que ejecuta NO recibe nada del 60%
    const globalBonus = distributed       // Se guarda el pool completo para distribuir en auto-close
    const newCapital = capitalBefore + capitalAdded

    // Investment amount = 1% of capital
    const investmentAmount = gainTotal

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
          senal_profit: senalProfit,
          global_bonus: globalBonus,
          user_rank: userRank,
        },
      })

      // Create FutureOrder (signal-based, no wallet deduction)
      await tx.futureOrder.create({
        data: {
          user_id: userId,
          type: signal.direction || 'CALL',
          pair: signal.pair,
          amount_bs: investmentAmount,
          leverage: 1,
          entry_price: capitalBefore,
          status: 'ACTIVE',
          pnl_bs: gainTotal,
          signal_id: signal.id,
          auto_close_at: autoCloseAt,
        },
      })

      // Update purchase current_capital immediately
      await (tx as any).purchase.update({
        where: { id: purchase.id },
        data: { current_capital: newCapital },
      })
    })

    return NextResponse.json({
      success: true,
      capital_before: capitalBefore,
      capital_after: newCapital,
      gain_total: gainTotal,
      capital_added: capitalAdded,
      senal_profit: senalProfit,
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
