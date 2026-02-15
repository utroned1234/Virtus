import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { user_id, amount_bs, description } = await req.json()

    if (!user_id || !amount_bs) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const amountNum = parseFloat(amount_bs)

    if (isNaN(amountNum)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    // Create ledger entry
    await prisma.walletLedger.create({
      data: {
        user_id,
        type: 'ADJUSTMENT',
        amount_bs: amountNum,
        description: description || `Ajuste manual por admin: ${amountNum > 0 ? '+' : ''}$${amountNum}`,
      },
    })

    return NextResponse.json({
      message: 'Ajuste realizado exitosamente',
      amount: amountNum,
    })
  } catch (error) {
    console.error('Adjust balance error:', error)
    return NextResponse.json(
      { error: 'Error al ajustar saldo' },
      { status: 500 }
    )
  }
}
