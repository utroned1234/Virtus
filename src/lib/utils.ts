export function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function generateResetToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function calculatePercentage(profit: number, investment: number): number {
  if (investment === 0) return 0
  return (profit / investment) * 100
}
