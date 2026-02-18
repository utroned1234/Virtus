'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import ScreenshotProtection from '@/components/ui/ScreenshotProtection'
import { useLanguage } from '@/context/LanguageContext'

interface VipPackage {
  id: number
  level: number
  name: string
  investment_bs: number
  daily_profit_bs: number
  participates_in_referral_bonus: boolean
  participates_in_bono_retorno: boolean
  is_enabled: boolean
}

interface PurchasedPackage {
  id: number
  status: string
  investment_bs: number      // monto pagado (puede ser diferencia de upgrade)
  pkg_investment_bs: number  // valor real del paquete (para calcular diferencias correctas)
  level: number
}

export default function PaksPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [purchasedPackages, setPurchasedPackages] = useState<PurchasedPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1]

      if (token) {
        const purchasesRes = await fetch('/api/purchases/my', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (purchasesRes.ok) {
          const purchases = await purchasesRes.json()
          const paks = purchases
            .map((purchase: any) => ({
              id: purchase.vip_package_id,
              status: purchase.status,
              investment_bs: purchase.investment_bs,
              pkg_investment_bs: purchase.vip_package?.investment_bs ?? purchase.investment_bs,
              level: purchase.vip_package?.level ?? 0,
            }))
            .filter((p: PurchasedPackage) => typeof p.id === 'number')
          setPurchasedPackages(paks)
        }
      }

      const res = await fetch('/api/packages', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        const data = await res.json()
        setPackages(data)
      }

    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Find the user's highest active package
  const activeHighest = purchasedPackages
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => b.level - a.level)[0] ?? null

  const getPackageTier = (level: number) => {
    if (level <= 2) return { color: '#33e6ff', colorRgb: '51, 230, 255', bgFrom: 'rgba(6, 20, 35, 0.92)', bgTo: 'rgba(10, 35, 60, 0.88)' }
    if (level <= 4) return { color: '#818CF8', colorRgb: '129, 140, 248', bgFrom: 'rgba(12, 8, 30, 0.92)', bgTo: 'rgba(20, 18, 55, 0.88)' }
    if (level <= 6) return { color: '#C084FC', colorRgb: '192, 132, 252', bgFrom: 'rgba(18, 6, 28, 0.92)', bgTo: 'rgba(30, 15, 50, 0.88)' }
    return { color: '#FFD700', colorRgb: '255, 215, 0', bgFrom: 'rgba(25, 18, 5, 0.92)', bgTo: 'rgba(40, 30, 10, 0.88)' }
  }

  const getPackageIcon = (level: number) => {
    switch (level) {
      case 1:
        return <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      case 2:
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      case 3:
        return <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      case 4:
        return <>
          <path d="M6 3h12l4 6-10 13L2 9z" />
          <path d="M2 9h20" />
          <path d="M12 22L6 9l6-6 6 6z" />
        </>
      case 5:
        return <>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
        </>
      case 6:
        return <>
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0012 0V2z" />
        </>
      case 7:
        return <>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </>
      case 8:
        return <>
          <path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0z" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </>
      default:
        return <circle cx="12" cy="12" r="9" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-cyan-primary text-xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          <div className="inline-block animate-pulse">Cargando Planes...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ fontFamily: 'Orbitron, sans-serif' }}>
      <ScreenshotProtection />
      <div className="max-w-screen-xl mx-auto p-6 space-y-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold gold-glow uppercase tracking-wider mb-2">
            {t('vip.title')}
          </h1>
          <p className="text-text-secondary text-sm uppercase tracking-widest">
            {t('vip.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {packages.map((pkg) => {
            const purchasedData = purchasedPackages.find(p => p.id === pkg.id)
            const isPurchased = !!purchasedData
            const isActive = purchasedData?.status === 'ACTIVE'

            // Detect if this package is an upgrade option
            const isUpgrade = !isPurchased && activeHighest !== null && pkg.level > activeHighest.level
            const upgradeDiff = isUpgrade && activeHighest
              ? pkg.investment_bs - activeHighest.pkg_investment_bs
              : 0

            // Bloquear paquetes menores o iguales al activo actual
            // Lógica: Si tengo nivel 3, no puedo comprar 1, 2 ni 3. Solo 4 para arriba.
            const isBlockedByActive = activeHighest !== null && pkg.level <= activeHighest.level
            const isDisabled = !pkg.is_enabled || isActive || isBlockedByActive
            const tier = getPackageTier(pkg.level)

            return (
              <div
                key={pkg.id}
                className="relative group"
                style={{
                  background: `linear-gradient(135deg, ${tier.bgFrom}, ${tier.bgTo})`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: isUpgrade
                    ? `1px solid rgba(${tier.colorRgb}, 0.7)`
                    : `1px solid rgba(${tier.colorRgb}, 0.4)`,
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  boxShadow: isUpgrade
                    ? `0 4px 20px rgba(${tier.colorRgb}, 0.3)`
                    : `0 4px 16px rgba(${tier.colorRgb}, 0.15)`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() => !isDisabled && router.push(`/paks/${pkg.id}/buy`)}
              >
                {/* Upgrade badge */}
                {isUpgrade && (
                  <div
                    className="absolute top-0 right-0 text-[8px] font-bold uppercase px-2 py-0.5 rounded-bl-lg"
                    style={{
                      background: `rgba(${tier.colorRgb}, 0.2)`,
                      color: tier.color,
                      borderLeft: `1px solid rgba(${tier.colorRgb}, 0.4)`,
                      borderBottom: `1px solid rgba(${tier.colorRgb}, 0.4)`,
                    }}
                  >
                    Upgrade
                  </div>
                )}

                <div className="relative z-10 flex flex-col flex-1 gap-2">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, rgba(${tier.colorRgb}, 0.2), rgba(${tier.colorRgb}, 0.08))`,
                        border: `1px solid rgba(${tier.colorRgb}, 0.5)`,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={tier.color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                        style={{ color: tier.color }}
                      >
                        {getPackageIcon(pkg.level)}
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase" style={{ color: tier.color }}>
                        {pkg.name}
                      </h2>
                    </div>
                  </div>

                  {/* Monto de inversión */}
                  <div className="space-y-1 text-[10px] pt-2" style={{ borderTop: `1px solid rgba(${tier.colorRgb}, 0.2)` }}>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{t('common.investment')}:</span>
                      <span className="font-bold text-white">${pkg.investment_bs.toLocaleString()} USD</span>
                    </div>
                    {isUpgrade && upgradeDiff > 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">{t('vip.pays')}:</span>
                        <span className="font-bold" style={{ color: tier.color }}>+${upgradeDiff.toLocaleString()} USD</span>
                      </div>
                    )}
                  </div>

                  {/* Beneficios */}
                  <div className="space-y-1 text-[9px]">
                    <div className="flex items-center gap-1">
                      <span style={{ color: tier.color }}>✓</span>
                      <span className="text-text-secondary">{t('vip.signals')}</span>
                    </div>
                    {pkg.participates_in_referral_bonus && (
                      <div className="flex items-center gap-1">
                        <span style={{ color: tier.color }}>✓</span>
                        <span className="text-text-secondary">{t('vip.sponsorBonus')}</span>
                      </div>
                    )}
                    {pkg.participates_in_bono_retorno && (
                      <div className="flex items-center gap-1">
                        <span style={{ color: '#FFD700' }}>★</span>
                        <span style={{ color: '#FFD700' }}>{t('vip.sharedBonus')}</span>
                      </div>
                    )}
                  </div>

                  {/* Button - always at bottom */}
                  <button
                    disabled={isDisabled}
                    className="mt-auto w-full py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all"
                    style={{
                      background: isDisabled
                        ? `rgba(${tier.colorRgb}, 0.1)`
                        : `linear-gradient(135deg, rgba(${tier.colorRgb}, 0.15), rgba(${tier.colorRgb}, 0.05))`,
                      border: `1px solid rgba(${tier.colorRgb}, ${isDisabled ? '0.2' : '0.5'})`,
                      color: isDisabled ? `rgba(${tier.colorRgb}, 0.4)` : tier.color,
                    }}
                  >
                    {isBlockedByActive
                      ? t('vip.blocked')
                      : isUpgrade
                        ? `${t('vip.upgrade')} +$${upgradeDiff.toLocaleString()}`
                        : pkg.is_enabled
                          ? t('vip.selectPlan')
                          : t('vip.notAvailable')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      <p className="mt-8 text-[10px] text-white/20 text-center uppercase tracking-wider px-4">
        {t('common.copyright')}
      </p>

      <BottomNav />
    </div>
  )
}
