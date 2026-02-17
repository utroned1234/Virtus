'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface Ticker {
    symbol: string
    priceChangePercent: string
    lastPrice: string
    quoteVolume: string
    name?: string
}

export type MarketCategory = 'favorites' | 'crypto' | 'futures' | 'forex' | 'indices' | 'stocks' | 'commodities'

const LS_KEY = 'virtus_market_list_cache'

function loadFromStorage(cat: string): Ticker[] {
    try {
        const raw = localStorage.getItem(`${LS_KEY}_${cat}`)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
}

function saveToStorage(cat: string, data: Ticker[]) {
    try { localStorage.setItem(`${LS_KEY}_${cat}`, JSON.stringify(data)) } catch { }
}

export default function MarketList({ category }: { category: MarketCategory }) {
    const { t } = useLanguage()
    const [data, setData] = useState<Ticker[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(false)

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
        // Mostrar caché inmediatamente mientras carga (solo para crypto/futures)
        if (!['stocks', 'indices'].includes(category)) {
            const cached = loadFromStorage(category)
            if (cached.length > 0) {
                setData(cached)
                setLoading(false)
                setFetchError(false)
            }
        }
        setLoading(true)
        setFetchError(false)
        fetchMarketData()
        const interval = setInterval(fetchMarketData, 60_000) // 60s respeta rate limit
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

            const res = await fetch(`/api/market?type=${type}`)
            if (res.ok) {
                const result = await res.json()
                if (!Array.isArray(result)) {
                    setFetchError(true)
                    return
                }
                let filtered: Ticker[] = []

                if (category === 'crypto') {
                    filtered = result.filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('DOWN') && !t.symbol.includes('UP'))
                } else if (category === 'futures') {
                    filtered = result.filter((t: any) => t.symbol.endsWith('USDT'))
                } else if (category === 'forex') {
                    const forexPairs = ['EURUSDT', 'GBPUSDT', 'AUDUSDT', 'NZDUSDT', 'USDCUSDT']
                    filtered = result.filter((t: any) => forexPairs.includes(t.symbol))
                } else if (category === 'commodities') {
                    const commPairs = ['PAXGUSDT']
                    filtered = result.filter((t: any) => commPairs.includes(t.symbol))
                } else {
                    filtered = result.slice(0, 20)
                }

                if (filtered.length > 0) {
                    setData(filtered)
                    saveToStorage(category, filtered)
                }
                setFetchError(false)
            } else {
                // Intenta cargar caché si la API falló
                const cached = loadFromStorage(category)
                if (cached.length > 0) { setData(cached); setFetchError(false) }
                else setFetchError(true)
            }
        } catch (error) {
            console.error('Error fetching market data:', error)
            const cached = loadFromStorage(category)
            if (cached.length > 0) { setData(cached); setFetchError(false) }
            else setFetchError(true)
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
            <div className="grid grid-cols-3 text-[10px] text-white/40 px-3 py-2 uppercase tracking-wider sticky top-[56px] bg-[#060B10] z-20 border-b border-white/5">
                <div className="text-left">{t('mercado.asset')}</div>
                <div className="text-right pr-2">{t('mercado.price')}</div>
                <div className="text-right">24h</div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/30 space-y-3">
                    <div className="w-6 h-6 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs animate-pulse">{t('mercado.loading')}</span>
                </div>
            ) : fetchError ? (
                <div className="py-16 flex flex-col items-center justify-center text-white/30 space-y-3">
                    <span className="text-2xl">📡</span>
                    <span className="text-xs text-center px-6">{t('mercado.noConnection').split('\n').map((line, i) => i === 0 ? line : <><br key={i} />{line}</>)}</span>
                </div>
            ) : (
                <div className="space-y-0">
                    {data.length === 0 ? (
                        <div className="py-10 text-center text-white/30 text-xs">{t('mercado.noData')}</div>
                    ) : (data.map((item) => {
                        const change = parseFloat(item.priceChangePercent)
                        const isPositive = change >= 0
                        const symbol = item.name || item.symbol.replace('USDT', '')

                        return (
                            <div key={item.symbol} className="grid grid-cols-3 items-center py-3 px-3 active:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.03] group">
                                {/* Left: Pair + Vol */}
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                        {['stocks', 'indices'].includes(category) ? (
                                            <TrendingUp className="w-3.5 h-3.5 text-white/50" />
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
                                        <span className="text-xs font-bold text-white truncate block">{symbol}</span>
                                        <div className="text-[9px] text-white/30 font-mono">
                                            {formatVolume(item.quoteVolume)}
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Price */}
                                <div className="text-right pr-2">
                                    <div className={`text-xs font-medium font-mono ${isPositive ? 'text-[#34D399]' : 'text-white'}`}>
                                        {parseFloat(item.lastPrice).toFixed(item.lastPrice.startsWith('0.0') ? 5 : 2)}
                                    </div>
                                </div>

                                {/* Right: Change Badge */}
                                <div className="flex justify-end">
                                    <div className={`w-[60px] py-1 rounded-[4px] flex items-center justify-center text-[10px] font-bold text-white ${isPositive ? 'bg-[#34D399]' : 'bg-[#F87171]'}`}>
                                        {isPositive ? '+' : ''}{change.toFixed(2)}%
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
