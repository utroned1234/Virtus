'use client'

import { useState, useRef, useEffect } from 'react'

interface Country {
  code: string
  name: string
}

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  countries: Country[]
  placeholder?: string
}

export default function CountrySelect({
  value,
  onChange,
  countries,
  placeholder = '— Selecciona —',
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCountry = countries.find((c) => c.code === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFlagUrl = (code: string) => {
    if (code === 'OTHER') return '🌍'
    return `https://flagcdn.com/w20/${code.toLowerCase()}.png`
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-dark-card border border-jade/20 rounded-btn px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold flex items-center justify-between"
        style={{ background: '#0D1F1C', color: 'white' }}
      >
        <div className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              {selectedCountry.code === 'OTHER' ? (
                <span className="text-base">🌍</span>
              ) : (
                <img
                  src={getFlagUrl(selectedCountry.code)}
                  alt={selectedCountry.name}
                  className="w-5 h-3.5 object-cover rounded-sm"
                />
              )}
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-white/60">{placeholder}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-dark-card border border-jade/20 rounded-btn max-h-60 overflow-y-auto shadow-xl"
          style={{ background: '#0D1F1C' }}
        >
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.code)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-jade/10 transition-colors ${
                value === country.code ? 'bg-jade/20' : ''
              }`}
            >
              {country.code === 'OTHER' ? (
                <span className="text-base">🌍</span>
              ) : (
                <img
                  src={getFlagUrl(country.code)}
                  alt={country.name}
                  className="w-5 h-3.5 object-cover rounded-sm"
                />
              )}
              <span className="text-sm text-white">{country.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
