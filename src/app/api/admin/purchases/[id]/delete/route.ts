import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { reverseReferralBonuses } from '@/lib/referrals'
import { deleteReceiptByUrl } from '@/lib/receipts'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const purchaseId = params.id
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    const shouldReverse = purchase.status === 'ACTIVE'

    await prisma.$transaction(async (tx) => {
      if (shouldReverse && purchase.total_earned_bs > 0) {
        await tx.walletLedger.create({
          data: {
            user_id: purchase.user_id,
            type: 'ADJUSTMENT',
            amount_bs: -purchase.total_earned_bs,
            description: `Reverso de ganancias por eliminacion ${purchase.id}`,
          },
        })
      }

      if (shouldReverse) {
        await reverseReferralBonuses(tx, purchase.user_id, purchase.investment_bs)
      }

      await tx.purchase.delete({
        where: { id: purchaseId },
      })
    })

    if (purchase.receipt_url) {
      await deleteReceiptByUrl(purchase.receipt_url)
    }

    return NextResponse.json({ message: 'Compra eliminada' })
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar compra' },
      { status: 500 }
    )
  }
}
