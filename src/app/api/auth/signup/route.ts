import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/hash'
import { generateUserCode } from '@/lib/utils'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const limitResult = rateLimit(`signup:${ip}`, 10, 60_000)
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta nuevamente en un minuto.' },
        { status: 429 }
      )
    }

    const { sponsor_code, full_name, username, email, password, country, language, carnet } = await req.json()

    if (!full_name || !username || !email || !password || !carnet) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuario o email ya registrado' },
        { status: 400 }
      )
    }

    // Find sponsor if code provided
    let sponsor_id = null
    if (sponsor_code) {
      const sponsor = await prisma.user.findUnique({
        where: { user_code: sponsor_code },
      })
      if (sponsor) {
        sponsor_id = sponsor.id
      }
    }

    // Generate unique user code
    let user_code = generateUserCode()
    let codeExists = await prisma.user.findUnique({ where: { user_code } })
    while (codeExists) {
      user_code = generateUserCode()
      codeExists = await prisma.user.findUnique({ where: { user_code } })
    }

    const password_hash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        user_code,
        username,
        email,
        password_hash,
        full_name,
        carnet: carnet || null,
        sponsor_id,
        country: country || null,
        language: language || 'es',
      },
    })

    // Enviar correo de bienvenida automáticamente
    // Se ejecuta en background para no bloquear la respuesta
    sendWelcomeEmail({
      to: user.email,
      fullName: user.full_name,
      username: user.username,
    }).catch(error => {
      // Log error pero no fallar el registro
      console.error('Error enviando email de bienvenida:', error)
    })

    return NextResponse.json({
      message: 'Usuario registrado exitosamente',
      user_code: user.user_code,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    )
  }
}
