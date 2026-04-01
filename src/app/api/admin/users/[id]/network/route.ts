import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/middleware'

interface UserNetworkNode {
  id: string
  username: string
  full_name: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  vip_packages: string[]
  referrals: UserNetworkNode[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id: userId } = await params

    // Verificar que el usuario existe
    const rootUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, full_name: true },
    })

    if (!rootUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener TODOS los usuarios de una sola vez (optimización)
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        full_name: true,
        sponsor_id: true,
      },
    })

    // Obtener TODAS las compras de una sola vez (optimización)
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

    // Función para determinar si un usuario está en la red del usuario raíz (downline)
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

    // Filtrar solo usuarios que pertenecen a la red del usuario raíz (hacia abajo)
    const networkUsers = allUsers.filter(u =>
      u.sponsor_id && isInNetwork(u.id, userId) && u.id !== userId
    )

    // Función para construir el árbol en memoria (sin queries adicionales)
    function buildTree(parentId: string): UserNetworkNode[] {
      const children = networkUsers.filter(u => u.sponsor_id === parentId)

      return children.map(user => {
        const userPurchases = purchasesByUser.get(user.id) || []

        // Determinar estado (prioridad a PENDIENTE)
        const hasActive = userPurchases.some(p => p.status === 'ACTIVE')
        const hasPending = userPurchases.some(p => p.status === 'PENDING')

        let status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
        if (hasPending) {
          // Si hay solicitudes pendientes, el estado es PENDIENTE sin importar si tiene activos
          status = 'PENDIENTE'
        } else if (hasActive) {
          status = 'ACTIVO'
        } else {
          status = 'INACTIVO'
        }

        // Obtener nombres de paquetes VIP únicos (solo activos y pendientes)
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
          referrals: buildTree(user.id),
        }
      })
    }

    // Construir árbol del usuario raíz
    const rootUserPurchases = purchasesByUser.get(userId) || []
    const rootHasActive = rootUserPurchases.some(p => p.status === 'ACTIVE')
    const rootHasPending = rootUserPurchases.some(p => p.status === 'PENDING')

    let rootStatus: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
    if (rootHasPending) {
      // Si hay solicitudes pendientes, el estado es PENDIENTE sin importar si tiene activos
      rootStatus = 'PENDIENTE'
    } else if (rootHasActive) {
      rootStatus = 'ACTIVO'
    } else {
      rootStatus = 'INACTIVO'
    }

    const rootVipPackages = [...new Set(
      rootUserPurchases
        .filter(p => p.status === 'ACTIVE' || p.status === 'PENDING')
        .map(p => p.vip_package.name)
    )]

    const userNetwork: UserNetworkNode = {
      id: rootUser.id,
      username: rootUser.username,
      full_name: rootUser.full_name,
      status: rootStatus,
      vip_packages: rootVipPackages,
      referrals: buildTree(userId),
    }

    return NextResponse.json(userNetwork)
  } catch (error) {
    console.error('Error fetching user network:', error)
    return NextResponse.json(
      { error: 'Error al cargar la red del usuario' },
      { status: 500 }
    )
  }
}
