'use client'

import { useEffect, useState, useRef } from 'react'
import * as echarts from 'echarts'
import {
  ArrowUp,
  ArrowDown,
  Wallet,
  Activity,
  Menu,
  ChevronDown,
  Plus,
  Minus,
  Calculator,
  CandlestickChart,
  ArrowLeftRight,
  MoreHorizontal,
  FileText,
  CheckCircle2
} from 'lucide-react'
import BottomNav from '../../components/ui/BottomNav'
import { useLanguage } from '@/context/LanguageContext'

// --- Types ---
interface TradeOrder {
  id: number | string
  type: 'CALL' | 'PUT'
  pair: string
  amount: number
  leverage: number
  entryPrice: number
  exitPrice?: number
  startTime: string
  status: 'ACTIVE' | 'WIN' | 'LOSS' | 'DRAW'
  tp: number | null
  sl: number | null
  pnl: number
  closeReason?: string
  signalId?: string | null
  autoCloseAt?: string | null
  capitalBefore?: number
  gainTotal?: number
}

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// --- Constants ---
const PAIRS = [
  'BTC/USDT', 'XRP/USDT', 'LINK/USDT', 'DOT/USDT',
  'DOGE/USDT', 'ETH/USDT', 'DASH/USDT', 'BCH/USDT',
  'FIL/USDT', 'LTC/USDT', 'ZEC/USDT', 'BNB/USDT',
  'SOL/USDT', 'ADA/USDT'
]

