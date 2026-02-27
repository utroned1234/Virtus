import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { payReferralBonusesWithClient, payBonoRetorno, payInversion, wipeAccumulatedBonuses, payActivationBonus } from '@/lib/referrals'

// POST: Admin activa un paquete manualmente para cualquier usuario
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { user_id, package_id } = await req.json()

    if (!user_id || !package_id) {
      return NextResponse.json({ error: 'user_id y package_id son requeridos' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: user_id } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const vipPackage = await prisma.vipPackage.findUnique({ where: { id: Number(package_id) } })
    if (!vipPackage) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    // Detectar paquete activo actual
    const currentActivePurchase = await prisma.purchase.findFirst({
      where: { user_id, status: 'ACTIVE' },
      include: { vip_package: { select: { level: true, name: true } } },
      orderBy: { vip_package: { level: 'desc' } },
    })

    // Bloquear mismo paquete
    if (currentActivePurchase?.vip_package_id === vipPackage.id) {
      return NextResponse.json(
        { error: `El usuario ya tiene el paquete "${vipPackage.name}" activo.` },
        { status: 400 }
      )
    }

    // Bloquear paquete menor o igual al activo actual
    if (currentActivePurchase && vipPackage.level <= currentActivePurchase.vip_package.level) {
      return NextResponse.json(
        { error: `No puedes activar un paquete menor o igual al actual "${currentActivePurchase.vip_package.name}". Usa la opción de upgrade.` },
        { status: 400 }
      )
    }

    const isUpgrade = !!currentActivePurchase

    const now = new Date()

    await prisma.$transaction(async (tx) => {
      // Cancelar cualquier paquete activo previo
      await tx.purchase.updateMany({
        where: { user_id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' as any },
      })

      // Crear y activar el nuevo paquete directamente
      const purchase = await tx.purchase.create({
        data: {
          user_id,
          vip_package_id: vipPackage.id,
          investment_bs: vipPackage.investment_bs,
          daily_profit_bs: vipPackage.daily_profit_bs,
          status: 'ACTIVE',
          activated_at: now,
          last_profit_at: now,
          is_upgrade: isUpgrade,
          upgraded_from_purchase_id: isUpgrade ? currentActivePurchase!.id : null,
        } as any,
      })

      // Wipe solo en activación nueva ($50 o $150), NUNCA en upgrade
      if (!isUpgrade && !vipPackage.participates_in_bono_retorno) {
        await wipeAccumulatedBonuses(tx, user_id)
      }

      // Acreditar inversión al wallet del usuario
      await payInversion(tx, user_id, vipPackage.investment_bs, vipPackage.name)

      // UPGRADE: no se pagan bonos de ningún tipo
      if (!isUpgrade) {
        if (vipPackage.participates_in_referral_bonus) {
          await payReferralBonusesWithClient(tx, user_id, vipPackage.investment_bs)
        }
        if (vipPackage.participates_in_bono_retorno) {
          await payBonoRetorno(tx, user_id, vipPackage.investment_bs, vipPackage.name)
        }
        // Bono activación directa: 0.5% del balance del patrocinador (paquetes >= $300)
        if (vipPackage.investment_bs >= 300) {
          await payActivationBonus(tx, user_id, vipPackage.investment_bs)
        }
      }

      return purchase
    }, { timeout: 30000 })

    return NextResponse.json({ message: `Paquete "${vipPackage.name}" activado para ${user.username}` })
  } catch (error) {
    console.error('Manual activate error:', error)
    return NextResponse.json({ error: 'Error al activar paquete' }, { status: 500 })
  }
}
