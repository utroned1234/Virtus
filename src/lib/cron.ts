import cron from 'node-cron'

let isVerifyScheduled = false
let isSignalScheduled = false

// Render sets PORT env var (default 10000), local dev uses 3000
function getBaseUrl() {
  const port = process.env.PORT || 3000
  return `http://localhost:${port}`
}

export function startPurchaseVerificationCron() {
  if (isVerifyScheduled) {
    console.log('[CRON-VERIFY] Ya está programado')
    return
  }

  cron.schedule('* * * * *', async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/purchases/verify`, {
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
  console.log(`[CRON-VERIFY] Verificacion de compras blockchain cada minuto — baseUrl: ${getBaseUrl()}`)
}

export function startAutoPublishSignalCron() {
  if (isSignalScheduled) {
    console.log('[CRON-SIGNAL] Ya está programado')
    return
  }

  // Every day at 20:00 UTC = 4:00 PM Bolivia (UTC-4, no DST)
  cron.schedule('0 20 * * *', async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/cron/auto-publish-signal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'jade_verify_secret_2026_xK9mP2'}`,
        },
      })
      const data = await response.json()
      console.log('[CRON-SIGNAL] Señal publicada:', data.signal?.code, data.signal?.pair, data.signal?.direction)
    } catch (error) {
      console.error('[CRON-SIGNAL] Error:', error)
    }
  })

  isSignalScheduled = true
  console.log('[CRON-SIGNAL] Señal automática programada: 4:00 PM hora Bolivia')
}
