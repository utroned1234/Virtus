import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// CoinGecko IDs para crypto (funciona en servidores cloud, Binance los bloquea)
const COINGECKO_TOP_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'xrp',
  'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'dogecoin',
  'tron', 'matic-network', 'litecoin', 'shiba-inu', 'bitcoin-cash',
  'uniswap', 'stellar', 'monero', 'ethereum-classic', 'cosmos',
]

const FUTURES_IDS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'xrp',
  'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'dogecoin',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'futures' or null (spot/crypto)

  const ids = type === 'futures' ? FUTURES_IDS : COINGECKO_TOP_IDS

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })

    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`CoinGecko returned ${res.status}`)
    }

    const raw = await res.json()

    // Convierte al mismo formato que usaba Binance para no cambiar el cliente
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTCUSDT', 'ethereum': 'ETHUSDT', 'binancecoin': 'BNBUSDT',
      'solana': 'SOLUSDT', 'xrp': 'XRPUSDT', 'cardano': 'ADAUSDT',
      'avalanche-2': 'AVAXUSDT', 'polkadot': 'DOTUSDT', 'chainlink': 'LINKUSDT',
      'dogecoin': 'DOGEUSDT', 'tron': 'TRXUSDT', 'matic-network': 'MATICUSDT',
      'litecoin': 'LTCUSDT', 'shiba-inu': 'SHIBUSDT', 'bitcoin-cash': 'BCHUSDT',
      'uniswap': 'UNIUSDT', 'stellar': 'XLMUSDT', 'monero': 'XMRUSDT',
      'ethereum-classic': 'ETCUSDT', 'cosmos': 'ATOMUSDT',
    }

    const data = Object.entries(raw).map(([id, prices]: [string, any]) => ({
      symbol: symbolMap[id] || id.toUpperCase() + 'USDT',
      lastPrice: String(prices.usd ?? 0),
      priceChangePercent: String((prices.usd_24h_change ?? 0).toFixed(2)),
      quoteVolume: String(prices.usd_24h_vol ?? 0),
    }))

    return NextResponse.json(data)
  } catch (error: any) {
    clearTimeout(timeout)
    const isTimeout = error?.name === 'AbortError'
    console.error('Error fetching market data:', isTimeout ? 'timeout' : error?.message)
    return NextResponse.json(
      { error: isTimeout ? 'timeout' : 'Error fetching market data' },
      { status: 503 }
    )
  }
}
