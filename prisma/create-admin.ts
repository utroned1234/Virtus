import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const password = 'Admin123456'
  const hashedPassword = await bcrypt.hash(password, 10)

  // Generar código de usuario único
  const userCode = 'ADM' + Math.random().toString(36).substring(2, 8).toUpperCase()

  const admin = await prisma.user.create({
    data: {
      user_code: userCode,
      username: 'admin',
      email: 'admin@admin.com',
      password_hash: hashedPassword,
      full_name: 'Administrador',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin creado exitosamente!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Email: admin@admin.com')
  console.log('🔐 Password: Admin123456')
  console.log('👤 Username: admin')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

createAdmin()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
