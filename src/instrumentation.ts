export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.ENABLE_INTERNAL_CRON === 'true'
  ) {
    const { startPurchaseVerificationCron, startAutoPublishSignalCron } = await import('./lib/cron')
    startPurchaseVerificationCron()
    startAutoPublishSignalCron()
  }
}
