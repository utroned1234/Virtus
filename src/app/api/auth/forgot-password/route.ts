import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateResetToken } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: 'El correo no está registrado' },
        { status: 404 }
      )
    }

    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    })

    const origin =
      req.nextUrl?.origin ||
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      ''
    const resetLink = `${origin}/reset-password?token=${token}`

    // In production, send email with reset link
    console.log(`Reset token for ${email}: ${token}`)
    console.log(`Reset link: ${resetLink}`)

    return NextResponse.json({
      message: 'Se ha enviado un enlace de recuperación a tu email',
      reset_link: resetLink,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}
