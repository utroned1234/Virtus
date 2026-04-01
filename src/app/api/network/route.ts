import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/middleware'

interface NetworkUser {
  id: string
  username: string
  full_name: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  vip_packages: string[]
  level: number
  children: NetworkUser[]
}

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user.userId

    // Obtener TODOS los usuarios de la red de una sola vez
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        full_name: true,
        sponsor_id: true,
      },
    })

    // Obtener TODAS las compras de una sola vez
    const allPurchases = await prisma.purchase.findMany({
      select: {
        user_id: true,
        status: true,
        vip_package: {
          select: {
            name: true,
          },
        },
      },
    })

    // Crear mapa de compras por usuario
    const purchasesByUser = new Map<string, typeof allPurchases>()
    for (const purchase of allPurchases) {
      if (!purchasesByUser.has(purchase.user_id)) {
        purchasesByUser.set(purchase.user_id, [])
      }
      purchasesByUser.get(purchase.user_id)!.push(purchase)
    }

    // Crear mapa de usuarios por ID
    const usersById = new Map<string, typeof allUsers[0]>()
    for (const user of allUsers) {
      usersById.set(user.id, user)
    }

    // Función para determinar si un usuario está en la red del usuario actual
    function isInNetwork(targetUserId: string, rootUserId: string): boolean {
      let currentId: string | null = targetUserId
      const visited = new Set<string>()

      while (currentId && !visited.has(currentId)) {
        if (currentId === rootUserId) return true
        visited.add(currentId)
        const user = usersById.get(currentId)
        currentId = user?.sponsor_id || null
      }
      return false
    }

    // Filtrar solo usuarios que pertenecen a la red del usuario actual (hacia abajo)
    const networkUsers = allUsers.filter(u =>
      u.sponsor_id && isInNetwork(u.id, userId) && u.id !== userId
    )

    // Función para construir el árbol
    function buildTree(parentId: string, level: number = 1): NetworkUser[] {
      if (level > 7) return []

      const children = networkUsers.filter(u => u.sponsor_id === parentId)

      return children.map(user => {
        const userPurchases = purchasesByUser.get(user.id) || []

        // Determinar estado (prioridad a PENDING)
        const hasActive = userPurchases.some(p => p.status === 'ACTIVE')
        const hasPending = userPurchases.some(p => p.status === 'PENDING')

        let status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
        if (hasPending) {
          // Si hay solicitudes pendientes, el estado es PENDING sin importar si tiene activos
          status = 'PENDING'
        } else if (hasActive) {
          status = 'ACTIVE'
        } else {
          status = 'INACTIVE'
        }

        // Obtener nombres de paquetes VIP únicos
        const vipPackages = [...new Set(
          userPurchases
            .filter(p => p.status === 'ACTIVE' || p.status === 'PENDING')
            .map(p => p.vip_package.name)
        )]

        return {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          status,
          vip_packages: vipPackages,
          level,
          children: buildTree(user.id, level + 1),
        }
      })
    }

    const network = buildTree(userId)

    console.log('Network built successfully, total users:', network.length)
    return NextResponse.json({ network })
  } catch (error) {
    console.error('Network error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Error al cargar red de referidos' },
      { status: 500 }
    )
  }
}
