import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'

// Internal proxy: triggers verification without exposing CRON_VERIFY_SECRET to the client
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const secret = process.env.CRON_VERIFY_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'No configurado' }, { status: 500 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`
    const res = await fetch(`${baseUrl}/api/purchases/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Trigger verify error:', error)
    return NextResponse.json({ error: 'Error al disparar verificación' }, { status: 500 })
  }
}
