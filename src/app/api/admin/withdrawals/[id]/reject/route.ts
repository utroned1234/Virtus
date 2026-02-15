import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
    })

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Retiro no encontrado' },
        { status: 404 }
      )
    }

    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Retiro ya procesado' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          processed_at: new Date(),
        },
      })

      // Return funds to user
      await tx.walletLedger.create({
        data: {
          user_id: withdrawal.user_id,
          type: 'WITHDRAW_REJECT',
          amount_bs: withdrawal.amount_bs,
          description: `Retiro rechazado #${withdrawal.id}`,
        },
      })
    })

    return NextResponse.json({ message: 'Retiro rechazado y fondos devueltos' })
  } catch (error) {
    console.error('Reject withdrawal error:', error)
    return NextResponse.json(
      { error: 'Error al rechazar retiro' },
      { status: 500 }
    )
  }
}
