import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let apiUrl = 'https://api.binance.com/api/v3/ticker/24hr'

    if (type === 'futures') {
        apiUrl = 'https://fapi.binance.com/fapi/v1/ticker/24hr'
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout

    try {
        const res = await fetch(apiUrl, {
            signal: controller.signal,
            cache: 'no-store',
        })

        clearTimeout(timeout)

        if (!res.ok) {
            throw new Error(`Binance returned ${res.status}`)
        }

        const data = await res.json()
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
