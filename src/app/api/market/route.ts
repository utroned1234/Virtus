import { NextResponse } from 'next/server'

// Cache a nivel de módulo — se reutiliza entre requests en el mismo proceso
let cache: { data: any[]; ts: number } | null = null
const CACHE_TTL = 55_000 // 55 segundos

const COINGECKO_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'xrp',
  'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'dogecoin',
  'tron', 'matic-network', 'litecoin', 'shiba-inu', 'bitcoin-cash',
  'uniswap', 'stellar', 'monero', 'ethereum-classic', 'cosmos',
]

const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTCUSDT', 'ethereum': 'ETHUSDT', 'binancecoin': 'BNBUSDT',
  'solana': 'SOLUSDT', 'xrp': 'XRPUSDT', 'cardano': 'ADAUSDT',
  'avalanche-2': 'AVAXUSDT', 'polkadot': 'DOTUSDT', 'chainlink': 'LINKUSDT',
  'dogecoin': 'DOGEUSDT', 'tron': 'TRXUSDT', 'matic-network': 'MATICUSDT',
  'litecoin': 'LTCUSDT', 'shiba-inu': 'SHIBUSDT', 'bitcoin-cash': 'BCHUSDT',
  'uniswap': 'UNIUSDT', 'stellar': 'XLMUSDT', 'monero': 'XMRUSDT',
  'ethereum-classic': 'ETCUSDT', 'cosmos': 'ATOMUSDT',
}

async function fetchFromCoinGecko(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

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
      symbol: SYMBOL_MAP[id] || id.toUpperCase() + 'USDT',
      lastPrice: String(p.usd ?? 0),
      priceChangePercent: String(Number(p.usd_24h_change ?? 0).toFixed(2)),
      quoteVolume: String(p.usd_24h_vol ?? 0),
    }))
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

export const dynamic = 'force-dynamic'

export async function GET() {
  // Devuelve caché si tiene menos de 55 segundos
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  try {
    const data = await fetchFromCoinGecko()
    cache = { data, ts: Date.now() }
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch (err: any) {
    // Si falla pero tenemos caché viejo, lo devolvemos igual
    if (cache) {
      console.warn('CoinGecko failed, serving stale cache:', err?.message)
      return NextResponse.json(cache.data, {
        headers: { 'X-Cache': 'STALE' },
      })
    }
    console.error('Market API error (no cache):', err?.message)
    return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
  }
}
