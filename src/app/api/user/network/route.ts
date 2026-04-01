import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

interface UserNetworkNode {
  id: string
  username: string
  full_name: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  vip_packages: { name: string; level: number; status: string }[]
  referrals: UserNetworkNode[]
}

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const userId = authResult.user.userId

  if (!userId) {
    return NextResponse.json({ error: 'No user ID' }, { status: 401 })
  }

  try {
    // 1. Fetch ALL users and purchases (optimized for tree building)
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        full_name: true,
        sponsor_id: true,
      },
    })

    const allPurchases = await prisma.purchase.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: {
        user_id: true,
        status: true,
        vip_package: {
          select: { name: true, level: true }
        }
      }
    })

    // 2. Index data for fast lookup
    const purchasesByUser = new Map<string, typeof allPurchases>()
    for (const p of allPurchases) {
      if (!purchasesByUser.has(p.user_id)) {
        purchasesByUser.set(p.user_id, [])
      }
      purchasesByUser.get(p.user_id)!.push(p)
    }

    const usersById = new Map<string, typeof allUsers[0]>()
    for (const u of allUsers) {
      usersById.set(u.id, u)
    }

    // 3. Helper to determine status and packages
    const getUserDetails = (uId: string) => {
      const purchases = purchasesByUser.get(uId) || []
      const activeVips = purchases.filter(p => p.status === 'ACTIVE')
      const pendingVips = purchases.filter(p => p.status === 'PENDING')

      let status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE' = 'INACTIVO'
      if (pendingVips.length > 0) status = 'PENDIENTE'
      else if (activeVips.length > 0) status = 'ACTIVO'

      const uniquePackages = new Map()
      purchases.forEach(p => {
        if (!uniquePackages.has(p.vip_package.name)) {
          uniquePackages.set(p.vip_package.name, { ...p.vip_package, status: p.status })
        }
      })

      return { status, vip_packages: Array.from(uniquePackages.values()) }
    }

    // 4. Recursive Tree Builder
    const buildTree = (currentId: string, level: number = 0): UserNetworkNode | null => {
      // Safety break for deep networks
      if (level > 10) return null

      const currentUser = usersById.get(currentId)
      if (!currentUser) return null

      const details = getUserDetails(currentId)

      // Find direct children
      const children = allUsers
        .filter(u => u.sponsor_id === currentId)
        .map(child => buildTree(child.id, level + 1))
        .filter((node): node is UserNetworkNode => node !== null)

      return {
        id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name || 'Usuario',
        status: details.status,
        vip_packages: details.vip_packages as any, // Cast to match interface perfectly
        referrals: children
      }
    }

    // 5. Build the tree starting from the current user
    const networkTree = buildTree(userId, 0)

    if (!networkTree) {
      return NextResponse.json({
        id: userId,
        username: 'unknown',
        full_name: 'Usuario',
        status: 'INACTIVO',
        vip_packages: [],
        referrals: [],
      })
    }

    // Return the root node directly as the frontend expects 'data' to be the user object
    return NextResponse.json(networkTree)

  } catch (error) {
    console.error('Network API error:', error)
    return NextResponse.json(
      { error: 'Error al cargar red de referidos' },
      { status: 500 }
    )
  }
}
