import { NextResponse } from 'next/server'

let cache: { data: any[]; ts: number } | null = null
const CACHE_TTL = 55_000

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'DOGEUSDT',
  'TRXUSDT', 'MATICUSDT', 'LTCUSDT', 'SHIBUSDT', 'BCHUSDT',
  'UNIUSDT', 'XLMUSDT', 'XMRUSDT', 'ETCUSDT', 'ATOMUSDT',
]

const COINGECKO_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
  'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'dogecoin',
  'tron', 'matic-network', 'litecoin', 'shiba-inu', 'bitcoin-cash',
  'uniswap', 'stellar', 'monero', 'ethereum-classic', 'cosmos',
]

const COINGECKO_SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTCUSDT', 'ethereum': 'ETHUSDT', 'binancecoin': 'BNBUSDT',
  'solana': 'SOLUSDT', 'ripple': 'XRPUSDT', 'cardano': 'ADAUSDT',
  'avalanche-2': 'AVAXUSDT', 'polkadot': 'DOTUSDT', 'chainlink': 'LINKUSDT',
  'dogecoin': 'DOGEUSDT', 'tron': 'TRXUSDT', 'matic-network': 'MATICUSDT',
  'litecoin': 'LTCUSDT', 'shiba-inu': 'SHIBUSDT', 'bitcoin-cash': 'BCHUSDT',
  'uniswap': 'UNIUSDT', 'stellar': 'XLMUSDT', 'monero': 'XMRUSDT',
  'ethereum-classic': 'ETCUSDT', 'cosmos': 'ATOMUSDT',
}

async function fetchFromBinance(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(SYMBOLS))
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Binance ${res.status}`)
    const raw: any[] = await res.json()
    return raw.map((t: any) => ({
      symbol: t.symbol,
      lastPrice: t.lastPrice,
      priceChangePercent: parseFloat(t.priceChangePercent).toFixed(2),
      quoteVolume: t.quoteVolume,
    }))
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function fetchFromCoinGecko(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const raw = await res.json()
    return Object.entries(raw).map(([id, p]: [string, any]) => ({
      symbol: COINGECKO_SYMBOL_MAP[id] || id.toUpperCase() + 'USDT',
      lastPrice: String(p.usd ?? 0),
      priceChangePercent: String(Number(p.usd_24h_change ?? 0).toFixed(2)),
      quoteVolume: String(p.usd_24h_vol ?? 0),
    }))
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function fetchFromCryptoCompare(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const fsyms = ['BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOT','LINK','DOGE','TRX','MATIC','LTC','SHIB','BCH','UNI','XLM','XMR','ETC','ATOM']
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms.join(',')}&tsyms=USD`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`CryptoCompare ${res.status}`)
    const raw = await res.json()
    if (!raw.RAW) throw new Error('No RAW data')
    return Object.entries(raw.RAW).map(([sym, data]: [string, any]) => ({
      symbol: `${sym}USDT`,
      lastPrice: String(data.USD?.PRICE ?? 0),
      priceChangePercent: String(Number(data.USD?.CHANGEPCT24HOUR ?? 0).toFixed(2)),
      quoteVolume: String(data.USD?.TOTALVOLUME24HTO ?? 0),
    }))
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

export const dynamic = 'force-dynamic'

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } })
  }

  // Try Binance first, then CoinGecko, then CryptoCompare
  const sources = [fetchFromBinance, fetchFromCoinGecko, fetchFromCryptoCompare]

  for (const source of sources) {
    try {
      const data = await source()
      if (data && data.length > 0) {
        cache = { data, ts: Date.now() }
        return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
      }
    } catch (err: any) {
      console.warn(`Market source failed: ${err?.message}`)
    }
  }

  // All sources failed — return stale cache if available
  if (cache) {
    console.warn('All market sources failed, serving stale cache')
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } })
  }

  console.error('All market sources failed, no cache available')
  return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
}
