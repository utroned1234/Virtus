'use client'

import { useEffect, useState } from 'react'

interface Ticker {
    symbol: string
    priceChangePercent: string
    lastPrice: string
    quoteVolume: string
}

type Tab = 'change' | 'losers' | 'turnover'

const LS_KEY = 'virtus_market_cache'

function loadFromStorage(): Ticker[] {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveToStorage(data: Ticker[]) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch { /* ignore quota errors */ }
}

export default function MarketTabs() {
    const [data, setData] = useState<Ticker[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('change')

    useEffect(() => {
        // Carga inmediata desde localStorage para que no quede vacío
        const cached = loadFromStorage()
        if (cached.length > 0) {
            setData(cached)
            setLoading(false)
        }

        fetchMarketData()
        const interval = setInterval(fetchMarketData, 60_000) // cada 60s — respeta rate limit
        return () => clearInterval(interval)
    }, [])

    const fetchMarketData = async () => {
        try {
            const res = await fetch('/api/market')
            if (res.ok) {
                const result = await res.json()
                if (!Array.isArray(result)) return
                const pairs = result.filter((t: Ticker) =>
                    t.symbol.endsWith('USDT') &&
                    !t.symbol.includes('UP') &&
                    !t.symbol.includes('DOWN')
                )
                if (pairs.length > 0) {
                    setData(pairs)
                    saveToStorage(pairs)
                }
            }
        } catch (error) {
            console.error('Error fetching market data:', error)
            // Carga fallback desde localStorage si falló el fetch
            const cached = loadFromStorage()
            if (cached.length > 0 && data.length === 0) setData(cached)
        } finally {
            setLoading(false)
        }
    }

    const getSortedData = () => {
        const sorted = [...data]
        if (activeTab === 'change') {
            return sorted.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)).slice(0, 15)
        } else if (activeTab === 'losers') {
            return sorted.sort((a, b) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent)).slice(0, 15)
        } else {
            return sorted.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)).slice(0, 15)
        }
    }

    const formatVolume = (vol: string) => {
        const v = parseFloat(vol)
        if (isNaN(v)) return vol
        if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
        if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
        return v.toFixed(0)
    }

    const getIconUrl = (symbol: string) => {
        const cleanSymbol = symbol.replace('USDT', '').toLowerCase()
        return `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`
    }

    const displayData = getSortedData()

    return (
        <div className="w-full bg-[#060B10] rounded-xl overflow-hidden mt-6">
            <div className="flex border-b border-white/5">
                <button
                    onClick={() => setActiveTab('change')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'change' ? 'text-[#34D399]' : 'text-white/40 hover:text-white/70'}`}
                >
                    Top Gainers
                    {activeTab === 'change' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#34D399] rounded-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('losers')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'losers' ? 'text-[#34D399]' : 'text-white/40 hover:text-white/70'}`}
                >
                    Top Losers
                    {activeTab === 'losers' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#34D399] rounded-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('turnover')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'turnover' ? 'text-[#34D399]' : 'text-white/40 hover:text-white/70'}`}
                >
                    24h Vol
                    {activeTab === 'turnover' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#34D399] rounded-full"></div>}
                </button>
            </div>

            <div className="p-2">
                <div className="grid grid-cols-3 text-[10px] text-white/30 px-2 py-2 uppercase tracking-wider">
                    <div className="text-left">Par</div>
                    <div className="text-right pr-2">Precio</div>
                    <div className="text-right">{activeTab === 'turnover' ? 'Volumen' : '24h'}</div>
                </div>

                {loading && data.length === 0 ? (
                    <div className="py-8 text-center text-white/30 text-xs animate-pulse">Cargando mercado...</div>
                ) : data.length === 0 ? (
                    <div className="py-8 text-center text-white/30 text-xs">Sin datos de mercado</div>
                ) : (
                    <div className="space-y-0">
                        {displayData.map((item) => {
                            const change = parseFloat(item.priceChangePercent)
                            const isPositive = change >= 0

                            return (
                                <div key={item.symbol} className="grid grid-cols-3 items-center py-2.5 px-2 active:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={getIconUrl(item.symbol)}
                                                alt={item.symbol[0]}
                                                className="w-full h-full object-contain p-0.5"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.parentElement!.innerText = item.symbol[0]
                                                }}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-white group-hover:text-[#34D399] transition-colors truncate block">
                                                {item.symbol.replace('USDT', '')}
                                            </span>
                                            <span className="text-[9px] text-white/30">/ USDT</span>
                                        </div>
                                    </div>

                                    <div className="text-right pr-2 font-mono text-xs text-white/90">
                                        {parseFloat(item.lastPrice) < 0.01
                                            ? parseFloat(item.lastPrice).toFixed(6)
                                            : parseFloat(item.lastPrice).toFixed(2)}
                                    </div>

                                    <div className="flex justify-end">
                                        {activeTab === 'turnover' ? (
                                            <span className="text-xs font-medium text-white/60">{formatVolume(item.quoteVolume)}</span>
                                        ) : (
                                            <div className={`w-[58px] py-1 rounded text-center text-[10px] font-bold ${isPositive ? 'bg-[#34D399]/20 text-[#34D399]' : 'bg-red-500/20 text-red-500'}`}>
                                                {isPositive ? '+' : ''}{change.toFixed(2)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
