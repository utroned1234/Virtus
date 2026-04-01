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
    const body = await req.json().catch(() => ({}))
    const { receipt_url } = body

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

    // Solo marcar como pagado (el saldo ya fue descontado al solicitar)
    await prisma.withdrawal.update({
      where: { id: params.id },
      data: {
        status: 'PAID',
        processed_at: new Date(),
        receipt_url: receipt_url || null,
      },
    })

    return NextResponse.json({ message: 'Retiro marcado como pagado' })
  } catch (error) {
    console.error('Pay withdrawal error:', error)
    return NextResponse.json(
      { error: 'Error al procesar retiro' },
      { status: 500 }
    )
  }
}
