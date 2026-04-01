import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener configuración de pago (público, sin auth)
export async function GET() {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { id: 1 },
      select: {
        binance_wallet_id: true,
        binance_qr_url: true,
      },
    })

    return NextResponse.json({
      binance_wallet_id: config?.binance_wallet_id || '',
      binance_qr_url: config?.binance_qr_url || '',
    })
  } catch (error) {
    console.error('Error fetching payment config:', error)
    return NextResponse.json({ binance_wallet_id: '', binance_qr_url: '' })
  }
}
