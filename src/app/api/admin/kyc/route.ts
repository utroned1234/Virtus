import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// GET: listar todos los usuarios con KYC pendiente o revisado
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'PENDING'

    const users = await (prisma as any).user.findMany({
      where: {
        kyc_status: filter === 'ALL' ? { not: 'NOT_SUBMITTED' } : filter,
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        email: true,
        country: true,
        carnet: true,
        created_at: true,
        kyc_status: true,
        kyc_selfie_url: true,
        kyc_front_url: true,
        kyc_back_url: true,
        kyc_rejection_reason: true,
        kyc_submitted_at: true,
        kyc_reviewed_at: true,
      },
      orderBy: { kyc_submitted_at: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin KYC GET error:', error)
    return NextResponse.json({ error: 'Error al obtener KYCs' }, { status: 500 })
  }
}
