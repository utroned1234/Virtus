'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as echarts from 'echarts'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

// Types
interface Candle {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
}

// Order Book Mock Data Generator
const generateOrderBook = (price: number) => {
    if (!price) return { asks: [], bids: [] }
    const asks = [], bids = []
    const spread = price * 0.0001
    for (let i = 0; i < 6; i++) {
        asks.push({ price: price + spread * (i + 1), amount: (Math.random() * 2).toFixed(2), total: (Math.random() * 10).toFixed(2) })
        bids.push({ price: price - spread * (i + 1), amount: (Math.random() * 2).toFixed(2), total: (Math.random() * 10).toFixed(2) })
    }
    return { asks: asks.reverse(), bids }
}

export default function ChartPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pair = searchParams.get('pair') || 'BTC/USDT'
    const symbol = pair.replace('/', '').toLowerCase()

    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)

    const [currentPrice, setCurrentPrice] = useState<number>(0)
    const [stats, setStats] = useState({ high: 0, low: 0, vol: 0, change: 0 })
    const [ws, setWs] = useState<WebSocket | null>(null)

    // Initialize Chart
    useEffect(() => {
        if (!chartRef.current) return

        // Init ECharts
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current)
        }

        // Fetch Historical Data
        const fetchHistory = async () => {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=15m&limit=100`)
                const data = await res.json()
                const candles = data.map((d: any) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    close: parseFloat(d[4]),
                    lowest: parseFloat(d[3]),
                    highest: parseFloat(d[2]),
                    volume: parseFloat(d[5])
                }))

                // Set Stats from last candle approx
                const last = candles[candles.length - 1]
                setCurrentPrice(last.close)

                // Basic options
                const option = {
                    backgroundColor: '#161A1E',
                    grid: { left: 5, right: 40, bottom: 20, top: 10, containLabel: false },
                    xAxis: {
                        type: 'category',
                        data: candles.map((c: any) => new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { color: '#848E9C', fontSize: 10 }
                    },
                    yAxis: {
                        scale: true,
                        position: 'right',
                        axisLine: { show: false },
                        splitLine: { show: true, lineStyle: { color: '#2B3139', type: 'dashed' } },
                        axisLabel: { color: '#848E9C', fontSize: 10, inside: true, margin: 0, verticalAlign: 'bottom' }
                    },
                    series: [
                        {
                            type: 'candlestick',
                            data: candles.map((c: any) => [c.open, c.close, c.lowest, c.highest]),
                            itemStyle: {
                                color0: '#F6465D',
                                color: '#0ECB81',
                                borderColor0: '#F6465D',
                                borderColor: '#0ECB81'
                            }
                        }
                    ]
                }
                chartInstance.current?.setOption(option)
            } catch (e) {
                console.error(e)
            }
        }

        fetchHistory()

        // Resize listener
        const handleResize = () => chartInstance.current?.resize()
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chartInstance.current?.dispose()
            chartInstance.current = null
        }
    }, [symbol])

    // WebSocket for Price Ticker & 24hr Stats
    useEffect(() => {
        // 24hr Ticker
        const wsTicker = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`)
        wsTicker.onmessage = (e) => {
            const d = JSON.parse(e.data)
            setCurrentPrice(parseFloat(d.c))
            setStats({
                high: parseFloat(d.h),
                low: parseFloat(d.l),
                vol: parseFloat(d.v),
                change: parseFloat(d.P)
            })
        }

        return () => { wsTicker.close() }
    }, [symbol])


    const { asks, bids } = generateOrderBook(currentPrice)

    return (
        <div className="min-h-screen bg-[#161A1E] text-[#EAECEF] font-sans pb-20 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-[#161A1E] border-b border-[#2B3139]">
                <ArrowLeft size={20} className="text-[#EAECEF]" onClick={() => router.back()} />
                <div className="flex items-center gap-1">
                    <span className="text-base font-bold">{pair} Perpetual</span>
                    <ChevronDown size={14} className="text-[#848E9C]" />
                </div>
                <div className="w-5"></div> {/* Spacer */}
            </div>

            {/* Stats Row */}
            <div className="px-4 py-3 flex justify-between bg-[#161A1E]">
                <div>
                    <div className={`text-3xl font-bold mb-1 ${stats.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {currentPrice.toFixed(2)}
                    </div>
                    <div className="flex gap-3 text-xs font-medium">
                        <span className={stats.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                            {stats.change >= 0 ? '+' : ''}{stats.change}%
                        </span>
                        <span className="text-[#848E9C]">≈ ${currentPrice.toFixed(2)}</span>
                    </div>
                </div>
                <div className="text-[10px] text-[#848E9C] flex flex-col justify-center gap-1 text-right">
                    <div className="flex justify-end gap-2"><span>24H High</span> <span className="text-[#EAECEF]">{stats.high.toFixed(2)}</span></div>
                    <div className="flex justify-end gap-2"><span>24H Low</span> <span className="text-[#EAECEF]">{stats.low.toFixed(2)}</span></div>
                    <div className="flex justify-end gap-2"><span>24H Vol</span> <span className="text-[#EAECEF]">{stats.vol.toFixed(2)}</span></div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full bg-[#161A1E] relative border-b border-[#2B3139]">
                {/* Chart Controls Overlay */}
                <div className="absolute top-2 left-4 z-10 flex gap-4 text-[10px] font-bold text-[#848E9C]">
                    <span className="text-[#EAECEF]">Line</span>
                    <span className="text-[#EAECEF]">15m</span>
                    <span>1H</span>
                    <span>4H</span>
                    <span>1D</span>
                    <span className="flex items-center gap-0.5">More <ChevronDown size={8} /></span>
                </div>
                <div ref={chartRef} className="w-full h-[350px]"></div>
            </div>

            {/* Order Book Section */}
            <div className="flex-1 bg-[#161A1E]">
                {/* Tabs */}
                <div className="flex border-b border-[#2B3139]">
                    <div className="px-4 py-3 text-sm font-bold text-[#EAECEF] border-b-2 border-[#0ECB81]">Entrusted order</div>
                    <div className="px-4 py-3 text-sm font-bold text-[#848E9C]">Last trades</div>
                </div>

                {/* List */}
                <div className="p-2">
                    <div className="flex justify-between text-[10px] text-[#848E9C] mb-2 px-2">
                        <div className="flex gap-10">
                            <span>Buy</span>
                            <span>Amount</span>
                        </div>
                        <div className="flex gap-4">
                            <span>Price(USDT)</span>
                        </div>
                        <div className="flex gap-10 justify-end">
                            <span>Amount</span>
                            <span>Sell</span>
                        </div>
                    </div>

                    {/* Visual Order Book (Center based) */}
                    <div className="space-y-1 relative">
                        {asks.slice(0, 6).map((ask, i) => (
                            <div key={i} className="grid grid-cols-2 gap-4 text-[11px] h-5 items-center px-1">
                                {/* Left Side (Buy - fake empty for symmetry in this view or filled?) 
                            Actually the image shows a central spine of price.
                            Buy items on left, Sell items on right.
                            Let's mimic the image: 
                            Col 1: Buy Index (1, 2, 3)
                            Col 2: Buy Amount
                            Col 3: Price (Green/Red)
                            Col 4: Sell Amount
                            Col 5: Sell Index
                         */}
                                {/* Simplified for now: Just show Price in middle, Buy Amounts Left, Sell Amounts Right */}
                                <div className="flex justify-between items-center pr-2 border-r border-[#2B3139]/30">
                                    <span className="text-[#848E9C] w-4">{i + 1}</span>
                                    <span className="text-[#EAECEF]">{bids[i] ? bids[i].amount : '-'}</span>
                                    <span className="text-[#0ECB81] font-bold">{bids[i] ? bids[i].price.toFixed(2) : '-'}</span>
                                </div>
                                <div className="flex justify-between items-center pl-2">
                                    <span className="text-[#F6465D] font-bold text-right flex-1">{asks[i].price.toFixed(2)}</span>
                                    <span className="text-[#EAECEF] text-right w-16">{asks[i].amount}</span>
                                    <span className="text-[#848E9C] w-4 text-right">{i + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#161A1E] border-t border-[#2B3139] flex gap-3 z-50">
                <button
                    className="flex-1 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-bold py-3 rounded-lg text-sm"
                    onClick={() => router.push(`/futuros?pair=${pair}&side=CALL`)}
                >
                    Buy Long
                </button>
                <button
                    className="flex-1 bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold py-3 rounded-lg text-sm"
                    onClick={() => router.push(`/futuros?pair=${pair}&side=PUT`)}
                >
                    Buy Short
                </button>
            </div>

        </div>
    )
}
