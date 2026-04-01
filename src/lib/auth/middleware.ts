import { NextRequest } from 'next/server'
import { verifyToken } from './jwt'

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookieToken = req.cookies.get('auth_token')?.value
  if (cookieToken) return cookieToken
  return null
}

export function authenticateRequest(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return null
  return verifyToken(token)
}

export function requireAuth(req: NextRequest) {
  const user = authenticateRequest(req)
  if (!user) {
    return { error: 'No autorizado', status: 401 }
  }
  return { user }
}

export function requireAdmin(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) return authResult
  if (authResult.user.role !== 'ADMIN') {
    return { error: 'Acceso denegado: se requiere rol de administrador', status: 403 }
  }
  return { user: authResult.user }
}
