// Cache del dashboard
const dashboardCache = new Map<string, { expiresAt: number; payload: any }>()

export const DASHBOARD_TTL_MS = 3_000 // 3 segundos

export function getDashboardCache(key: string) {
  const cached = dashboardCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload
  }
  return null
}

export function setDashboardCache(key: string, payload: any) {
  dashboardCache.set(key, {
    expiresAt: Date.now() + DASHBOARD_TTL_MS,
    payload,
  })
}

export function clearDashboardCache() {
  dashboardCache.clear()
}
