'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import { UserNetworkView } from './UserNetworkView'

interface User {
  id: string
  username: string
  full_name: string
  email: string
  user_code: string
  balance: number
  active_vip: string | null
  created_at: string
}

interface UserNetworkNode {
  id: string
  username: string
  full_name: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  vip_packages: string[]
  referrals: UserNetworkNode[]
}

interface UsersTabProps {
  token: string
}

export default function UsersTab({ token }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserNetwork, setSelectedUserNetwork] = useState<UserNetworkNode | null>(null)
  const [networkLoading, setNetworkLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserNetwork = async (userId: string) => {
    setNetworkLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/network`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedUserNetwork(data)
      }
    } catch (error) {
      console.error('Error fetching user network:', error)
    } finally {
      setNetworkLoading(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gold">Cargando usuarios...</p>
  }

  // If a user network is selected, show the network view
  if (selectedUserNetwork) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedUserNetwork(null)}
            className="px-4 py-2 bg-gold/20 text-gold rounded hover:bg-gold/30 transition-colors text-sm font-semibold"
          >
            ← Volver a usuarios
          </button>
        </div>
        <Card glassEffect>
          {networkLoading ? (
            <p className="text-center text-gold">Cargando red del usuario...</p>
          ) : (
            <UserNetworkView user={selectedUserNetwork} token={token} />
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gold mb-4">Usuarios Registrados</h2>

      {users.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary">No hay usuarios registrados</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} glassEffect>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary">{user.full_name}</h3>
                  <p className="text-sm text-text-secondary">@{user.username}</p>
                  <p className="text-xs text-text-secondary">{user.email}</p>
                  <p className="text-xs text-gold mt-1">Código: {user.user_code}</p>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-2xl font-bold text-gold">
                      ${user.balance.toFixed(2)}
                    </p>
                    {user.active_vip ? (
                      <p className="text-xs text-green-500 mt-1">
                        {user.active_vip} ACTIVO
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary mt-1">Sin VIP</p>
                    )}
                    <p className="text-xs text-text-secondary mt-1">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <button
                    onClick={() => fetchUserNetwork(user.id)}
                    className="w-full px-3 py-2 bg-gold/20 text-gold rounded text-xs font-semibold hover:bg-gold/30 transition-colors"
                  >
                    Ver Red
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
