import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function createAdmin() {
  const username = 'admin01'
  const email = 'admin01@vip.com'
  const password = '1234567890'
  const full_name = 'Administrador'

  // Check if admin exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] }
  })

  if (existing) {
    console.log('Admin user already exists')
    return
  }

  // Generate user code
  const user_code = 'ADMIN001'

  // Hash password
  const password_hash = await bcrypt.hash(password, 10)

  // Create admin
  const admin = await prisma.user.create({
    data: {
      user_code,
      username,
      email,
      password_hash,
      full_name,
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created successfully!')
  console.log('Username:', username)
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('User Code:', user_code)
  console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login')
}

createAdmin()
  .catch((e) => {
    console.error('Error creating admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
