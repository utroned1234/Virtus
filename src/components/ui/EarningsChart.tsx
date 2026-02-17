'use client'

import { useLanguage } from '@/context/LanguageContext'

interface EarningsData {
  date: string
  amount: number
  day: string
}

interface EarningsChartProps {
  totalEarnings: number
  earningsHistory: EarningsData[]
  referralBonusTotal: number
}

export default function EarningsChart({ totalEarnings, earningsHistory, referralBonusTotal }: EarningsChartProps) {
  const { t } = useLanguage()
  const weekTotal = earningsHistory.reduce((sum, e) => sum + e.amount, 0)

  // Ganancia de hoy: último elemento del historial
  const todayEarnings = earningsHistory.length > 0
    ? earningsHistory[earningsHistory.length - 1].amount
    : 0

  // Ganancia de ayer: penúltimo elemento del historial (último es hoy)
  const yesterdayEarnings = earningsHistory.length >= 2
    ? earningsHistory[earningsHistory.length - 2].amount
    : 0

  return (
    <div className="relative overflow-hidden glass-card !p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-[#34D399]/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-xs font-bold tracking-wider text-[#34D399]">
            {t('home.earningsSummary')}
          </span>
        </div>
        <span className="text-[9px] text-white/40 uppercase tracking-wider">
          {t('home.last7days')}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2.5 rounded-xl" style={{
          background: 'rgba(52, 211, 153, 0.08)',
          border: '1px solid rgba(52, 211, 153, 0.2)',
        }}>
          <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">{t('home.today')}</p>
          <p className="text-base font-bold text-[#34D399]">
            ${todayEarnings.toFixed(2)}
          </p>
          {referralBonusTotal > 0 && (
            <p className="text-[7px] text-[#66BB6A] mt-0.5">
              +${referralBonusTotal.toFixed(2)} {t('home.sponsorship').toLowerCase()}
            </p>
          )}
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{
          background: 'rgba(171, 130, 255, 0.08)',
          border: '1px solid rgba(171, 130, 255, 0.2)',
        }}>
          <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">{t('home.yesterday')}</p>
          <p className="text-base font-bold text-[#AB82FF]">
            ${yesterdayEarnings.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{
          background: 'rgba(100, 181, 246, 0.08)',
          border: '1px solid rgba(100, 181, 246, 0.2)',
        }}>
          <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">{t('home.week')}</p>
          <p className="text-base font-bold text-[#64B5F6]">
            ${weekTotal.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{
          background: 'rgba(102, 187, 106, 0.08)',
          border: '1px solid rgba(102, 187, 106, 0.2)',
        }}>
          <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">{t('home.accumulated')}</p>
          <p className="text-base font-bold text-[#66BB6A]">
            ${totalEarnings.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
