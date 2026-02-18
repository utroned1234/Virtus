/**
 * reset-db.ts
 * Limpia TODA la base de datos manteniendo únicamente el usuario ADMIN.
 *
 * Uso:
 *   npx tsx scripts/reset-db.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando usuario ADMIN...')

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, username: true, email: true },
  })

  if (!admin) {
    console.error('❌ No se encontró ningún usuario ADMIN. Abortando.')
    process.exit(1)
  }

  console.log(`✅ Admin encontrado: ${admin.username} (${admin.email})`)
  console.log('🗑️  Iniciando limpieza...\n')

  // 1. SignalExecution (references Signal, User, Purchase)
  const se = await prisma.signalExecution.deleteMany({})
  console.log(`  Eliminadas ${se.count} signal executions`)

  // 2. Signals
  const sig = await prisma.signal.deleteMany({})
  console.log(`  Eliminadas ${sig.count} señales`)

  // 3. FutureOrder
  const fo = await prisma.futureOrder.deleteMany({})
  console.log(`  Eliminadas ${fo.count} órdenes de futuros`)

  // 4. WalletLedger (all users including admin — clean slate)
  const wl = await prisma.walletLedger.deleteMany({})
  console.log(`  Eliminadas ${wl.count} entradas del ledger`)

  // 5. Withdrawals
  const wd = await prisma.withdrawal.deleteMany({})
  console.log(`  Eliminados ${wd.count} retiros`)

  // 6. TaskCompletion
  const tc = await prisma.taskCompletion.deleteMany({})
  console.log(`  Eliminados ${tc.count} task completions`)

  // 7. PasswordReset
  const pr = await prisma.passwordReset.deleteMany({})
  console.log(`  Eliminados ${pr.count} password resets`)

  // 8. UserRankHistory
  const rh = await prisma.userRankHistory.deleteMany({})
  console.log(`  Eliminados ${rh.count} rank history`)

  // 9. Purchases
  const pu = await prisma.purchase.deleteMany({})
  console.log(`  Eliminadas ${pu.count} compras`)

  // 10. Eliminar todos los usuarios EXCEPTO el admin
  const us = await prisma.user.deleteMany({
    where: { id: { not: admin.id } },
  })
  console.log(`  Eliminados ${us.count} usuarios`)

  // 11. Resetear el rango del admin a 0
  await prisma.user.update({
    where: { id: admin.id },
    data: { current_rank: 0 },
  })
  console.log(`  Rango del admin reseteado a 0`)

  console.log('\n✅ Base de datos limpiada correctamente.')
  console.log(`   Solo queda: ${admin.username} (ADMIN)`)
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
