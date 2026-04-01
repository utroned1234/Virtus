import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const url = new URL(req.url)
    const purchaseId = url.searchParams.get('id')

    if (!purchaseId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        user_id: authResult.user.userId,
      },
      select: {
        id: true,
        status: true,
        block_confirmations: true,
        tx_hash: true,
        activated_at: true,
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Check purchase error:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
