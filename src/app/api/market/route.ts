import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let apiUrl = 'https://api.binance.com/api/v3/ticker/24hr'

    if (type === 'futures') {
        apiUrl = 'https://fapi.binance.com/fapi/v1/ticker/24hr'
    }

    try {
        const res = await fetch(apiUrl, {
            next: { revalidate: 60 }, // Cache for 60 seconds
        })

        if (!res.ok) {
            throw new Error('Failed to fetch data from Binance')
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching market data:', error)
        return NextResponse.json(
            { error: 'Error fetching market data' },
            { status: 500 }
        )
    }
}
