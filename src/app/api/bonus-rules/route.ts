import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Forzar que siempre sea dinámico (sin caché)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Devolver los 5 niveles de patrocinio
    const rules = await prisma.referralBonusRule.findMany({
      where: { level: { lte: 5 } },
      orderBy: { level: 'asc' },
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Bonus rules error:', error)
    return NextResponse.json(
      { error: 'Error al cargar bonos' },
      { status: 500 }
    )
  }
}
