import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// DELETE: close/remove a signal
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const signal = await (prisma as any).signal.findUnique({
      where: { id: params.id },
    })

    if (!signal) {
      return NextResponse.json({ error: 'Señal no encontrada' }, { status: 404 })
    }

    await (prisma as any).signal.update({
      where: { id: params.id },
      data: { status: 'CLOSED', closed_at: new Date() },
    })

    return NextResponse.json({ message: 'Señal cerrada correctamente' })
  } catch (error) {
    console.error('Delete signal error:', error)
    return NextResponse.json({ error: 'Error al cerrar señal' }, { status: 500 })
  }
}
