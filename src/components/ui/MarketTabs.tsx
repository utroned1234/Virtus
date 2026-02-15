'use client'

import { useEffect, useState } from 'react'

interface Ticker {
    symbol: string
    priceChangePercent: string
    lastPrice: string
    quoteVolume: string
}

type Tab = 'change' | 'losers' | 'turnover'

export default function MarketTabs() {
    const [data, setData] = useState<Ticker[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('change')

    useEffect(() => {
        fetchMarketData()
        const interval = setInterval(fetchMarketData, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [])

    const fetchMarketData = async () => {
        try {
            const res = await fetch('/api/market')
            if (res.ok) {
                const result = await res.json()
                if (!Array.isArray(result)) return
                const usdtPairs = result.filter((t: Ticker) => t.symbol.endsWith('USDT') && !t.symbol.includes('UP') && !t.symbol.includes('DOWN'))
                setData(usdtPairs)
            }
        } catch (error) {
            console.error('Error fetching market data:', error)
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
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
        return v.toFixed(2)
    }

    const formatSymbol = (symbol: string) => {
        return symbol.replace('USDT', ' / USDT')
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
                    <div className="text-right pr-4">Precio</div>
                    <div className="text-right">{activeTab === 'turnover' ? 'Volumen' : '24h Cambio'}</div>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-white/30 text-xs animate-pulse">Cargando mercado...</div>
                ) : (
                    <div className="space-y-1">
                        {displayData.map((item) => {
                            const change = parseFloat(item.priceChangePercent)
                            const isPositive = change >= 0

                            return (
                                <div key={item.symbol} className="grid grid-cols-3 items-center py-2.5 px-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/5 p-1 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={getIconUrl(item.symbol)}
                                                alt={item.symbol}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    // Fallback to text if image fails
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.parentElement!.innerText = item.symbol[0]
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-white group-hover:text-[#34D399] transition-colors">{item.symbol.replace('USDT', '')}</span>
                                        <span className="text-[9px] text-white/30 hidden sm:inline">/ USDT</span>
                                    </div>

                                    <div className="text-right pr-4 font-mono text-xs text-white/90">
                                        {parseFloat(item.lastPrice).toFixed(item.lastPrice.startsWith('0.0') ? 6 : 2)}
                                    </div>

                                    <div className="flex justify-end">
                                        {activeTab === 'turnover' ? (
                                            <span className="text-xs font-medium text-white/60">{formatVolume(item.quoteVolume)}</span>
                                        ) : (
                                            <div className={`w-16 py-1 rounded text-center text-[10px] font-bold ${isPositive ? 'bg-[#34D399]/20 text-[#34D399]' : 'bg-red-500/20 text-red-500'}`}>
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
