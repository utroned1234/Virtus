'use client'

import { useState } from 'react'
import BottomNav from '@/components/ui/BottomNav'
import MarketList, { MarketCategory } from '@/components/market/MarketList'
import { Search, Menu, X, ChevronRight } from 'lucide-react'

export default function MercadoPage() {
  const [category, setCategory] = useState<MarketCategory>('crypto')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const categories: { id: MarketCategory; label: string }[] = [
    { id: 'crypto', label: 'Criptos' },
    { id: 'futures', label: 'Futuros' },
    { id: 'forex', label: 'Divisas' },
    { id: 'indices', label: 'Índices' },
    { id: 'stocks', label: 'Acciones' },
    { id: 'commodities', label: 'Materias Primas' },
  ]

  const handleCategorySelect = (id: MarketCategory) => {
    setCategory(id)
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#060B10] text-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#060B10]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-screen-xl mx-auto">
          {/* Header with Search */}
          <div className="px-4 h-[56px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-white tracking-wide">
                {categories.find(c => c.id === category)?.label}
              </h1>
            </div>
            <button className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[280px] h-full bg-[#0D1F1C] border-r border-white/5 shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Mercados</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${category === cat.id
                    ? 'bg-white/5 text-[#34D399]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  {category === cat.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="pt-[56px]">
        <MarketList category={category} />
      </div>

      <BottomNav />
    </div>
  )
}
