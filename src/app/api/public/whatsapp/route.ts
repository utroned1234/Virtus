import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener número de WhatsApp público
export async function GET() {
  try {
    let config = await prisma.globalConfig.findUnique({
      where: { id: 1 },
    })

    if (!config) {
      config = await prisma.globalConfig.create({
        data: {
          id: 1,
          whatsapp_number: '',
        },
      })
    }

    return NextResponse.json({ whatsapp_number: config.whatsapp_number })
  } catch (error) {
    console.error('Error fetching WhatsApp number:', error)
    return NextResponse.json({ whatsapp_number: '' })
  }
}
