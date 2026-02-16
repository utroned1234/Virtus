import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { payReferralBonusesWithClient, payBonoRetorno, payInversion, wipeAccumulatedBonuses } from '@/lib/referrals'

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

    if (purchase.status === 'ACTIVE') {
      return NextResponse.json({ message: 'Compra ya activa' })
    }

    if (purchase.status !== 'PENDING' && purchase.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'Estado invalido para aprobacion' },
        { status: 400 }
      )
    }

    const now = new Date()

    const vipPackage = await prisma.vipPackage.findUnique({
      where: { id: purchase.vip_package_id },
    })

    const isUpgrade = (purchase as any).is_upgrade === true
    const upgradedFromId = (purchase as any).upgraded_from_purchase_id as string | null

    await prisma.$transaction(async (tx) => {
      // Cancel old active purchase if this is an upgrade
      if (isUpgrade && upgradedFromId) {
        await tx.purchase.update({
          where: { id: upgradedFromId },
          data: { status: 'CANCELLED' as any },
        })
      }

      await tx.purchase.update({
        where: { id: params.id },
        data: {
          status: 'ACTIVE',
          activated_at: now,
          last_profit_at: now,
        },
      })

      // Wipe solo en activación nueva ($50 o $150), NUNCA en upgrade
      if (!isUpgrade && vipPackage && !vipPackage.participates_in_bono_retorno) {
        await wipeAccumulatedBonuses(tx, purchase.user_id)
      }

      // Acreditar inversión (monto pagado, diferencia si es upgrade)
      if (vipPackage) {
        await payInversion(tx, purchase.user_id, purchase.investment_bs, vipPackage.name)
      }

      // UPGRADE: no se pagan bonos de ningún tipo
      if (!isUpgrade && vipPackage) {
        if (vipPackage.participates_in_referral_bonus) {
          await payReferralBonusesWithClient(tx, purchase.user_id, vipPackage.investment_bs)
        }
        if (vipPackage.participates_in_bono_retorno) {
          await payBonoRetorno(tx, purchase.user_id, vipPackage.investment_bs, vipPackage.name)
        }
      }
    })

    return NextResponse.json({ message: 'Compra activada y bonos pagados' })
  } catch (error) {
    console.error('Approve purchase error:', error)
    return NextResponse.json(
      { error: 'Error al aprobar compra' },
      { status: 500 }
    )
  }
}
