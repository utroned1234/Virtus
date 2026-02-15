import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

// GET: list all signals
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const signals = await (prisma as any).signal.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { executions: true } },
      },
    })
    return NextResponse.json({ signals })
  } catch (error) {
    console.error('Get signals error:', error)
    return NextResponse.json({ error: 'Error al obtener señales' }, { status: 500 })
  }
}

// POST: create a new signal (closes any existing ACTIVE signal first)
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { code, label, pair, direction } = await req.json()

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Código de señal requerido' }, { status: 400 })
    }

    if (!pair || typeof pair !== 'string' || pair.trim().length === 0) {
      return NextResponse.json({ error: 'Par de trading requerido' }, { status: 400 })
    }

    if (!direction || !['CALL', 'PUT'].includes(direction)) {
      return NextResponse.json({ error: 'Dirección requerida (COMPRA o VENTA)' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()
    const cleanPair = pair.trim().toUpperCase()

    // Close any existing ACTIVE signal
    await (prisma as any).signal.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'CLOSED', closed_at: new Date() },
    })

    // Delete any old CLOSED signal with the same code to avoid unique constraint error
    await (prisma as any).signal.deleteMany({
      where: { code: cleanCode, status: 'CLOSED' },
    })

    const signal = await (prisma as any).signal.create({
      data: {
        code: cleanCode,
        label: label?.trim() || null,
        pair: cleanPair,
        direction: direction,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ signal })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una señal con ese código' }, { status: 409 })
    }
    console.error('Create signal error:', error)
    return NextResponse.json({ error: 'Error al crear señal' }, { status: 500 })
  }
}
