import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/hash'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetRecord || resetRecord.used) {
      return NextResponse.json(
        { error: 'Token inválido o ya usado' },
        { status: 400 }
      )
    }

    if (new Date() > resetRecord.expires_at) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 400 }
      )
    }

    const password_hash = await hashPassword(password)

    await prisma.user.update({
      where: { id: resetRecord.user_id },
      data: { password_hash },
    })

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    })

    return NextResponse.json({ message: 'Contraseña restablecida exitosamente' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Error al restablecer contraseña' },
      { status: 500 }
    )
  }
}
