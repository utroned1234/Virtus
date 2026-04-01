import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// GET: obtener estado KYC del usuario
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        kyc_status: true,
        kyc_selfie_url: true,
        kyc_front_url: true,
        kyc_back_url: true,
        kyc_rejection_reason: true,
        kyc_submitted_at: true,
        kyc_reviewed_at: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener KYC' }, { status: 500 })
  }
}

// POST: usuario envía documentos KYC
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { kyc_selfie_url, kyc_front_url, kyc_back_url } = await req.json()

    if (!kyc_selfie_url || !kyc_front_url || !kyc_back_url) {
      return NextResponse.json(
        { error: 'Debes subir las 3 fotos: selfie con carnet, frente y reverso del carnet' },
        { status: 400 }
      )
    }

    // Solo puede enviar si no está APPROVED o PENDING
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { kyc_status: true },
    })

    if (user?.kyc_status === 'APPROVED') {
      return NextResponse.json({ error: 'Tu identidad ya está verificada' }, { status: 400 })
    }

    if (user?.kyc_status === 'PENDING') {
      return NextResponse.json({ error: 'Ya tienes una verificación en revisión' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: {
        kyc_status: 'PENDING',
        kyc_selfie_url,
        kyc_front_url,
        kyc_back_url,
        kyc_rejection_reason: null,
        kyc_submitted_at: new Date(),
        kyc_reviewed_at: null,
      } as any,
    })

    return NextResponse.json({ message: 'Documentos enviados. Revisaremos tu verificación pronto.' })
  } catch (error) {
    console.error('KYC submit error:', error)
    return NextResponse.json({ error: 'Error al enviar documentos' }, { status: 500 })
  }
}
