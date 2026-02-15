# Cómo Probar el Sistema de Email de Bienvenida

## Configuración Rápida

### 1. Agregar Variables de Entorno

Abre tu archivo `.env.local` y agrega estas líneas al final:

```env
# === Email Configuration ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Obtener Contraseña de Aplicación de Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú izquierdo, selecciona "Seguridad"
3. Habilita la "Verificación en dos pasos" si no la tienes
4. Ve a "Contraseñas de aplicaciones": https://myaccount.google.com/apppasswords
5. Selecciona "Correo" y genera una contraseña
6. Copia la contraseña de 16 caracteres (ejemplo: `xxxx xxxx xxxx xxxx`)
7. Pega esa contraseña en `SMTP_PASSWORD` (sin espacios)

### 3. Reiniciar el Servidor

```bash
# Detener el servidor actual (Ctrl+C)
# Luego ejecutar:
npm run dev
```

## Verificar Configuración

### Opción 1: Endpoint de Verificación

Abre en tu navegador:
```
http://localhost:3000/api/test-email
```

Deberías ver:
```json
{
  "configured": true,
  "message": "Email configurado correctamente"
}
```

### Opción 2: Enviar Email de Prueba

Usa Postman, Thunder Client o curl:

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@gmail.com",
    "fullName": "Juan Pérez",
    "username": "juanperez"
  }'
```

## Probar con Registro Real

1. Ve a: http://localhost:3000/signup
2. Completa el formulario de registro
3. Haz clic en "Registrarse"
4. **Revisa tu bandeja de entrada**

El correo debería llegar en menos de 10 segundos.

## Solución de Problemas

### ❌ "Email no configurado"

**Causa:** Faltan las variables de entorno.

**Solución:**
1. Verifica que `.env.local` tenga todas las variables
2. Reinicia el servidor (`npm run dev`)

### ❌ "Invalid login: 535 Authentication failed"

**Causa:** Contraseña incorrecta o contraseña normal (no de aplicación).

**Solución:**
1. Habilita verificación en dos pasos en Google
2. Genera una nueva contraseña de aplicación
3. Usa esa contraseña en `SMTP_PASSWORD`

### ❌ El correo llega a SPAM

**Normal en desarrollo.** Revisa tu carpeta de spam.

### ❌ El correo no llega

1. Revisa los logs del servidor (terminal donde corre `npm run dev`)
2. Busca el mensaje: `✅ Email de bienvenida enviado:`
3. Si dice `⚠️ Credenciales de email no configuradas`, verifica `.env.local`

## Logs del Servidor

Cuando un usuario se registra, deberías ver en la terminal:

```
✅ Email transporter configurado correctamente
✅ Email de bienvenida enviado: <mensaje-id>
```

Si hay error:
```
❌ Error al enviar email de bienvenida: [detalles del error]
```

## Importante

- El registro funciona aunque el email falle
- El email se envía en segundo plano
- No afecta el tiempo de respuesta del registro

---

© 2026 Virtus. Sistema de Email Automático
