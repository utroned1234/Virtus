'use client'

import { useEffect, useState, useRef } from 'react'
import * as echarts from 'echarts'
import {
  ArrowUp,
  ArrowDown,
  Wallet,
  Activity,
  X,
  Menu,
  CheckCircle2
} from 'lucide-react'
import BottomNav from '../../components/ui/BottomNav'

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

const TIMEFRAMES = [
  '60s', '120s', '5min', '10min',
  '30min', '1h', '4h', '12h', '1d'
]
const LEVERAGE = 20
const PAYOUT_RATE = 57.06

export default function FuturosPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  // WebSocket Refs
  const wsKline = useRef<WebSocket | null>(null)
  const wsTrade = useRef<WebSocket | null>(null)

  // -- State --
  const [currentPair, setCurrentPair] = useState('BTC/USDT')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [candleData, setCandleData] = useState<Candle[]>([])
  const [selectedTime, setSelectedTime] = useState('60s')

  // User Data
  const [balance, setBalance] = useState<number>(1000)
  const [activeOrders, setActiveOrders] = useState<TradeOrder[]>([])
  const [historyOrders, setHistoryOrders] = useState<TradeOrder[]>([])

  // UI State
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'code'>('active')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingType, setPendingType] = useState<'CALL' | 'PUT' | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  // Inputs
  const [tradeAmount, setTradeAmount] = useState<number>(10)
  const [tradeLeverage, setTradeLeverage] = useState<number>(20)
  const [tpValue, setTpValue] = useState<string>('')
  const [slValue, setSlValue] = useState<string>('')

  // Order type
  const [orderType, setOrderType] = useState('Market')
  const [sliderValue, setSliderValue] = useState(0)

  // Signal Trading
  const [signalCode, setSignalCode] = useState('')
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [activeSignalInfo, setActiveSignalInfo] = useState<{ id: string; code: string; label: string | null; pair: string; direction: string; created_at: string } | null>(null)
  const [alreadyExecuted, setAlreadyExecuted] = useState(false)
  const [signalExecuting, setSignalExecuting] = useState(false)
  const [signalResult, setSignalResult] = useState<{
    capital_before: number
    capital_after: number
    gain_total: number
    capital_added: number
    auto_close_at: string
    signal_code: string
  } | null>(null)
  const [signalError, setSignalError] = useState<string | null>(null)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [visualGains, setVisualGains] = useState<Record<string, number>>({})
  const [codeProgress, setCodeProgress] = useState<number>(0)

  // --- Persistence & Real Balance ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('joy_history_orders')
    if (savedHistory) setHistoryOrders(JSON.parse(savedHistory))

    const fetchBalance = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (!token) return
        const res = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const data = await res.json(); setBalance(data.balance) }
      } catch (error) { console.error('Error fetching balance:', error) }
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
            autoCloseAt: o.auto_close_at || null,
            capitalBefore: o.signal_id ? o.entry_price : undefined,
            gainTotal: o.signal_id ? o.pnl_bs : undefined,
          }))
          setActiveOrders(mappedOrders)
        }
      } catch (error) { console.error('Error fetching active orders:', error) }
    }

    const fetchHistoryOrders = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (!token) return
        const res = await fetch('/api/futuros/order?status=CLOSED', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          const mapped: TradeOrder[] = data.orders.map((o: any) => ({
            id: o.id,
            type: o.type as 'CALL' | 'PUT',
            pair: o.pair,
            amount: o.amount_bs,
            leverage: o.leverage,
            entryPrice: o.entry_price,
            exitPrice: o.exit_price,
            startTime: new Date(o.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            status: o.status as 'WIN' | 'LOSS',
            tp: null,
            sl: null,
            pnl: o.pnl_bs || 0,
            closeReason: o.close_reason,
            signalId: o.signal_id || null,
          }))
          const localHistory = JSON.parse(localStorage.getItem('joy_history_orders') || '[]')
          const allHistory = [...mapped, ...localHistory]
          const uniqueHistory = Array.from(new Map(allHistory.map(order => [order.id, order])).values())
          setHistoryOrders(uniqueHistory.slice(0, 50))
        }
      } catch (error) { console.error('Error fetching history:', error) }
    }

    const fetchActiveSignal = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (!token) return
        const res = await fetch('/api/signals/active', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setActiveSignalInfo(data.signal)
          setAlreadyExecuted(data.already_executed)
        }
      } catch (error) { console.error('Error fetching active signal:', error) }
    }

    fetchBalance()
    fetchActiveOrders()
    fetchHistoryOrders()
    fetchActiveSignal()
  }, [])

  useEffect(() => {
    localStorage.setItem('joy_history_orders', JSON.stringify(historyOrders))
  }, [historyOrders])

  // --- Countdown Timer & Auto-Close for Signal Orders ---
  useEffect(() => {
    const interval = setInterval(() => {
      const signalOrders = activeOrders.filter(o => o.signalId && o.autoCloseAt)
      if (signalOrders.length === 0) return

      const now = Date.now()
      const newCountdowns: Record<string, string> = {}
      const newVisualGains: Record<string, number> = {}
      let needsAutoClose = false

      for (const order of signalOrders) {
        const closeTime = new Date(order.autoCloseAt!).getTime()
        const remaining = closeTime - now
        const totalDuration = 15 * 60 * 1000
        const elapsed = totalDuration - remaining
        const progress = Math.min(1, Math.max(0, elapsed / totalDuration))

        const capitalAdded = (order.gainTotal || 0) * 0.4
        newVisualGains[order.id.toString()] = capitalAdded * progress

        if (remaining <= 0) {
          newCountdowns[order.id.toString()] = '00:00'
          newVisualGains[order.id.toString()] = capitalAdded
          needsAutoClose = true
        } else {
          const mins = Math.floor(remaining / 60000)
          const secs = Math.floor((remaining % 60000) / 1000)
          newCountdowns[order.id.toString()] = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
      }

      setCountdowns(newCountdowns)
      setVisualGains(newVisualGains)

      if (needsAutoClose) {
        const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
        if (token) {
          fetch('/api/futuros/auto-close', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json()
              if (data.closed > 0) {
                const ordRes = await fetch('/api/futuros/order', { headers: { Authorization: `Bearer ${token}` } })
                if (ordRes.ok) {
                  const ordData = await ordRes.json()
                  const mapped: TradeOrder[] = ordData.orders.map((o: any) => ({
                    id: o.id, type: o.type as 'CALL' | 'PUT', pair: o.pair, amount: o.amount_bs,
                    leverage: o.leverage, entryPrice: o.entry_price, startTime: new Date(o.created_at).toLocaleTimeString(),
                    status: 'ACTIVE', tp: o.tp || null, sl: o.sl || null, pnl: o.signal_id ? o.pnl_bs || 0 : 0,
                    signalId: o.signal_id || null, autoCloseAt: o.auto_close_at || null,
                    capitalBefore: o.signal_id ? o.entry_price : undefined, gainTotal: o.signal_id ? o.pnl_bs : undefined,
                  }))
                  setActiveOrders(mapped)
                }
                const balRes = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
                if (balRes.ok) { const bData = await balRes.json(); setBalance(bData.balance) }
                const histRes = await fetch('/api/futuros/order?status=CLOSED', { headers: { Authorization: `Bearer ${token}` } })
                if (histRes.ok) {
                  const histData = await histRes.json()
                  const mappedHist: TradeOrder[] = histData.orders.map((o: any) => ({
                    id: o.id, type: o.type as 'CALL' | 'PUT', pair: o.pair, amount: o.amount_bs,
                    leverage: o.leverage, entryPrice: o.entry_price, exitPrice: o.exit_price,
                    startTime: new Date(o.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    status: o.status as 'WIN' | 'LOSS', tp: null, sl: null, pnl: o.pnl_bs || 0,
                    closeReason: o.close_reason, signalId: o.signal_id || null,
                  }))
                  setHistoryOrders(mappedHist.slice(0, 50))
                }
              }
            }
          }).catch(console.error)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeOrders])

  // Signal code expiry progress (5 minutes)
  useEffect(() => {
    if (!activeSignalInfo) { setCodeProgress(0); return }
    const interval = setInterval(() => {
      const createdAt = new Date(activeSignalInfo.created_at).getTime()
      const elapsed = Date.now() - createdAt
      const progress = Math.min((elapsed / (5 * 60 * 1000)) * 100, 100)
      setCodeProgress(progress)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSignalInfo])

  // --- WebSocket & Chart ---
  const getBinanceSymbol = (p: string) => p.replace('/', '').toLowerCase()

  const fetchHistorical = async (symbol: string, interval: string) => {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=50`)
      const data = await res.json()
      return data.map((d: any) => ({
        time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]),
        low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5])
      }))
    } catch (e) { console.error(e); return [] }
  }

  const updateChart = (data: Candle[]) => {
    if (!chartInstance.current) return
    const dates = data.map(d => new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    const values = data.map(d => [d.open, d.close, d.low, d.high])
    const volumes = data.map((d, i) => [i, d.volume, d.close > d.open ? 1 : -1])

    const calculateMA = (dayCount: number) => {
      const result = []
      for (let i = 0; i < values.length; i++) {
        if (i < dayCount) { result.push('-'); continue }
        let sum = 0
        for (let j = 0; j < dayCount; j++) sum += values[i - j][1]
        result.push((sum / dayCount).toFixed(2))
      }
      return result
    }

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(16,23,32,0.9)', borderColor: '#00d49d',
        textStyle: { color: '#fff', fontFamily: 'Orbitron' }
      },
      grid: [
        { left: 0, right: 40, top: 20, height: '60%' },
        { left: 0, right: 40, top: '65%', height: '15%' }
      ],
      xAxis: [
        { type: 'category', data: dates, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: true, lineStyle: { color: '#34D399', opacity: 0.1 } } },
        { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false } }
      ],
      yAxis: [
        { position: 'right', scale: true, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: '#34D399', opacity: 0.1 } }, axisLabel: { color: '#8a929b', fontSize: 10 } },
        { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } }
      ],
      series: [
        {
          type: 'candlestick', data: values,
          itemStyle: { color: '#00d49d', color0: '#ff5a5a', borderColor: '#00d49d', borderColor0: '#ff5a5a' },
          markLine: {
            symbol: ['none', 'none'],
            data: [{ yAxis: currentPrice, label: { show: false }, lineStyle: { color: '#fff', type: 'dashed', width: 1, opacity: 0.8 } }],
            animation: false
          }
        },
        { name: 'MA5', type: 'line', data: calculateMA(5), smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#dcb329' } },
        { name: 'MA10', type: 'line', data: calculateMA(10), smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#b05fa0' } },
        { name: 'MA20', type: 'line', data: calculateMA(20), smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#3b91bc' } },
        {
          name: 'Volume', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes,
          itemStyle: { color: (params: any) => params.value[2] === 1 ? 'rgba(0,212,157,0.5)' : 'rgba(255,90,90,0.5)' }
        }
      ]
    })
  }

  useEffect(() => {
    let interval = '1m'
    if (selectedTime === '5min') interval = '5m'
    if (selectedTime === '10min') interval = '15m'
    if (selectedTime === '30min') interval = '30m'
    if (selectedTime === '1h') interval = '1h'
    if (selectedTime === '4h') interval = '4h'
    if (selectedTime === '12h') interval = '12h'
    if (selectedTime === '1d') interval = '1d'

    const symbol = getBinanceSymbol(currentPair)
    const init = async () => {
      const data = await fetchHistorical(symbol.toUpperCase(), interval)
      setCandleData(data)
      if (data.length > 0) setCurrentPrice(data[data.length - 1].close)
    }
    init()

    if (wsKline.current) wsKline.current.close()
    if (wsTrade.current) wsTrade.current.close()

    wsKline.current = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`)
    wsKline.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const k = msg.k
      const newCandle = { time: k.t, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c), volume: parseFloat(k.v) }
      setCandleData(prev => {
        const last = prev[prev.length - 1]
        if (last && last.time === newCandle.time) { const updated = [...prev]; updated[updated.length - 1] = newCandle; return updated }
        return [...prev.slice(1), newCandle]
      })
    }

    wsTrade.current = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@aggTrade`)
    wsTrade.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const price = parseFloat(msg.p)
      setCurrentPrice(price)
      setCandleData(prev => {
        if (prev.length === 0) return prev
        const last = { ...prev[prev.length - 1] }
        last.close = price
        if (price > last.high) last.high = price
        if (price < last.low) last.low = price
        const updated = [...prev]; updated[updated.length - 1] = last; return updated
      })
    }

    return () => {
      if (wsKline.current) wsKline.current.close()
      if (wsTrade.current) wsTrade.current.close()
    }
  }, [currentPair, selectedTime])

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
      window.addEventListener('resize', () => chartInstance.current?.resize())
    }
    updateChart(candleData)
  }, [candleData, currentPrice])

  // --- Trading Logic Loop ---
  useEffect(() => {
    const interval = setInterval(() => { checkOrders() }, 1000)
    return () => clearInterval(interval)
  }, [activeOrders, currentPrice])

  const checkOrders = () => {
    if (activeOrders.length === 0) return
    const regularOrders = activeOrders.filter(o => !o.signalId)
    const signalOrders = activeOrders.filter(o => o.signalId)
    if (regularOrders.length === 0) return

    let updatedActive = regularOrders.map(order => {
      let pnlPercent = order.type === 'CALL'
        ? ((currentPrice - order.entryPrice) / order.entryPrice) * order.leverage
        : ((order.entryPrice - currentPrice) / order.entryPrice) * order.leverage
      return { ...order, pnl: order.amount * pnlPercent }
    })

    let finalActive: TradeOrder[] = []
    for (const order of updatedActive) {
      let settled = false, reason = ''
      if (order.tp && ((order.type === 'CALL' && currentPrice >= order.tp) || (order.type === 'PUT' && currentPrice <= order.tp))) { settled = true; reason = 'TP' }
      else if (order.sl && ((order.type === 'CALL' && currentPrice <= order.sl) || (order.type === 'PUT' && currentPrice >= order.sl))) { settled = true; reason = 'SL' }
      if (order.pnl <= -order.amount) { settled = true; reason = 'LIQUIDATION' }
      if (settled) closePosition(order.id, reason)
      else finalActive.push(order)
    }

    const allOrders = [...signalOrders, ...finalActive]
    if (allOrders.length !== activeOrders.length) setActiveOrders(allOrders)
    else setActiveOrders([...signalOrders, ...updatedActive])
  }

  const closePosition = async (id: number | string, reason?: string) => {
    const order = activeOrders.find(o => o.id === id)
    if (!order) return
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
      const res = await fetch('/api/futuros/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: id, closePrice: currentPrice, reason: reason || 'MANUAL' })
      })
      if (res.ok) {
        const data = await res.json()
        const closedOrder: TradeOrder = { ...order, status: data.order.status, exitPrice: data.order.exit_price, pnl: data.order.pnl_bs, closeReason: data.order.close_reason }
        const balanceRes = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
        if (balanceRes.ok) { const bData = await balanceRes.json(); setBalance(bData.balance) }
        setHistoryOrders(prev => [closedOrder, ...prev])
        setActiveOrders(prev => prev.filter(o => o.id !== id))
      }
    } catch (err) { console.error('Error closing position:', err) }
  }

  const placeOrder = async (type: 'CALL' | 'PUT') => {
    if (balance < tradeAmount) { alert('Saldo insuficiente'); return }
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
      const res = await fetch('/api/futuros/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, pair: currentPair, amount: tradeAmount, leverage: tradeLeverage, entryPrice: currentPrice, tp: tpValue ? parseFloat(tpValue) : null, sl: slValue ? parseFloat(slValue) : null })
      })
      if (res.ok) {
        const data = await res.json()
        const newOrder: TradeOrder = { id: data.order.id, type, pair: currentPair, amount: tradeAmount, leverage: tradeLeverage, entryPrice: currentPrice, startTime: new Date().toLocaleTimeString(), status: 'ACTIVE', tp: tpValue ? parseFloat(tpValue) : null, sl: slValue ? parseFloat(slValue) : null, pnl: 0 }
        const balanceRes = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
        if (balanceRes.ok) { const bData = await balanceRes.json(); setBalance(bData.balance) }
        else setBalance(b => b - tradeAmount)
        setActiveOrders(prev => [newOrder, ...prev])
        setShowConfirm(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al abrir posición')
      }
    } catch (err) { console.error('Error placing order:', err); alert('Error de conexión') }
  }

  const executeSignal = async () => {
    if (!signalCode.trim()) return
    setSignalExecuting(true)
    setSignalError(null)
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1]
      if (!token) { setSignalError('No autenticado'); return }
      const res = await fetch('/api/signals/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: signalCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSignalResult(data)
        setAlreadyExecuted(true)
        setSignalCode('')
        setActiveTab('active')
        const ordRes = await fetch('/api/futuros/order', { headers: { Authorization: `Bearer ${token}` } })
        if (ordRes.ok) {
          const ordData = await ordRes.json()
          const mapped: TradeOrder[] = ordData.orders.map((o: any) => ({
            id: o.id, type: o.type as 'CALL' | 'PUT', pair: o.pair, amount: o.amount_bs, leverage: o.leverage,
            entryPrice: o.entry_price, startTime: new Date(o.created_at).toLocaleTimeString(), status: 'ACTIVE',
            tp: o.tp || null, sl: o.sl || null, pnl: o.signal_id ? o.pnl_bs || 0 : 0,
            signalId: o.signal_id || null, autoCloseAt: o.auto_close_at || null,
            capitalBefore: o.signal_id ? o.entry_price : undefined, gainTotal: o.signal_id ? o.pnl_bs : undefined,
          }))
          setActiveOrders(mapped)
        }
        const balRes = await fetch('/api/user/balance', { headers: { Authorization: `Bearer ${token}` } })
        if (balRes.ok) { const bd = await balRes.json(); setBalance(bd.balance) }
      } else {
        setSignalError(data.error || 'Error al ejecutar señal')
      }
    } catch { setSignalError('Error de conexión') }
    finally { setSignalExecuting(false) }
  }

  // --- UI Helpers ---
  const priceChangePercent = ((candleData.length > 0 ? (currentPrice - candleData[0].open) / candleData[0].open : 0) * 100).toFixed(2)
  const isPositive = parseFloat(priceChangePercent) >= 0

  const generateOrderBook = (price: number) => {
    if (!price) return { asks: [], bids: [] }
    const spread = price * 0.0001
    const asks = Array.from({ length: 6 }, (_, i) => ({ price: price + spread * (i + 1), amount: (Math.random() * 2).toFixed(3) }))
    const bids = Array.from({ length: 6 }, (_, i) => ({ price: price - spread * (i + 1), amount: (Math.random() * 2).toFixed(3) }))
    return { asks: asks.reverse(), bids }
  }

  const { asks, bids } = generateOrderBook(currentPrice)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    setSliderValue(val)
    setTradeAmount(Math.floor((balance * val) / 100))
  }

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#161A1E] text-[#EAECEF] font-sans pb-20">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161A1E] border-b border-[#2B3139]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSidebar(true)}>
            <Menu className="text-[#848E9C]" size={24} />
            <h1 className="text-xl font-bold text-[#EAECEF] flex items-center gap-1">
              {currentPair.replace('/', '')}
              <span className="bg-[#2B3139] text-[#848E9C] text-[10px] px-1 rounded">Perp</span>
            </h1>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium mt-1 ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            <span>{isPositive ? '+' : ''}{priceChangePercent}%</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[#848E9C]">
          <Activity size={20} />
          <Wallet size={20} />
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full h-[200px]" />

      {/* Timeframes */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none border-b border-[#2B3139]">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => setSelectedTime(tf)}
            className={`shrink-0 text-[10px] px-2 py-1 rounded font-bold transition-colors ${selectedTime === tf ? 'bg-[#F0B90B] text-black' : 'text-[#848E9C] hover:text-white'}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-2 p-2">

        {/* Order Book */}
        <div className="col-span-5">
          <div className="flex justify-between text-[10px] text-[#848E9C] mb-2 px-1">
            <span>Precio</span><span>Monto</span>
          </div>
          <div className="flex flex-col gap-0.5 mb-2">
            {asks.map((ask, i) => (
              <div key={i} className="flex justify-between text-xs px-1 relative">
                <span className="text-[#F6465D] font-mono z-10">{ask.price.toFixed(2)}</span>
                <span className="text-[#EAECEF] z-10">{ask.amount}</span>
                <div className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10" style={{ width: `${Math.random() * 80}%` }} />
              </div>
            ))}
          </div>
          <div className={`text-lg font-bold text-center py-1 ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {currentPrice.toFixed(2)}
          </div>
          <div className="flex flex-col gap-0.5">
            {bids.map((bid, i) => (
              <div key={i} className="flex justify-between text-xs px-1 relative">
                <span className="text-[#0ECB81] font-mono z-10">{bid.price.toFixed(2)}</span>
                <span className="text-[#EAECEF] z-10">{bid.amount}</span>
                <div className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10" style={{ width: `${Math.random() * 80}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Order Form */}
        <div className="col-span-7 pl-2">
          <div className="flex gap-2 mb-3">
            <button className="flex-1 bg-[#2B3139] text-[#EAECEF] text-xs font-bold py-1.5 rounded">Cruzado</button>
            <button className="flex-1 bg-[#2B3139] text-[#EAECEF] text-xs font-bold py-1.5 rounded">{tradeLeverage}x</button>
          </div>

          <div className="flex justify-between text-xs text-[#848E9C] font-bold mb-3 px-1">
            <span className={`${orderType === 'Limit' ? 'text-[#EAECEF]' : ''} cursor-pointer`} onClick={() => setOrderType('Limit')}>Limit</span>
            <span className={`${orderType === 'Market' ? 'text-[#EAECEF]' : ''} cursor-pointer`} onClick={() => setOrderType('Market')}>Market</span>
            <span className="cursor-not-allowed opacity-50">Stop</span>
          </div>

          <div className="space-y-2">
            <div className="bg-[#2B3139] rounded px-3 py-2 flex items-center justify-between">
              <span className="text-[#848E9C] text-xs">{orderType === 'Market' ? 'Precio de Mercado' : 'Precio (USDT)'}</span>
            </div>
            <div className="bg-[#2B3139] rounded px-3 py-2">
              <input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(parseFloat(e.target.value))}
                className="bg-transparent text-[#EAECEF] text-sm font-bold w-full outline-none"
                placeholder="Monto (USDT)"
              />
            </div>
            <div className="px-1">
              <input type="range" min="0" max="100" value={sliderValue} onChange={handleSliderChange} className="w-full h-1 bg-[#2B3139] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]" />
              <div className="flex justify-between text-[10px] text-[#848E9C] mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>
            <div className="flex justify-between text-xs text-[#848E9C]">
              <span>Disponible</span>
              <span className="text-[#EAECEF] font-bold">{balance.toFixed(2)} USDT</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setPendingType('CALL'); setShowConfirm(true) }} className="flex-1 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-bold py-3 rounded text-sm transition-colors">
                Comprar / Long
              </button>
              <button onClick={() => { setPendingType('PUT'); setShowConfirm(true) }} className="flex-1 bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold py-3 rounded text-sm transition-colors">
                Vender / Short
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="mt-2 border-t border-[#2B3139] bg-[#161A1E]">
        <div className="flex text-sm font-bold">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'active' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-[#848E9C] border-transparent'}`}>
            Posiciones ({activeOrders.length})
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'history' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-[#848E9C] border-transparent'}`}>
            Historial ({historyOrders.length})
          </button>
          <button onClick={() => setActiveTab('code')} className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'code' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-[#848E9C] border-transparent'}`}>
            Señales
          </button>
        </div>

        <div className="p-4 pb-24">
          {/* Posiciones Activas */}
          {activeTab === 'active' && (
            <div className="space-y-3">
              {activeOrders.length === 0 ? (
                <div className="text-center py-10 text-[#848E9C] text-xs flex flex-col items-center gap-2">
                  <Activity size={32} className="opacity-20" />
                  <span>No tiene ninguna posición</span>
                </div>
              ) : (
                activeOrders.map(order => {
                  const displayPnl = order.signalId ? (visualGains[order.id] ?? order.pnl) : order.pnl
                  const pnlPercent = (displayPnl / order.amount) * 100
                  return (
                    <div key={order.id} className="bg-[#1E2329] p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold ${order.type === 'CALL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{order.type === 'CALL' ? 'L' : 'S'}</span>
                          <span className="text-[#EAECEF] font-bold text-sm">{order.pair.replace('/', '')}</span>
                          <span className="bg-[#2B3139] text-[#848E9C] text-[10px] px-1 rounded">Cross {order.leverage}x</span>
                          {order.signalId && countdowns[order.id.toString()] && (
                            <span className="bg-[#F0B90B]/20 text-[#F0B90B] text-[10px] px-2 py-0.5 rounded font-mono">
                              ⏱ {countdowns[order.id.toString()]}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-base font-bold ${displayPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {displayPnl > 0 ? '+' : ''}{displayPnl.toFixed(2)}
                          </div>
                          <div className={`text-xs ${displayPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {displayPnl > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <div className="flex justify-between pr-2"><span className="text-[#848E9C]">Entrada</span><span className="text-[#EAECEF]">{order.entryPrice.toFixed(2)}</span></div>
                        <div className="flex justify-between pl-2 border-l border-[#2B3139]"><span className="text-[#848E9C]">Mark</span><span className="text-[#EAECEF]">{currentPrice.toFixed(2)}</span></div>
                        <div className="flex justify-between pr-2"><span className="text-[#848E9C]">Margen</span><span className="text-[#EAECEF]">{order.amount.toFixed(2)}</span></div>
                        <div className="flex justify-between pl-2 border-l border-[#2B3139]"><span className="text-[#848E9C]">Tamaño</span><span className="text-[#EAECEF]">{(order.amount * order.leverage / (order.entryPrice || 1)).toFixed(4)}</span></div>
                      </div>
                      {!order.signalId && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => closePosition(order.id)} className="flex-1 bg-[#2B3139] text-[#EAECEF] text-xs py-1.5 rounded hover:bg-[#343a42]">
                            Cerrar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {historyOrders.length === 0 ? (
                <div className="text-center py-10 text-[#848E9C] text-xs">Sin historial</div>
              ) : (
                historyOrders.map(order => (
                  <div key={order.id} className="bg-[#1E2329] p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${order.type === 'CALL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{order.type}</span>
                        <span className="text-sm font-bold">{order.pair.replace('/', '')}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.status === 'WIN' ? 'bg-[#0ECB81]/20 text-[#0ECB81]' : 'bg-[#F6465D]/20 text-[#F6465D]'}`}>{order.status}</span>
                      </div>
                      <div className="text-[10px] text-[#848E9C] mt-0.5">{order.startTime} · ${order.amount.toFixed(2)}</div>
                    </div>
                    <div className={`text-sm font-bold ${order.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {order.pnl > 0 ? '+' : ''}{order.pnl.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Señales */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {/* Active Signal Banner */}
              {activeSignalInfo && (
                <div className="bg-[#1E2329] rounded-xl p-4 border border-[#F0B90B]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#F0B90B] text-xs font-bold uppercase tracking-wider">🔥 Señal Activa</span>
                    {alreadyExecuted && <span className="text-[#0ECB81] text-[10px] flex items-center gap-1"><CheckCircle2 size={12} /> Ejecutada</span>}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#F0B90B]/10 px-3 py-1.5 rounded-lg">
                      <span className="text-[#F0B90B] font-bold font-mono text-lg tracking-widest">{activeSignalInfo.code}</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold">{activeSignalInfo.pair}</div>
                      <div className={`text-xs font-bold ${activeSignalInfo.direction === 'CALL' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {activeSignalInfo.direction === 'CALL' ? '▲ ALZA' : '▼ BAJA'}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar (5min expiry) */}
                  <div className="h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F0B90B] transition-all duration-1000 rounded-full"
                      style={{ width: `${100 - codeProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#848E9C] mt-1">Tiempo para unirse: {Math.max(0, Math.floor((5 * 60 * 1000 - (Date.now() - new Date(activeSignalInfo.created_at).getTime())) / 1000))}s restantes</div>
                </div>
              )}

              {/* Code Input */}
              <div className="bg-[#1E2329] p-4 rounded-xl">
                <h3 className="text-[#EAECEF] font-bold mb-3 text-sm">Ingresar Código de Señal</h3>
                <div className="flex gap-2">
                  <input
                    value={signalCode}
                    onChange={e => setSignalCode(e.target.value.toUpperCase())}
                    placeholder="Ej: XYZ123"
                    maxLength={10}
                    className="flex-1 bg-[#2B3139] text-[#EAECEF] rounded-lg px-3 py-2.5 outline-none text-sm font-mono tracking-widest placeholder-[#848E9C]"
                  />
                  <button
                    onClick={executeSignal}
                    disabled={signalExecuting || !signalCode.trim()}
                    className="bg-[#F0B90B] disabled:opacity-50 text-black font-bold px-4 rounded-lg text-sm hover:brightness-110 transition-all"
                  >
                    {signalExecuting ? '...' : 'Ejecutar'}
                  </button>
                </div>
                {signalError && (
                  <div className="mt-2 text-[#F6465D] text-xs flex items-center gap-1">
                    <X size={12} /> {signalError}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-[10px] text-[#848E9C] space-y-1 px-1">
                <p>• El admin publica un código cada sesión de trading</p>
                <p>• Tienes <span className="text-[#F0B90B]">5 minutos</span> para ingresar el código</p>
                <p>• El <span className="text-[#0ECB81]">40% de la ganancia</span> se acredita inmediatamente</p>
                <p>• La operación cierra automáticamente a los <span className="text-[#F0B90B]">15 minutos</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Par selector */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="relative bg-[#1E2329] w-3/4 max-w-xs h-full p-4 flex flex-col">
            <h2 className="text-xl font-bold text-[#EAECEF] mb-4">Mercados</h2>
            <div className="space-y-1 overflow-y-auto flex-1">
              {PAIRS.map(pair => (
                <button
                  key={pair}
                  onClick={() => { setCurrentPair(pair); setShowSidebar(false) }}
                  className={`w-full text-left py-3 px-4 rounded ${currentPair === pair ? 'bg-[#2B3139] text-[#F0B90B]' : 'text-[#EAECEF] hover:bg-[#2B3139]/50'}`}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131B26] w-full max-w-xs rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            <div className="pt-8 pb-4 text-center">
              <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">{currentPair}</h3>
              <div className={`flex items-center justify-center gap-3 text-3xl font-black ${pendingType === 'CALL' ? 'text-[#34D399]' : 'text-[#FF5A5A]'}`}>
                {pendingType === 'CALL' ? <ArrowUp size={32} strokeWidth={3} /> : <ArrowDown size={32} strokeWidth={3} />}
                <span>{pendingType === 'CALL' ? 'ALZA' : 'BAJA'}</span>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block text-center">Apalancamiento</label>
                <input
                  type="number" min={1} max={1000} value={tradeLeverage}
                  onChange={e => setTradeLeverage(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#0A1119] border border-white/5 rounded-xl px-4 py-3 text-white text-xl font-bold outline-none text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider block text-center">Inversión</label>
                <input
                  type="number" min={1} max={balance} value={tradeAmount}
                  onChange={e => setTradeAmount(Math.max(1, Math.min(balance, parseFloat(e.target.value) || 1)))}
                  className="w-full bg-[#0A1119] border border-white/5 rounded-xl px-4 py-3 text-white text-xl font-bold outline-none text-center"
                />
              </div>
              <button
                onClick={() => placeOrder(pendingType!)}
                className={`w-full py-4 rounded-xl font-bold text-[#0A1119] text-sm uppercase tracking-widest ${pendingType === 'CALL' ? 'bg-[#34D399]' : 'bg-[#FF5A5A]'}`}
              >
                CONFIRMAR
              </button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-3 rounded-xl text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 transition uppercase tracking-wider">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signal Result Modal */}
      {signalResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A1119] w-full max-w-xs rounded-3xl p-6 text-center border border-[#FFD700]/50 shadow-[0_0_50px_rgba(255,215,0,0.15)]">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700] to-[#F59E0B] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#FFD700]/30">
              <Activity size={40} className="text-[#0A1119]" />
            </div>
            <h3 className="text-xl font-black text-white mb-6">OPERACIÓN ABIERTA</h3>
            <div className="bg-[#131B26] rounded-2xl p-4 space-y-3 text-left mb-6 border border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Capital anterior</span>
                <span className="text-white font-bold">${signalResult.capital_before.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Ganancia (1%)</span>
                <span className="text-[#FFD700] font-bold">+${signalResult.gain_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Capital acreditado (40%)</span>
                <span className="text-[#0ECB81] font-bold">+${signalResult.capital_added.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setSignalResult(null)}
              className="w-full py-3.5 rounded-xl bg-[#FFD700] text-[#0A1119] font-bold uppercase tracking-wider hover:scale-[1.02] transition-transform"
            >
              Ver Operación
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
