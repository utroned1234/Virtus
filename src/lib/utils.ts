export function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateResetToken(): string {
  const { randomBytes } = require('crypto')
  return randomBytes(32).toString('hex')
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function calculatePercentage(profit: number, investment: number): number {
  if (investment === 0) return 0
  return (profit / investment) * 100
}
