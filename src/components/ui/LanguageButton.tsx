'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

const LANGUAGES = [
  { code: 'en', flagCode: 'us', label: 'English' },
  { code: 'es', flagCode: 'es', label: 'Español' },
]

const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w20/${flagCode}.png`

export default function LanguageButton() {
  const pathname = usePathname()
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // No mostrar en páginas públicas
  const publicPages = ['/', '/login', '/signup']
  const isPublic = publicPages.includes(pathname)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectLanguage = (code: string) => {
    setLanguage(code as 'es' | 'en')
    setOpen(false)
  }

  if (isPublic) return <div className="w-10" />

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#00838F] hover:border-[#34D399] transition-all duration-200 overflow-hidden p-1"
        title="Change language / Cambiar idioma"
      >
        <img
          src={getFlagUrl(currentLang.flagCode)}
          alt={currentLang.label}
          className="w-full h-full object-cover rounded-full"
        />
      </button>

      {open && (
        <div
          className="absolute top-12 left-0 z-[200] w-36 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: '#0D1F1C' }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-white/10 ${
                language === lang.code ? 'bg-[#34D399]/15 text-[#34D399]' : 'text-white'
              }`}
            >
              <img
                src={getFlagUrl(lang.flagCode)}
                alt={lang.label}
                className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
              />
              <span className="font-medium">{lang.label}</span>
              {language === lang.code && <span className="ml-auto text-[#34D399] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
