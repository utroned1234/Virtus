import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { recalculateAllRanks } from '@/lib/ranks'

export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const result = await recalculateAllRanks()
    return NextResponse.json({
      message: 'Rangos recalculados correctamente',
      ...result,
    })
  } catch (error) {
    console.error('Recalculate ranks error:', error)
    return NextResponse.json({ error: 'Error al recalcular rangos' }, { status: 500 })
  }
}
