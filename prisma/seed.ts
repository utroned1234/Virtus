import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Seed Admin User
  const adminPassword = 'Jade123456789'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: 'admin@jade.com' },
    update: {
      password_hash: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      user_code: 'ADMIN001',
      username: 'admin',
      email: 'admin@jade.com',
      password_hash: hashedPassword,
      full_name: 'Administrador',
      role: 'ADMIN',
    },
  })
  console.log('Admin user seeded')

  // Seed JADE Packages (2.5% daily profit) - Starting from 50 USD
  const vipPackages = [
    { level: 1, name: 'JADE 1', investment_bs: 1, daily_profit_bs: 0.025 },
    { level: 2, name: 'JADE 2', investment_bs: 100, daily_profit_bs: 2.5 },
    { level: 3, name: 'JADE 3', investment_bs: 200, daily_profit_bs: 5 },
    { level: 4, name: 'JADE 4', investment_bs: 300, daily_profit_bs: 7.5 },
    { level: 5, name: 'JADE 5', investment_bs: 600, daily_profit_bs: 15 },
    { level: 6, name: 'JADE 6', investment_bs: 1200, daily_profit_bs: 30 },
    { level: 7, name: 'JADE 7', investment_bs: 2500, daily_profit_bs: 62.5 },
    { level: 8, name: 'JADE 8', investment_bs: 5000, daily_profit_bs: 125 },
  ]

  for (const pkg of vipPackages) {
    await prisma.vipPackage.upsert({
      where: { level: pkg.level },
      update: {
        name: pkg.name,
        investment_bs: pkg.investment_bs,
        daily_profit_bs: pkg.daily_profit_bs,
      },
      create: pkg,
    })
  }
  console.log('VIP Packages seeded')

  // Seed Referral Bonus Rules
  // Nivel 1: 15% total (10% directo + 5% repartido entre referidos directos del patrocinador)
  const bonusRules = [
    { level: 1, percentage: 15 },
    { level: 2, percentage: 3 },
    { level: 3, percentage: 0.5 },
    { level: 4, percentage: 0.4 },
    { level: 5, percentage: 0.2 },
  ]

  for (const rule of bonusRules) {
    await prisma.referralBonusRule.upsert({
      where: { level: rule.level },
      update: { percentage: rule.percentage },
      create: rule,
    })
  }
  console.log('Referral Bonus Rules seeded')

  // Seed Banners (examples)
  const banners = [
    {
      location: 'HOME_TOP' as const,
      image_url: 'https://via.placeholder.com/800x300/C9A24D/FFFFFF?text=Banner+Top+1',
      order: 1,
    },
    {
      location: 'HOME_TOP' as const,
      image_url: 'https://via.placeholder.com/800x300/E6C87A/0B0B0B?text=Banner+Top+2',
      order: 2,
    },
    {
      location: 'HOME_BOTTOM' as const,
      image_url: 'https://via.placeholder.com/800x300/5A4A2F/FFFFFF?text=Banner+Bottom+1',
      order: 1,
    },
    {
      location: 'HOME_BOTTOM' as const,
      image_url: 'https://via.placeholder.com/800x300/2B2B2B/E6C87A?text=Banner+Bottom+2',
      order: 2,
    },
  ]

  for (const banner of banners) {
    await prisma.banner.create({
      data: banner,
    })
  }
  console.log('Banners seeded')

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
