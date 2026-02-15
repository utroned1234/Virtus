import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeProvider } from '@/context/ThemeContext'
import { LanguageProvider } from '@/context/LanguageContext'
import GlassBackground from '@/components/ui/GlassBackground'

export const viewport: Viewport = {
  themeColor: '#34D399',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}


export const metadata: Metadata = {
  title: 'VIRTUS',
  description: 'Plataforma VIRTUS Premium - Sistema de Inversión',
  icons: {
    icon: [
      {
        url: '/icon.png',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-icon.png',
        type: 'image/png',
      },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VIRTUS App',
  },
}


// Iniciar cron jobs solo si esta habilitado por entorno
if (typeof window === 'undefined' && process.env.ENABLE_INTERNAL_CRON === 'true') {
  import('@/lib/cron').then(({ startPurchaseVerificationCron }) => {
    startPurchaseVerificationCron()
  })
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-outfit text-text-primary antialiased">
        <ToastProvider>
          <ThemeProvider>
            <LanguageProvider>
              {/* Fondo de cristal moderno */}
              <GlassBackground />

              <div className="min-h-screen relative z-10">
                <main className="pb-20">
                  {children}
                </main>
              </div>
            </LanguageProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  )
}

