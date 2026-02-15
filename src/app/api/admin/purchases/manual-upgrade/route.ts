import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'
import { payInversion } from '@/lib/referrals'

// POST: Admin hace upgrade de paquete para cualquier usuario
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { user_id, new_package_id } = await req.json()

    if (!user_id || !new_package_id) {
      return NextResponse.json({ error: 'user_id y new_package_id son requeridos' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: user_id } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const newPackage = await prisma.vipPackage.findUnique({ where: { id: Number(new_package_id) } })
    if (!newPackage) {
      return NextResponse.json({ error: 'Paquete destino no encontrado' }, { status: 404 })
    }

    // Buscar paquete activo actual
    const currentPurchase = await prisma.purchase.findFirst({
      where: { user_id, status: 'ACTIVE' },
      include: { vip_package: { select: { level: true, name: true, investment_bs: true } } },
      orderBy: { vip_package: { level: 'desc' } },
    })

    if (!currentPurchase) {
      return NextResponse.json(
        { error: 'El usuario no tiene ningún paquete activo. Usa la opción de activar.' },
        { status: 400 }
      )
    }

    // No se puede hacer upgrade al mismo paquete
    if (currentPurchase.vip_package_id === newPackage.id) {
      return NextResponse.json(
        { error: `El usuario ya tiene el paquete "${newPackage.name}" activo.` },
        { status: 400 }
      )
    }

    // El paquete destino debe ser de mayor nivel
    if (newPackage.level <= currentPurchase.vip_package.level) {
      return NextResponse.json(
        { error: `Para hacer upgrade, el paquete destino debe ser de mayor nivel que "${currentPurchase.vip_package.name}" (nivel ${currentPurchase.vip_package.level}).` },
        { status: 400 }
      )
    }

    // Solo cobrar la diferencia
    const differenceAmount = newPackage.investment_bs - currentPurchase.investment_bs
    const now = new Date()

    await prisma.$transaction(async (tx) => {
      // Cancelar paquete actual con marca de upgrade
      await tx.purchase.update({
        where: { id: currentPurchase.id },
        data: { status: 'CANCELLED' as any },
      })

      // Crear nuevo paquete con upgrade
      await tx.purchase.create({
        data: {
          user_id,
          vip_package_id: newPackage.id,
          investment_bs: differenceAmount > 0 ? differenceAmount : newPackage.investment_bs,
          daily_profit_bs: newPackage.daily_profit_bs,
          status: 'ACTIVE',
          activated_at: now,
          last_profit_at: now,
          is_upgrade: true,
          upgraded_from_purchase_id: currentPurchase.id,
        } as any,
      })

      // Acreditar diferencia al wallet (como inversión)
      if (differenceAmount > 0) {
        await payInversion(tx, user_id, differenceAmount, newPackage.name)
      }
    }, { timeout: 30000 })

    return NextResponse.json({
      message: `Upgrade realizado: "${currentPurchase.vip_package.name}" → "${newPackage.name}" para @${user.username}`,
    })
  } catch (error) {
    console.error('Manual upgrade error:', error)
    return NextResponse.json({ error: 'Error al realizar upgrade' }, { status: 500 })
  }
}
