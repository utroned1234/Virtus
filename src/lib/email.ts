import nodemailer from 'nodemailer'

// Configuración del transporter de email
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Verificar la configuración del transporter
export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log('✅ Email transporter configurado correctamente')
    return true
  } catch (error) {
    console.error('❌ Error en configuración de email:', error)
    return false
  }
}

interface WelcomeEmailParams {
  to: string
  fullName: string
  username: string
}

interface PasswordResetEmailParams {
  to: string
  fullName: string
  resetLink: string
}

// Plantilla HTML del correo de bienvenida
function getWelcomeEmailTemplate(fullName: string, username: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a VIRTUS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D1F1C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D1F1C; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0D1F1C 0%, #1a3a35 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 50px rgba(0,0,0,0.3);">
          <!-- Header con logo -->
          <tr>
            <td align="center" style="padding: 50px 40px 30px 40px;">
              <img src="https://i.ibb.co/TBpp2tXK/IMG-20260213-192208-064.png" alt="VIRTUS Logo" style="width: 100px; height: 100px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; font-size: 42px; margin: 0; letter-spacing: 3px; font-weight: bold;">
                VIRT<span style="color: #34D399;">U</span>S
              </h1>
              <p style="color: #34D399; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;">
                Tu futuro financiero
              </p>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 15px; padding: 30px;">
                <h2 style="color: #34D399; margin: 0 0 20px 0; font-size: 24px;">
                  ¡Bienvenido/a, ${fullName}!
                </h2>

                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                  Nos complace darte la bienvenida a <strong>VIRTUS</strong>, la plataforma premium de inversión que transformará tu futuro financiero.
                </p>

                <p style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                  Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de todas nuestras funcionalidades.
                </p>

                <!-- Información de la cuenta -->
                <div style="background: rgba(13, 31, 28, 0.5); border-left: 4px solid #34D399; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="color: #34D399; margin: 0 0 15px 0; font-size: 16px;">
                    📋 Información de tu cuenta:
                  </h3>
                  <p style="color: #ffffff; font-size: 14px; margin: 8px 0;">
                    <strong>Nombre:</strong> ${fullName}
                  </p>
                  <p style="color: #ffffff; font-size: 14px; margin: 8px 0;">
                    <strong>Usuario:</strong> ${username}
                  </p>
                </div>

                <!-- Botón de acción -->
                <div style="text-align: center; margin: 35px 0 10px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login"
                     style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(52, 211, 153, 0.3);">
                    Iniciar Sesión Ahora
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.2);">
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin: 0 0 10px 0;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center; margin: 0;">
                © 2026 Virtus. Todos los derechos reservados.<br>
                El contenido y la marca están protegidos por la legislación vigente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Función para enviar el correo de bienvenida
export async function sendWelcomeEmail({ to, fullName, username }: WelcomeEmailParams) {
  try {
    // Verificar que las credenciales de email estén configuradas
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️ Credenciales de email no configuradas. Email no enviado.')
      return { success: false, error: 'Email credentials not configured' }
    }

    const mailOptions = {
      from: `"VIRTUS Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: '🎉 ¡Bienvenido/a a VIRTUS! - Tu cuenta ha sido creada',
      html: getWelcomeEmailTemplate(fullName, username),
      text: `¡Bienvenido/a a VIRTUS, ${fullName}!\n\nTu cuenta ha sido creada exitosamente.\n\nInformación de tu cuenta:\n- Nombre: ${fullName}\n- Usuario: ${username}\n\nPuedes iniciar sesión en: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login\n\n© 2026 Virtus. Todos los derechos reservados.`,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de bienvenida enviado:', info.messageId)

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error al enviar email de bienvenida:', error)
    return { success: false, error }
  }
}

function getPasswordResetTemplate(fullName: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña - VIRTUS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D1F1C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0D1F1C; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0D1F1C 0%, #1a3a35 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 50px rgba(0,0,0,0.3);">
          <tr>
            <td align="center" style="padding: 50px 40px 30px 40px;">
              <h1 style="color: #ffffff; font-size: 42px; margin: 0; letter-spacing: 3px; font-weight: bold;">
                VIRT<span style="color: #34D399;">U</span>S
              </h1>
              <p style="color: #34D399; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;">
                Recuperación de contraseña
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 15px; padding: 30px;">
                <h2 style="color: #34D399; margin: 0 0 20px 0; font-size: 24px;">Hola, ${fullName}</h2>
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                </p>
                <p style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                  Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.
                </p>
                <div style="text-align: center; margin: 35px 0 10px 0;">
                  <a href="${resetLink}"
                     style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(52, 211, 153, 0.3);">
                    Restablecer contraseña
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.2);">
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; text-align: center; margin: 0;">
                © 2026 Virtus. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function sendPasswordResetEmail({ to, fullName, resetLink }: PasswordResetEmailParams) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️ Credenciales de email no configuradas. Email no enviado.')
      return { success: false, error: 'Email credentials not configured' }
    }

    const mailOptions = {
      from: `"VIRTUS Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: '🔐 Recupera tu contraseña - VIRTUS',
      html: getPasswordResetTemplate(fullName, resetLink),
      text: `Hola ${fullName},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en este enlace (válido por 1 hora):\n${resetLink}\n\nSi no solicitaste este cambio, ignora este correo.\n\n© 2026 Virtus.`,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email de reset enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error al enviar email de reset:', error)
    return { success: false, error }
  }
}
