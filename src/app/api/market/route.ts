import { NextResponse } from 'next/server'

let cache: { data: any[]; ts: number } | null = null
const CACHE_TTL = 55_000

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'DOGEUSDT',
  'TRXUSDT', 'MATICUSDT', 'LTCUSDT', 'SHIBUSDT', 'BCHUSDT',
  'UNIUSDT', 'XLMUSDT', 'XMRUSDT', 'ETCUSDT', 'ATOMUSDT',
]

async function fetchFromBinance(): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(SYMBOLS))
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`

    const res = await fetch(url, {
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

export const dynamic = 'force-dynamic'

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const data = await fetchFromBinance()
    cache = { data, ts: Date.now() }
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (err: any) {
    if (cache) {
      console.warn('Binance failed, serving stale cache:', err?.message)
      return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } })
    }
    console.error('Market API error (no cache):', err?.message)
    return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
  }
}
