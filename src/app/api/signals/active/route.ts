import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

// GET: get the currently active signal + whether this user already executed it
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId

    const signal = await (prisma as any).signal.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
    })

    if (!signal) {
      return NextResponse.json({ signal: null, already_executed: false })
    }

    const execution = await (prisma as any).signalExecution.findUnique({
      where: { signal_id_user_id: { signal_id: signal.id, user_id: userId } },
    })

    return NextResponse.json({
      signal: { id: signal.id, code: signal.code, label: signal.label, pair: signal.pair, direction: signal.direction, created_at: signal.created_at },
      already_executed: !!execution,
      execution: execution || null,
    })
  } catch (error) {
    console.error('Get active signal error:', error)
    return NextResponse.json({ error: 'Error al obtener señal activa' }, { status: 500 })
  }
}
