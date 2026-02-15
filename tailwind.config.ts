import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fondo App - Jade Esmeralda
        background: '#0A1A1A',
        'bg-secondary': '#122524',
        'bg-accent': '#1A3D38',
        'dark-bg': '#0A1A1A',
        'dark-card': '#0D1F1C',

        // Text Colors
        'text-primary': '#1A2E2B',
        'text-secondary': '#6B8A85',
        'text-on-dark': '#FFFFFF',
        'text-accent': '#10B981',
        'text-muted': '#8AABA5',

        // Primary Emerald
        'primary': '#10B981',
        'primary-dark': '#059669',
        'primary-hover': '#047857',
        'cyan-primary': '#10B981',
        'cyan-secondary': '#059669',

        // Gold/Amber Accents
        'gold': '#FBBF24',
        'gold-bright': '#FDE68A',
        'gold-dark': '#D97706',

        // Cards
        'card-bg': '#F0FDF9',
        'card-border': '#D1FAE5',

        // Inputs
        'input-bg': '#FFFFFF',
        'input-border': '#D1E7DD',

        // Buttons
        'btn-secondary-bg': '#ECFDF5',
        'btn-secondary-text': '#059669',
        'btn-secondary-border': '#A7F3D0',

        // Status
        'error': '#EF4444',
        'success': '#10B981',
        'warning': '#F59E0B',

        // Social
        'whatsapp': '#25D366',
        'whatsapp-hover': '#128C7E',

        // Jade Accent
        'jade': '#34D399',
        'jade-dark': '#059669',
        'jade-light': '#6EE7B7',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '20px',
        'btn': '12px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'soft': '0 4px 14px rgba(0, 0, 0, 0.08)',
        'glow': '0 4px 14px rgba(16, 185, 129, 0.35)',
        'glow-gold': '0 4px 14px rgba(251, 191, 36, 0.35)',
      },
      backgroundImage: {
        'gradient-app': 'linear-gradient(135deg, #0A1A1A 0%, #122524 100%)',
        'gradient-primary': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      }
    },
  },
  plugins: [],
}
export default config
