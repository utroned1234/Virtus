import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  console.log('=== Debug Auth API Called ===')
  
  const authResult = requireAuth(req)
  console.log('Auth result:', authResult)
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error, authenticated: false },
      { status: authResult.status }
    )
  }

  return NextResponse.json({
    authenticated: true,
    user: authResult.user,
    userId: authResult.user.userId,
    username: authResult.user.username,
    role: authResult.user.role,
  })
}
