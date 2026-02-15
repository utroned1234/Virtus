import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { reverseReferralBonuses } from '@/lib/referrals'
import { deleteReceiptByUrl } from '@/lib/receipts'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    const shouldReverse = purchase.status === 'ACTIVE'
    const isUpgrade = (purchase as any).is_upgrade === true

    await prisma.$transaction(async (tx) => {
      // Si la compra estaba activa, revertir ganancias y bonos
      if (shouldReverse && purchase.total_earned_bs > 0) {
        await tx.walletLedger.create({
          data: {
            user_id: purchase.user_id,
            type: 'ADJUSTMENT',
            amount_bs: -purchase.total_earned_bs,
            description: `Reverso de ganancias por rechazo ${purchase.id}`,
          },
        })
      }

      // Solo revertir bonos si NO fue un upgrade (los upgrades no pagan bonos)
      if (shouldReverse && !isUpgrade) {
        await reverseReferralBonuses(tx, purchase.user_id, purchase.investment_bs)
      }

      // Eliminar la compra completamente de la base de datos
      await tx.purchase.delete({
        where: { id: params.id },
      })
    })

    // Eliminar el comprobante de Supabase Storage
    if (purchase.receipt_url) {
      await deleteReceiptByUrl(purchase.receipt_url)
    }

    return NextResponse.json({ message: 'Compra rechazada y eliminada - El usuario puede solicitar nuevamente cualquier paquete' })
  } catch (error) {
    console.error('Reject purchase error:', error)
    return NextResponse.json(
      { error: 'Error al rechazar compra' },
      { status: 500 }
    )
  }
}
