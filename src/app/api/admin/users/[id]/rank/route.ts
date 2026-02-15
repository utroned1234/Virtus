import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { setUserRankManual } from '@/lib/ranks'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { rank } = await req.json()

    if (typeof rank !== 'number' || rank < 0 || rank > 5) {
      return NextResponse.json({ error: 'Rango inválido (0-5)' }, { status: 400 })
    }

    const result = await setUserRankManual(params.id, rank)

    return NextResponse.json({
      message: rank === 0 ? 'Rango eliminado' : `Rango ${rank}R asignado correctamente`,
      ...result,
      bonus_paid: result.bonusPaid,
    })
  } catch (error) {
    console.error('Set user rank error:', error)
    return NextResponse.json({ error: 'Error al asignar rango' }, { status: 500 })
  }
}
