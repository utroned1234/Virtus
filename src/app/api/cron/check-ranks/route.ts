import { NextRequest, NextResponse } from 'next/server'
import { recalculateAllRanks } from '@/lib/ranks'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_VERIFY_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await recalculateAllRanks()
    console.log(`[CRON check-ranks] processed: ${result.processed}, updated: ${result.updated}, bonusPaid: ${result.bonusPaid}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Cron check-ranks error:', error)
    return NextResponse.json({ error: 'Error en cron de rangos' }, { status: 500 })
  }
}
