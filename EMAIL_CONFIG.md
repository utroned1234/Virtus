# Configuración de Email para VIRTUS

Este documento explica cómo configurar el envío automático de correos de bienvenida cuando un usuario se registra.

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# === Configuración de Email (SMTP) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion

# === URL de la Aplicación ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Configuración según el Proveedor

### Gmail

1. **Habilitar autenticación de dos factores** en tu cuenta de Gmail
2. **Generar una contraseña de aplicación**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Crea una nueva contraseña de aplicación para "Mail"
   - Usa esa contraseña en `SMTP_PASSWORD`

**Variables para Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Contraseña de aplicación
```

### Outlook / Hotmail

**Variables para Outlook:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tu-email@outlook.com
SMTP_PASSWORD=tu-contraseña
```

### Yahoo Mail

**Variables para Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=tu-email@yahoo.com
SMTP_PASSWORD=contraseña-de-aplicacion
```

### SendGrid (Recomendado para producción)

1. Crea una cuenta en https://sendgrid.com/
2. Genera una API Key
3. Usa las siguientes variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=tu-api-key-de-sendgrid
```

## Funcionamiento

El sistema funciona de la siguiente manera:

1. **Usuario se registra** → Completa el formulario de registro
2. **Sistema crea la cuenta** → Valida y guarda en la base de datos
3. **Envío automático de email** → Se envía el correo de bienvenida
4. **Usuario recibe el correo** → Con su información de cuenta

## Contenido del Correo de Bienvenida

El correo incluye:
- ✅ Mensaje de bienvenida personalizado
- ✅ Nombre completo del usuario
- ✅ Nombre de usuario para iniciar sesión
- ✅ Botón para ir al login
- ✅ Información sobre las funcionalidades de la plataforma

**No incluye:**
- ❌ La contraseña del usuario
- ❌ Tokens de seguridad
- ❌ Enlaces de verificación

## Verificación

Para verificar que el email está configurado correctamente, puedes:

1. Registrar un usuario de prueba
2. Revisar los logs del servidor:
   - ✅ `Email de bienvenida enviado:` → Configuración correcta
   - ⚠️ `Credenciales de email no configuradas` → Faltan variables de entorno
   - ❌ `Error al enviar email` → Revisar credenciales

## Seguridad

- Las credenciales de email se guardan en `.env.local` (nunca en el código)
- El archivo `.env.local` está en `.gitignore` (no se sube a GitHub)
- Usa contraseñas de aplicación, no tu contraseña principal
- En producción, usa servicios profesionales como SendGrid o Amazon SES

## Solución de Problemas

### El correo no se envía

1. Verifica las variables de entorno en `.env.local`
2. Revisa los logs del servidor
3. Asegúrate de que el puerto 587 no esté bloqueado
4. Verifica que la contraseña de aplicación sea correcta

### Gmail bloquea el envío

1. Habilita autenticación de dos factores
2. Genera una nueva contraseña de aplicación
3. Usa esa contraseña en `SMTP_PASSWORD`

### El correo llega a spam

1. Configura SPF y DKIM en tu dominio
2. Usa un servicio profesional como SendGrid
3. Evita palabras spam en el asunto

## Ejemplo de Uso en Producción

```env
# Producción con SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://virtus.app
```

---

© 2026 Virtus. Todos los derechos reservados.
