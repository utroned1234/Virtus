export async function register() {
  // Only run in Node.js runtime (not Edge), and only if enabled
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.ENABLE_INTERNAL_CRON === 'true'
  ) {
    const { startPurchaseVerificationCron, startAutoPublishSignalCron } = await import('./src/lib/cron')
    startPurchaseVerificationCron()
    startAutoPublishSignalCron()
  }
}
