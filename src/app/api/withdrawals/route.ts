import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Calculate balance
    const ledgerSum = await prisma.walletLedger.aggregate({
      where: { user_id: authResult.user.userId },
      _sum: { amount_bs: true },
    })

    const balance = ledgerSum._sum.amount_bs || 0

    // Total invertido (para mostrar progreso de duplicar)
    const inversionEntries = await prisma.walletLedger.findMany({
      where: { user_id: authResult.user.userId, type: 'INVERSION' as any },
      select: { amount_bs: true },
    })
    const totalInversion = inversionEntries.reduce((sum, e) => sum + e.amount_bs, 0)

    // Get withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      where: { user_id: authResult.user.userId },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ balance, withdrawals, totalInversion })
  } catch (error) {
    console.error('Withdrawals GET error:', error)
    return NextResponse.json(
      { error: 'Error al cargar retiros' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { amount_bs, bank_name, qr_image_url, payout_method, phone_number } = await req.json()

    // Validar montos exactos permitidos
    const allowedAmounts = [5, 20, 50, 100, 500, 1000]
    if (!amount_bs || !allowedAmounts.includes(amount_bs)) {
      return NextResponse.json(
        { error: 'Solo se permiten retiros de $5, $20, $50, $100, $500 o $1,000' },
        { status: 400 }
      )
    }

    if (!payout_method || !qr_image_url) {
      return NextResponse.json(
        { error: 'Debes ingresar tu ID de Binance y subir tu QR' },
        { status: 400 }
      )
    }

    // Check balance
    const ledgerSum = await prisma.walletLedger.aggregate({
      where: { user_id: authResult.user.userId },
      _sum: { amount_bs: true },
    })

    const balance = ledgerSum._sum.amount_bs || 0

    if (amount_bs > balance) {
      return NextResponse.json(
        { error: 'Saldo insuficiente' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tenga al menos un VIP activo
    const activeVipCount = await prisma.purchase.count({
      where: {
        user_id: authResult.user.userId,
        status: 'ACTIVE',
      },
    })

    if (activeVipCount === 0) {
      return NextResponse.json(
        { error: 'Debes tener al menos un plan VIRTUS activo para solicitar retiros' },
        { status: 403 }
      )
    }

    // Verificar que haya duplicado su inversión (solo aplica si tiene crédito INVERSION)
    const inversionEntries = await prisma.walletLedger.findMany({
      where: { user_id: authResult.user.userId, type: 'INVERSION' as any },
      select: { amount_bs: true },
    })
    const totalInversion = inversionEntries.reduce((sum, e) => sum + e.amount_bs, 0)

    if (totalInversion > 0) {
      const targetBalance = totalInversion * 2
      if (balance < targetBalance) {
        const needed = (targetBalance - balance).toFixed(2)
        return NextResponse.json(
          { error: `Debes duplicar tu inversión antes de retirar. Necesitas $${needed} USD más en tu billetera para llegar a $${targetBalance.toFixed(2)} USD.` },
          { status: 403 }
        )
      }
    }

    // Create withdrawal y descontar saldo inmediatamente
    const withdrawal = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.create({
        data: {
          user_id: authResult.user.userId,
          amount_bs,
          bank_name,
          qr_image_url,
          payout_method,
          phone_number,
          status: 'PENDING',
        },
      })

      // Descontar saldo al solicitar
      await tx.walletLedger.create({
        data: {
          user_id: authResult.user.userId,
          type: 'WITHDRAW_REQUEST',
          amount_bs: -amount_bs,
          description: `Solicitud de retiro #${w.id}`,
        },
      })

      return w
    })

    return NextResponse.json({ message: 'Retiro solicitado', withdrawal })
  } catch (error) {
    console.error('Withdrawal POST error:', error)
    return NextResponse.json(
      { error: 'Error al solicitar retiro' },
      { status: 500 }
    )
  }
}
