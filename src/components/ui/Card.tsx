'use client'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  glassEffect?: boolean
  accentColor?: 'blue' | 'gold' | 'green'
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  accentColor = 'blue'
}: CardProps) {
  const accentColors = {
    blue: {
      dot: 'bg-[#34D399]',
      border: 'border-[#34D399]/30',
      title: 'text-[#34D399]',
    },
    gold: {
      dot: 'bg-[#FBBF24]',
      border: 'border-[#FBBF24]/30',
      title: 'text-[#FBBF24]',
    },
    green: {
      dot: 'bg-[#66BB6A]',
      border: 'border-[#66BB6A]/30',
      title: 'text-[#66BB6A]',
    },
  }

  const accent = accentColors[accentColor]

  return (
    <div className={`glass-card p-5 relative overflow-hidden ${className}`}>
      {/* Header opcional */}
      {title && (
        <div className={`flex justify-between items-center mb-4 pb-3 border-b ${accent.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${accent.dot} shadow-[0_0_6px_currentColor]`} />
            <span className={`text-sm font-semibold tracking-wide font-outfit ${accent.title}`}>
              {title}
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
