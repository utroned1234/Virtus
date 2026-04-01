import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const packages = await prisma.vipPackage.findMany({
      orderBy: { level: 'asc' },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Get VIP packages error:', error)
    return NextResponse.json(
      { error: 'Error al cargar paquetes' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id, investment_bs, daily_profit_bs, is_enabled, qr_image_url } = await req.json()

    if (!id && qr_image_url !== undefined) {
      await prisma.vipPackage.updateMany({
        data: { qr_image_url },
      })
      return NextResponse.json({ message: 'QR actualizado para todos los paquetes' })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const packageId = parseInt(id)

    // Actualizar el paquete VIP
    const updated = await prisma.vipPackage.update({
      where: { id: packageId },
      data: {
        investment_bs: investment_bs !== undefined ? parseFloat(investment_bs) : undefined,
        daily_profit_bs: daily_profit_bs !== undefined ? parseFloat(daily_profit_bs) : undefined,
        is_enabled: is_enabled !== undefined ? is_enabled : undefined,
        qr_image_url: qr_image_url !== undefined ? qr_image_url : undefined,
      },
    })

    // Si se cambió la ganancia diaria, actualizar TODAS las compras activas de este paquete
    if (daily_profit_bs !== undefined) {
      const newDailyProfit = parseFloat(daily_profit_bs)
      const updateResult = await prisma.purchase.updateMany({
        where: {
          vip_package_id: packageId,
          status: 'ACTIVE',
        },
        data: {
          daily_profit_bs: newDailyProfit,
        },
      })
      console.log(`[VIP-PACKAGES] Actualizadas ${updateResult.count} compras activas del paquete ${packageId} con nueva ganancia: ${newDailyProfit}`)
    }

    // Si se cambió la inversión, actualizar las compras activas también
    if (investment_bs !== undefined) {
      const newInvestment = parseFloat(investment_bs)
      await prisma.purchase.updateMany({
        where: {
          vip_package_id: packageId,
          status: 'ACTIVE',
        },
        data: {
          investment_bs: newInvestment,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update VIP package error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar paquete' },
      { status: 500 }
    )
  }
}
