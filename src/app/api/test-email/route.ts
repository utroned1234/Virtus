import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail, verifyEmailConfig } from '@/lib/email'

// Este endpoint es solo para testing
// ELIMINAR o PROTEGER en producción
export async function POST(req: NextRequest) {
  try {
    const { email, fullName, username } = await req.json()

    if (!email || !fullName || !username) {
      return NextResponse.json(
        { error: 'Faltan parámetros: email, fullName, username' },
        { status: 400 }
      )
    }

    // Verificar configuración de email
    const isConfigured = await verifyEmailConfig()
    if (!isConfigured) {
      return NextResponse.json(
        {
          error: 'Email no configurado correctamente',
          hint: 'Verifica las variables SMTP_HOST, SMTP_USER, SMTP_PASSWORD en .env.local',
        },
        { status: 500 }
      )
    }

    // Enviar email de prueba
    const result = await sendWelcomeEmail({
      to: email,
      fullName,
      username,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email de prueba enviado correctamente',
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Error al enviar email',
          details: result.error,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error en test-email:', error)
    return NextResponse.json(
      { error: 'Error en el servidor', details: error },
      { status: 500 }
    )
  }
}

// GET para verificar configuración
export async function GET() {
  const isConfigured = await verifyEmailConfig()

  const config = {
    host: process.env.SMTP_HOST || 'No configurado',
    port: process.env.SMTP_PORT || 'No configurado',
    user: process.env.SMTP_USER || 'No configurado',
    passwordSet: !!process.env.SMTP_PASSWORD,
  }

  return NextResponse.json({
    configured: isConfigured,
    config,
    message: isConfigured
      ? 'Email configurado correctamente'
      : 'Email no configurado. Verifica las variables de entorno.',
  })
}
