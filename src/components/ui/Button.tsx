import { ButtonHTMLAttributes } from 'react'

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
  </svg>
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'whatsapp' | 'gold' | 'danger'
  isLoading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  children,
  variant = 'primary',
  isLoading = false,
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  const baseClasses = `font-semibold font-outfit transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 rounded-xl ${sizeClasses[size]}`

  const variants = {
    primary: `
      bg-gradient-to-r from-primary to-primary-dark
      text-white
      shadow-glow
      hover:shadow-[0_6px_20px_rgba(16,185,129,0.45)]
      hover:-translate-y-0.5
    `,
    secondary: `
      bg-btn-secondary-bg
      text-btn-secondary-text
      border border-btn-secondary-border
      hover:bg-primary/10
    `,
    outline: `
      border-2 border-primary
      text-primary
      hover:bg-primary/5
    `,
    gold: `
      bg-gradient-to-r from-gold to-gold-dark
      text-white
      shadow-glow-gold
      hover:shadow-[0_6px_20px_rgba(251,191,36,0.45)]
      hover:-translate-y-0.5
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600
      text-white
      shadow-[0_4px_14px_rgba(239,68,68,0.3)]
      hover:-translate-y-0.5
    `,
    whatsapp: `
      bg-gradient-to-r from-whatsapp to-whatsapp-hover
      text-white
      shadow-[0_4px_14px_rgba(37,211,102,0.3)]
      hover:-translate-y-0.5
    `
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className} flex items-center justify-center gap-2`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <LoaderIcon className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
