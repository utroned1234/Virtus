import cron from 'node-cron'

let isVerifyScheduled = false

export function startPurchaseVerificationCron() {
  if (isVerifyScheduled) {
    console.log('[CRON-VERIFY] Ya está programado')
    return
  }

  // Run every minute to verify pending blockchain purchases
  cron.schedule('* * * * *', async () => {
    try {
      const response = await fetch('http://localhost:3000/api/purchases/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_VERIFY_SECRET || 'jade_verify_secret_2026_xK9mP2'}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.processed > 0) {
          console.log('[CRON-VERIFY] Procesados:', data.processed, data.results)
        }
      }
    } catch (error) {
      // Silent - will retry next minute
    }
  })

  isVerifyScheduled = true
  console.log('[CRON-VERIFY] Verificacion de compras blockchain cada minuto')
}
