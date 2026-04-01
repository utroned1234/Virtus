'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface UserDetailData {
  id: string
  username: string
  full_name: string
  email: string
  user_code: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  balance: number
  created_at: string
  sponsor: {
    full_name: string
    username: string
  } | null
  purchases: {
    id: string
    vip_package_name: string
    investment_bs: number
    daily_profit_bs: number
    status: 'ACTIVE' | 'PENDING' | 'REJECTED'
    activated_at: string | null
    created_at: string
  }[]
}

interface UserDetailModalProps {
  userId: string
  token: string
  onClose: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVO':
    case 'ACTIVE':
      return 'bg-green-500 text-white'
    case 'INACTIVO':
    case 'REJECTED':
      return 'bg-red-500 text-white'
    case 'PENDIENTE':
    case 'PENDING':
      return 'bg-yellow-500 text-black'
    default:
      return 'bg-gray-500 text-white'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVO'
    case 'PENDING':
      return 'PENDIENTE'
    case 'REJECTED':
      return 'RECHAZADO'
    default:
      return status
  }
}

export default function UserDetailModal({ userId, token, onClose }: UserDetailModalProps) {
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserDetail()
  }, [userId])

  const fetchUserDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUserDetail(data)
      } else {
        setError('Error al cargar el detalle del usuario')
      }
    } catch (err) {
      console.error('Error fetching user detail:', err)
      setError('Error al cargar el detalle del usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-bg rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card glassEffect>
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-gold border-opacity-20">
            <div>
              <h2 className="text-2xl font-bold text-gold">{loading ? 'Cargando...' : userDetail?.full_name}</h2>
              {userDetail && (
                <p className="text-sm text-text-secondary">@{userDetail.username}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-gold transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-gold">Cargando detalles...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!loading && !error && userDetail && (
            <div className="space-y-6">
              {/* Info General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(userDetail.status)}`}>
                    {userDetail.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Saldo</p>
                  <p className="text-2xl font-bold text-gold">${userDetail.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Código</p>
                  <p className="text-text-primary font-mono">{userDetail.user_code}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Email</p>
                  <p className="text-text-primary">{userDetail.email}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Fecha de registro</p>
                  <p className="text-text-primary">
                    {new Date(userDetail.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {userDetail.sponsor && (
                  <div>
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Sponsor</p>
                    <p className="text-text-primary font-semibold">{userDetail.sponsor.full_name}</p>
                    <p className="text-sm text-text-secondary">@{userDetail.sponsor.username}</p>
                  </div>
                )}
              </div>

              {/* Tabla de Compras/VIPs */}
              <div>
                <h3 className="text-lg font-bold text-gold mb-4">
                  Paquetes VIP ({userDetail.purchases.length})
                </h3>
                {userDetail.purchases.length === 0 ? (
                  <p className="text-center text-text-secondary py-4">
                    No tiene compras registradas
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gold border-opacity-20">
                          <th className="text-left py-3 px-2 text-text-secondary font-semibold">Paquete</th>
                          <th className="text-right py-3 px-2 text-text-secondary font-semibold">Inversión</th>
                          <th className="text-right py-3 px-2 text-text-secondary font-semibold">Ganancia Diaria</th>
                          <th className="text-center py-3 px-2 text-text-secondary font-semibold">Estado</th>
                          <th className="text-center py-3 px-2 text-text-secondary font-semibold">F. Solicitud</th>
                          <th className="text-center py-3 px-2 text-text-secondary font-semibold">F. Activación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetail.purchases.map((purchase) => (
                          <tr key={purchase.id} className="border-b border-gold border-opacity-10">
                            <td className="py-3 px-2 text-text-primary font-semibold">
                              {purchase.vip_package_name}
                            </td>
                            <td className="py-3 px-2 text-right text-gold">
                              ${purchase.investment_bs.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right text-gold-bright">
                              ${purchase.daily_profit_bs.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(purchase.status)}`}>
                                {getStatusText(purchase.status)}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center text-text-secondary text-xs">
                              {new Date(purchase.created_at).toLocaleDateString('es-ES')}
                            </td>
                            <td className="py-3 px-2 text-center text-text-secondary text-xs">
                              {purchase.activated_at
                                ? new Date(purchase.activated_at).toLocaleDateString('es-ES')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
