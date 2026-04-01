import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params

    // Obtener usuario con toda la información necesaria
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        user_code: true,
        sponsor_id: true,
        created_at: true,
        sponsor: {
          select: {
            full_name: true,
            username: true,
          },
        },
        purchases: {
          select: {
            id: true,
            status: true,
            investment_bs: true,
            daily_profit_bs: true,
            activated_at: true,
            created_at: true,
            vip_package: {
              select: {
                name: true,
                daily_profit_bs: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Calcular balance del usuario
    const walletResult = await prisma.walletLedger.aggregate({
      where: { user_id: id },
      _sum: {
        amount_bs: true,
      },
    })

    const balance = walletResult._sum.amount_bs || 0

    // Determinar estado general del usuario
    const hasActivePurchases = user.purchases.some(p => p.status === 'ACTIVE')
    const hasPendingPurchases = user.purchases.some(p => p.status === 'PENDING')

    let status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
    if (hasActivePurchases) {
      status = 'ACTIVO'
    } else if (hasPendingPurchases) {
      status = 'PENDIENTE'
    } else {
      status = 'INACTIVO'
    }

    // Formatear respuesta
    const userDetail = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      user_code: user.user_code,
      status,
      balance,
      created_at: user.created_at,
      sponsor: user.sponsor ? {
        full_name: user.sponsor.full_name,
        username: user.sponsor.username,
      } : null,
      purchases: user.purchases.map(p => ({
        id: p.id,
        vip_package_name: p.vip_package.name,
        investment_bs: p.investment_bs,
        daily_profit_bs: p.vip_package.daily_profit_bs, // Usar ganancia actual del paquete VIP
        status: p.status,
        activated_at: p.activated_at,
        created_at: p.created_at,
      })),
    }

    return NextResponse.json(userDetail)
  } catch (error) {
    console.error('Error fetching user detail:', error)
    return NextResponse.json(
      { error: 'Error al cargar el detalle del usuario' },
      { status: 500 }
    )
  }
}
