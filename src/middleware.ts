import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password') ||
    request.nextUrl.pathname === '/'

  const isProtectedPage = request.nextUrl.pathname.startsWith('/home') ||
    request.nextUrl.pathname.startsWith('/paks') ||
    request.nextUrl.pathname.startsWith('/tabla') ||
    request.nextUrl.pathname.startsWith('/withdrawals') ||
    request.nextUrl.pathname.startsWith('/my-purchases') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/futuros') ||
    request.nextUrl.pathname.startsWith('/kyc') ||
    request.nextUrl.pathname.startsWith('/mercado') ||
    request.nextUrl.pathname.startsWith('/network') ||
    request.nextUrl.pathname.startsWith('/trading')

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && token && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
