'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

interface Ticker {
    symbol: string
    priceChangePercent: string
    lastPrice: string
    quoteVolume: string
    // Optional for mock data
    name?: string
}

export type MarketCategory = 'favorites' | 'crypto' | 'futures' | 'forex' | 'indices' | 'stocks' | 'commodities'

export default function MarketList({ category }: { category: MarketCategory }) {
    const [data, setData] = useState<Ticker[]>([])
    const [loading, setLoading] = useState(true)

    // Mock data for non-crypto assets
    const mockStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', lastPrice: '185.92', priceChangePercent: '1.25', quoteVolume: '5.2B' },
        { symbol: 'TSLA', name: 'Tesla Inc.', lastPrice: '240.50', priceChangePercent: '-2.10', quoteVolume: '8.1B' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', lastPrice: '890.35', priceChangePercent: '3.45', quoteVolume: '12.5B' },
        { symbol: 'AMZN', name: 'Amazon.com', lastPrice: '175.30', priceChangePercent: '0.85', quoteVolume: '4.3B' },
        { symbol: 'MSFT', name: 'Microsoft', lastPrice: '415.20', priceChangePercent: '-0.30', quoteVolume: '3.1B' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', lastPrice: '168.45', priceChangePercent: '1.10', quoteVolume: '2.8B' },
    ]

    const mockIndices = [
        { symbol: 'SPX500', name: 'S&P 500', lastPrice: '5105.20', priceChangePercent: '0.55', quoteVolume: '25B' },
        { symbol: 'NAS100', name: 'Nasdaq 100', lastPrice: '18020.50', priceChangePercent: '1.10', quoteVolume: '18B' },
        { symbol: 'DJ30', name: 'Dow Jones', lastPrice: '39050.10', priceChangePercent: '-0.15', quoteVolume: '15B' },
        { symbol: 'DAX40', name: 'Germany 40', lastPrice: '17850.30', priceChangePercent: '0.40', quoteVolume: '8B' },
    ]

    useEffect(() => {
        setLoading(true)
        fetchMarketData()
        const interval = setInterval(fetchMarketData, 5000)
        return () => clearInterval(interval)
    }, [category])

    const fetchMarketData = async () => {
        try {
            if (category === 'stocks') {
                setData(mockStocks.map(s => ({ ...s, lastPrice: (parseFloat(s.lastPrice) * (1 + (Math.random() * 0.002 - 0.001))).toFixed(2) })))
                setLoading(false)
                return
            }
            if (category === 'indices') {
                setData(mockIndices.map(s => ({ ...s, lastPrice: (parseFloat(s.lastPrice) * (1 + (Math.random() * 0.001 - 0.0005))).toFixed(2) })))
                setLoading(false)
                return
            }

            // Real data for others
            let type = 'spot'
            if (category === 'futures') type = 'futures'

            // Reusing our proxy for real crypto data
            const res = await fetch(`/api/market?type=${type}`)
            if (res.ok) {
                const result = await res.json()
                let filtered: Ticker[] = []

                if (category === 'crypto') {
                    filtered = result.filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('DOWN') && !t.symbol.includes('UP'))
                } else if (category === 'futures') {
                    filtered = result.filter((t: any) => t.symbol.endsWith('USDT'))
                } else if (category === 'forex') {
                    const forexPairs = ['EURUSDT', 'GBPUSDT', 'AUDUSDT', 'NZDUSDT', 'USDCUSDT'] // Using USDT pairs as proxies
                    filtered = result.filter((t: any) => forexPairs.includes(t.symbol))
                } else if (category === 'commodities') {
                    const commPairs = ['PAXGUSDT'] // Gold proxy
                    filtered = result.filter((t: any) => commPairs.includes(t.symbol))
                } else {
                    // Default fallback
                    filtered = result.slice(0, 20)
                }

                setData(filtered)
            }
        } catch (error) {
            console.error('Error fetching market data:', error)
        } finally {
            setLoading(false)
        }
    }


    const formatVolume = (vol: string) => {
        if (!vol) return '0'

        // Check if vol contains 'B' or 'M' already (mock data)
        if (vol.includes('B') || vol.includes('M')) return vol

        const v = parseFloat(vol)
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
        return v.toFixed(2)
    }

    const getIconUrl = (symbol: string) => {
        let cleanSymbol = symbol.replace('USDT', '').toLowerCase()
        if (category === 'forex') {
            // Mapping for flags if needed, or generic
            return null // Fallback to text
        }
        return `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`
    }

    return (
        <div className="pb-24">
            {/* Header Columns */}
            <div className="grid grid-cols-3 text-[10px] text-white/40 px-4 py-2 uppercase tracking-wider sticky top-[56px] bg-[#060B10] z-20 border-b border-white/5">
                <div className="text-left">Activo</div>
                <div className="text-right pr-6">Precio</div>
                <div className="text-right">Cambio 24h</div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/30 space-y-3">
                    <div className="w-6 h-6 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs animate-pulse">Cargando mercado...</span>
                </div>
            ) : (
                <div className="space-y-0.5">
                    {data.length === 0 ? (
                        <div className="py-10 text-center text-white/30 text-xs">No hay datos disponibles</div>
                    ) : (data.map((item) => {
                        const change = parseFloat(item.priceChangePercent)
                        const isPositive = change >= 0
                        const symbol = item.name || item.symbol.replace('USDT', '')
                        const subtext = item.name ? item.symbol : '/ USDT'

                        return (
                            <div key={item.symbol} className="grid grid-cols-3 items-center py-3.5 px-4 active:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.03] group">
                                {/* Left: Pair + Vol */}
                                <div className="flex items-center gap-3">
                                    {/* Icon Placeholder or Image */}
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                        {['stocks', 'indices'].includes(category) ? (
                                            <TrendingUp className="w-4 h-4 text-white/50" />
                                        ) : (
                                            <img
                                                src={getIconUrl(item.symbol) || ''}
                                                alt={symbol.charAt(0)}
                                                className="w-full h-full object-contain p-1"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.parentElement!.innerText = symbol.charAt(0)
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-white truncate">{symbol}</span>
                                        </div>
                                        <div className="text-[10px] text-white/30 font-mono">
                                            VOL: {formatVolume(item.quoteVolume)}
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Price */}
                                <div className="text-right pr-6">
                                    <div className={`text-sm font-medium font-mono ${isPositive ? 'text-[#34D399]' : 'text-white'}`}>
                                        {parseFloat(item.lastPrice).toFixed(item.lastPrice.startsWith('0.0') ? 5 : 2)}
                                    </div>
                                </div>

                                {/* Right: Change Button */}
                                <div className="flex justify-end">
                                    <div className={`w-[70px] py-1.5 rounded-[4px] flex items-center justify-center gap-1 text-[11px] font-bold text-white shadow-sm transition-transform active:scale-95 ${isPositive ? 'bg-[#34D399] shadow-[0_2px_10px_rgba(52,211,153,0.2)]' : 'bg-[#F87171] shadow-[0_2px_10px_rgba(248,113,113,0.2)]'
                                        }`}>
                                        {isPositive ? '' : ''}{change.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        )
                    }))}
                </div>
            )}
        </div>
    )
}
