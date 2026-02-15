import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pkg = await prisma.vipPackage.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!pkg) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(pkg)
  } catch (error) {
    console.error('Package error:', error)
    return NextResponse.json(
      { error: 'Error al cargar paquete' },
      { status: 500 }
    )
  }
}
