import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// POST: aprobar o rechazar KYC de un usuario
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { action, rejection_reason } = await req.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    if (action === 'reject' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: 'Debes indicar el motivo del rechazo' }, { status: 400 })
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: params.id },
      select: { kyc_status: true, full_name: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (user.kyc_status !== 'PENDING') {
      return NextResponse.json({ error: 'Este KYC no está pendiente de revisión' }, { status: 400 })
    }

    await (prisma as any).user.update({
      where: { id: params.id },
      data: {
        kyc_status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        kyc_rejection_reason: action === 'reject' ? rejection_reason.trim() : null,
        kyc_reviewed_at: new Date(),
      },
    })

    return NextResponse.json({
      message: action === 'approve'
        ? `KYC de ${user.full_name} aprobado`
        : `KYC de ${user.full_name} rechazado`,
    })
  } catch (error) {
    console.error('Admin KYC action error:', error)
    return NextResponse.json({ error: 'Error al procesar KYC' }, { status: 500 })
  }
}