export default function FuturosPage() {
  const { t } = useLanguage()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  // WebSocket Refs
  const wsKline = useRef<WebSocket | null>(null)
  const wsTrade = useRef<WebSocket | null>(null)

  // -- State --
  const [currentPair, setCurrentPair] = useState('BTC/USDT')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [candleData, setCandleData] = useState<Candle[]>([])

  // User Data
  const [balance, setBalance] = useState<number>(1000)
  const [activeOrders, setActiveOrders] = useState<TradeOrder[]>([])
  const [historyOrders, setHistoryOrders] = useState<TradeOrder[]>([])

  // UI State
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'bots'>('positions')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingType, setPendingType] = useState<'CALL' | 'PUT' | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  // Inputs
  const [tradeAmount, setTradeAmount] = useState<number>(0)
  const [tradePrice, setTradePrice] = useState<string>('')
  const [tradeLeverage, setTradeLeverage] = useState<number>(20)
  const [orderType, setOrderType] = useState('Limit')
  const [sliderValue, setSliderValue] = useState(0)
  const [isCross, setIsCross] = useState(true)

  // Checkboxes
  const [tpSl, setTpSl] = useState(false)
  const [reduceOnly, setReduceOnly] = useState(false)

  // --- Persistence Effect & Real Balance ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('joy_history_orders')
    if (savedHistory) setHistoryOrders(JSON.parse(savedHistory))

    const fetchBalance = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (!token) return
        const res = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setBalance(data.balance)
        }
      } catch (error) { console.error(error) }
    }

    const fetchActiveOrders = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (!token) return
        const res = await fetch('/api/futuros/order', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          const mappedOrders: TradeOrder[] = data.orders.map((o: any) => ({
            id: o.id,
            type: o.type as 'CALL' | 'PUT',
            pair: o.pair,
            amount: o.amount_bs,
            leverage: o.leverage,
            entryPrice: o.entry_price,
            startTime: new Date(o.created_at).toLocaleTimeString(),
            status: 'ACTIVE',
            tp: o.tp || null,
            sl: o.sl || null,
            pnl: o.signal_id ? o.pnl_bs || 0 : 0,
            signalId: o.signal_id || null,
          }))
          setActiveOrders(mappedOrders)
        }
      } catch (error) { console.error(error) }
    }

    fetchBalance()
    fetchActiveOrders()
  }, [])

  // --- WebSocket & Data ---
  const getBinanceSymbol = (p: string) => p.replace('/', '').toLowerCase()

  useEffect(() => {
    const symbol = getBinanceSymbol(currentPair)

    const init = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=1m&limit=50`)
        const data = await res.json()
        const candles = data.map((d: any) => ({
          time: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }))
        setCandleData(candles)
        if (candles.length > 0) {
          const price = candles[candles.length - 1].close
          setCurrentPrice(price)
          setTradePrice(price.toString())
        }
      } catch (e) { console.error(e) }
    }
    init()

    if (wsTrade.current) wsTrade.current.close()
    wsTrade.current = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@aggTrade`)
    wsTrade.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const price = parseFloat(msg.p)
      setCurrentPrice(price)
    }

    return () => { if (wsTrade.current) wsTrade.current.close() }
  }, [currentPair])


  // --- Trading Logic ---
  const placeOrder = async (type: 'CALL' | 'PUT') => {
    if (balance < tradeAmount) return alert(t('futuros.insufficientBalance'))
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
      const res = await fetch('/api/futuros/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          pair: currentPair,
          amount: tradeAmount,
          leverage: tradeLeverage,
          entryPrice: currentPrice
        })
      })
      if (res.ok) {
        const data = await res.json()
        const newOrder: TradeOrder = {
          id: data.order.id, type, pair: currentPair, amount: tradeAmount, leverage: tradeLeverage,
          entryPrice: currentPrice, startTime: new Date().toLocaleTimeString(), status: 'ACTIVE',
          pnl: 0, tp: null, sl: null
        }
        setActiveOrders([newOrder, ...activeOrders])
        setBalance(prev => prev - tradeAmount)
        setShowConfirm(false)
      } else { alert(t('futuros.errorOpening')) }
    } catch { alert(t('futuros.errorConnection')) }
  }

  // --- UI Helpers ---
  const priceChangePercent = ((candleData.length > 0 ? (currentPrice - candleData[0].open) / candleData[0].open : 0) * 100).toFixed(2)
  const isPositive = parseFloat(priceChangePercent) >= 0

  const generateOrderBook = (price: number) => {
    if (!price) return { asks: [], bids: [] }
    const asks = [], bids = []
    const spread = price * 0.0001
    for (let i = 0; i < 7; i++) {
      asks.push({ price: price + spread * (i + 1), amount: (Math.random() * 0.5).toFixed(3) })
      bids.push({ price: price - spread * (i + 1), amount: (Math.random() * 0.5).toFixed(3) })
    }
    return { asks: asks.reverse(), bids }
  }
  const { asks, bids } = generateOrderBook(currentPrice)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    setSliderValue(val)
    setTradeAmount(Math.floor((balance * val) / 100))
  }


  return (
    <div className="min-h-screen bg-[#161A1E] text-[#EAECEF] font-sans pb-20 text-sm">

      {/* Top Navigation */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#161A1E] text-[#848E9C] text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
        <span className="text-[#EAECEF] font-bold text-base">USDⓈ-M</span>
        <span>COIN-M</span>
        <span>{t('futuros.options')}</span>
        <span>Smart Money</span>
        <div className="ml-auto" onClick={() => setShowSidebar(true)}><Menu className="text-[#848E9C]" size={20} /></div>
      </div>

      {/* Pair Header */}
      <div className="px-4 py-2 flex justify-between items-center bg-[#161A1E]">
        <div className="flex items-center gap-2" onClick={() => setShowSidebar(true)}>
          <div className="flex items-center gap-1">
            <span className="text-[#EAECEF] text-xl font-bold">{currentPair.replace('/', '')}</span>
            <span className="bg-[#2B3139] text-[#848E9C] text-[10px] px-1 rounded-sm">Perp</span>
          </div>
          <div className={`text-xs font-medium ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isPositive ? '+' : ''}{priceChangePercent}%
          </div>
        </div>
        <div className="flex gap-4 text-[#848E9C]">
          <CandlestickChart size={20} />
          <ArrowLeftRight size={20} />
          <MoreHorizontal size={20} />
        </div>
      </div>

      {/* Funding & Countdown */}
      <div className="px-4 flex gap-4 text-[10px] text-[#848E9C] mb-2">
        <div className="flex-1 flex justify-between border-r border-[#2B3139] pr-2">
          <span>{t('futuros.funding')}</span>
          <span className="text-[#F0B90B]">0.0100% / 03:22:45</span>
        </div>
      </div>


      {/* Main Grid: Order Book & Form */}
      <div className="grid grid-cols-12 gap-0 px-2">

        {/* Left: Order Book */}
        <div className="col-span-5 pr-1">
          <div className="flex justify-between text-[10px] text-[#848E9C] mb-1">
            <span>{t('futuros.price')}</span>
            <span>{t('futuros.amount')}</span>
          </div>
          <div className="flex flex-col gap-[1px]">
            {asks.map((ask, i) => (
              <div key={`ask-${i}`} className="flex justify-between text-xs relative h-5 items-center">
                <span className="text-[#F6465D] z-10">{ask.price.toFixed(1)}</span>
                <span className="text-[#EAECEF] z-10">{ask.amount}</span>
                <div className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10 transition-all duration-300" style={{ width: `${Math.random() * 60}%` }}></div>
              </div>
            ))}
          </div>

          <div className={`text-lg font-bold text-center py-2 ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {currentPrice.toFixed(1)}
            <div className="text-[10px] text-[#848E9C] font-normal">≈ ${currentPrice.toFixed(1)}</div>
          </div>

          <div className="flex flex-col gap-[1px]">
            {bids.map((bid, i) => (
              <div key={`bid-${i}`} className="flex justify-between text-xs relative h-5 items-center">
                <span className="text-[#0ECB81] z-10">{bid.price.toFixed(1)}</span>
                <span className="text-[#EAECEF] z-10">{bid.amount}</span>
                <div className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10 transition-all duration-300" style={{ width: `${Math.random() * 60}%` }}></div>
              </div>
            ))}
          </div>

          {/* Depth Bar */}
          <div className="mt-2 flex h-1 rounded overflow-hidden">
            <div className="bg-[#0ECB81] w-[63%]"></div>
            <div className="bg-[#F6465D] w-[37%]"></div>
          </div>
          <div className="flex justify-between text-[10px] text-[#848E9C] mt-1">
            <span>63,29%</span>
            <span>36,71%</span>
          </div>
        </div>

        {/* Right: Order Form */}
        <div className="col-span-7 pl-2">
          {/* Mode Buttons */}
          <div className="flex gap-1 mb-3">
            <button className="bg-[#2B3139] text-[#EAECEF] text-[10px] font-bold py-1 px-3 rounded flex-1">{t('futuros.crossed')}</button>
            <button className="bg-[#2B3139] text-[#EAECEF] text-[10px] font-bold py-1 px-3 rounded flex-1">{tradeLeverage}x</button>
            <button className="bg-[#2B3139] text-[#EAECEF] text-[10px] font-bold py-1 px-3 rounded">S</button>
          </div>

          <div className="flex justify-between text-[10px] text-[#848E9C] mb-1">
            <span>{t('futuros.available')}</span>
            <span className="text-[#EAECEF] flex items-center gap-1">{balance.toFixed(2)} USDT <Plus size={10} className="bg-[#FCD535] text-black rounded-full p-[1px]" /></span>
          </div>

          {/* Order Type */}
          <div className="bg-[#2B3139] rounded px-3 py-2 mb-2 flex justify-between items-center">
            <span className="text-[#EAECEF] text-xs font-bold">{orderType}</span>
            <ChevronDown size={14} className="text-[#848E9C]" />
          </div>

          {/* Price Input */}
          <div className="flex items-center bg-[#2B3139] rounded mb-2">
            <button className="p-3 text-[#848E9C]" onClick={() => setTradePrice((parseFloat(tradePrice) - 1).toFixed(1))}><Minus size={14} /></button>
            <div className="flex-1 text-center">
              {orderType === 'Market' ? (
                <span className="text-[#848E9C] text-xs">{t('futuros.marketPrice')}</span>
              ) : (
                <input
                  className="bg-transparent text-center text-[#EAECEF] text-sm font-bold w-full outline-none"
                  value={tradePrice}
                  onChange={e => setTradePrice(e.target.value)}
                />
              )}
              {orderType !== 'Market' && <div className="text-[9px] text-[#848E9C]">{t('futuros.priceUsdt')}</div>}
            </div>
            <button className="p-3 text-[#848E9C]" onClick={() => setTradePrice((parseFloat(tradePrice) + 1).toFixed(1))}><Plus size={14} /></button>
          </div>

          {/* Amount Input */}
          <div className="flex items-center bg-[#2B3139] rounded mb-2">
            <button className="p-3 text-[#848E9C]" onClick={() => setTradeAmount(Math.max(0, tradeAmount - 10))}><Minus size={14} /></button>
            <div className="flex-1 text-center py-1">
              <input
                className="bg-transparent text-center text-[#EAECEF] text-sm font-bold w-full outline-none"
                value={tradeAmount}
                onChange={e => setTradeAmount(parseFloat(e.target.value))}
                placeholder={t('futuros.amount')}
              />
              <div className="text-[9px] text-[#848E9C]">{t('futuros.amountUsdt')}</div>
            </div>
            <button className="p-3 text-[#848E9C]" onClick={() => setTradeAmount(tradeAmount + 10)}><Plus size={14} /></button>
          </div>

          {/* Diamond Slider */}
          <div className="relative h-6 mb-4 flex items-center px-1">
            <div className="absolute left-0 right-0 h-[2px] bg-[#2B3139]"></div>
            <div className="absolute left-0 h-[2px] bg-[#EAECEF]" style={{ width: `${sliderValue}%` }}></div>
            {[0, 25, 50, 75, 100].map((step) => (
              <div
                key={step}
                className={`absolute w-3 h-3 rotate-45 border-2 z-10 transition-colors ${sliderValue >= step ? 'bg-[#EAECEF] border-[#EAECEF]' : 'bg-[#161A1E] border-[#848E9C]'}`}
                style={{ left: `calc(${step}% - 6px)` }}
                onClick={() => { setSliderValue(step); setTradeAmount(Math.floor((balance * step) / 100)) }}
              ></div>
            ))}
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-center gap-2 text-[10px] text-[#848E9C]">
              <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${tpSl ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848E9C]'}`} onClick={() => setTpSl(!tpSl)}>
                {tpSl && <CheckCircle2 size={10} className="text-black" />}
              </div>
              TP/SL
            </label>
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-[10px] text-[#848E9C]">
                <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${reduceOnly ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#848E9C]'}`} onClick={() => setReduceOnly(!reduceOnly)}>
                  {reduceOnly && <CheckCircle2 size={10} className="text-black" />}
                </div>
                Reduce only
              </label>
              <span className="text-[10px] text-[#848E9C] flex items-center gap-1">GTC <ChevronDown size={10} /></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setPendingType('CALL'); setShowConfirm(true) }}
              className="flex-1 bg-[#0ECB81] py-2 rounded text-white font-bold text-sm"
            >
              {t('futuros.buy')}
              <div className="text-[9px] font-normal opacity-80">Long</div>
            </button>
            <button
              onClick={() => { setPendingType('PUT'); setShowConfirm(true) }}
              className="flex-1 bg-[#F6465D] py-2 rounded text-white font-bold text-sm"
            >
              {t('futuros.sell')}
              <div className="text-[9px] font-normal opacity-80">Short</div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="mt-4 border-t-4 border-[#0B0E11]">
        <div className="flex text-sm text-[#848E9C] font-bold border-b border-[#2B3139]">
          <div
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-3 border-b-2 transition-colors ${activeTab === 'positions' ? 'text-[#EAECEF] border-[#F0B90B]' : 'border-transparent'}`}
          >
            {t('futuros.positions')} ({activeOrders.length})
          </div>
          <div
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 border-b-2 transition-colors ${activeTab === 'orders' ? 'text-[#EAECEF] border-[#F0B90B]' : 'border-transparent'}`}
          >
            {t('futuros.openOrders')} ({historyOrders.length})
          </div>
          <div
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-3 border-b-2 transition-colors ${activeTab === 'bots' ? 'text-[#EAECEF] border-[#F0B90B]' : 'border-transparent'}`}
          >
            {t('futuros.bots')}
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-10 text-[#5E6673]">
        <FileText size={40} className="mb-2 opacity-20" />
        <span className="text-sm">{t('futuros.noPosition')}</span>
      </div>

      {/* Bottom Sheet Trigger */}
      <div className="fixed bottom-16 left-0 right-0 py-2 border-t border-[#2B3139] bg-[#161A1E] text-center text-xs text-[#848E9C] flex items-center justify-center gap-2">
        {t('futuros.chartLabel').replace('{{pair}}', currentPair.replace('/', ''))}
        <ArrowUp size={12} />
      </div>

      {/* --- Modals --- */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSidebar(false)}></div>
          <div className="relative bg-[#1E2329] w-3/4 max-w-xs h-full p-4 flex flex-col">
            <h2 className="text-xl font-bold text-[#EAECEF] mb-4">{t('futuros.markets')}</h2>
            <div className="space-y-2 overflow-y-auto flex-1">
              {PAIRS.map(pair => (
                <button
                  key={pair}
                  onClick={() => { setCurrentPair(pair); setShowSidebar(false) }}
                  className={`w-full text-left py-3 px-4 rounded ${currentPair === pair ? 'bg-[#2B3139] text-[#F0B90B]' : 'text-[#EAECEF]'}`}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[#1E2329] p-6 rounded-lg w-3/4">
          <h3 className="text-lg font-bold mb-4">{t('futuros.confirmOrder')}</h3>
          <p className="mb-4 text-sm text-[#848E9C]">{t('futuros.confirmText').replace('{{type}}', pendingType === 'CALL' ? 'LONG' : 'SHORT').replace('{{amount}}', String(tradeAmount)).replace('{{pair}}', currentPair)}</p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 bg-[#2B3139] rounded">{t('common.cancel')}</button>
            <button onClick={() => placeOrder(pendingType!)} className="flex-1 py-2 bg-[#F0B90B] text-black font-bold rounded">{t('common.confirm')}</button>
          </div>
        </div>
      </div>}

      <BottomNav />
    </div>
  )
}
