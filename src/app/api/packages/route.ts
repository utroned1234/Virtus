import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const packages = await prisma.vipPackage.findMany({
      where: { is_enabled: true },
      orderBy: { level: 'asc' },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Packages error:', error)
    return NextResponse.json(
      { error: 'Error al cargar paquetes' },
      { status: 500 }
    )
  }
}
