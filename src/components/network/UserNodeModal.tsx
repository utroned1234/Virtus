'use client'

import { useEffect, useState } from 'react'

interface UserDetailData {
  id: string
  username: string
  full_name: string
  email: string
  user_code: string
  balance: number
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  sponsor: {
    full_name: string
    username: string
  } | null
  purchases: {
    id: string
    vip_package_name: string
    investment_bs: number
    status: 'ACTIVE' | 'PENDING' | 'REJECTED'
    purchase_date: string
    daily_percentage: number
    duration_days: number
  }[]
  total_earnings: number
}

interface UserNodeModalProps {
  userId: string
  token: string
  onClose: () => void
}

export default function UserNodeModal({ userId, token, onClose }: UserNodeModalProps) {
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/detail`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUserDetail(data)
        }
      } catch (error) {
        console.error('Error fetching user detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetail()
  }, [userId, token])

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVO') {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">ACTIVO</span>
    } else if (status === 'PENDIENTE') {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">PENDIENTE</span>
    } else {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">INACTIVO</span>
    }
  }

  const getPurchaseStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Activo</span>
    } else if (status === 'PENDING') {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pendiente</span>
    } else {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Rechazado</span>
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-dark-bg border-2 border-gold/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gold">Cargando detalles...</p>
          </div>
        ) : userDetail ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="text-5xl">👤</div>
                <div>
                  <h2 className="text-2xl font-bold text-gold">{userDetail.full_name}</h2>
                  <p className="text-text-secondary">@{userDetail.username}</p>
                  <div className="mt-2">{getStatusBadge(userDetail.status)}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-gold transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-card p-4 rounded-lg border border-gold/20">
                <p className="text-xs text-text-secondary mb-1">Email</p>
                <p className="text-sm text-text-primary">{userDetail.email}</p>
              </div>
              <div className="bg-dark-card p-4 rounded-lg border border-gold/20">
                <p className="text-xs text-text-secondary mb-1">Código</p>
                <p className="text-sm text-gold font-semibold">{userDetail.user_code}</p>
              </div>
              <div className="bg-dark-card p-4 rounded-lg border border-gold/20 col-span-2">
                <p className="text-xs text-text-secondary mb-1">Ganancias Totales</p>
                <p className="text-2xl text-green-400 font-bold">${userDetail.total_earnings.toFixed(2)}</p>
              </div>
            </div>

            {/* Patrocinador */}
            {userDetail.sponsor && (
              <div className="bg-dark-card p-4 rounded-lg border border-gold/20">
                <p className="text-xs text-text-secondary mb-2">Patrocinador</p>
                <p className="text-sm text-text-primary">
                  {userDetail.sponsor.full_name} <span className="text-text-secondary">(@{userDetail.sponsor.username})</span>
                </p>
              </div>
            )}

            {/* VIP Packages */}
            <div>
              <h3 className="text-lg font-bold text-gold mb-3">Paquetes JADE</h3>
              {userDetail.purchases.length === 0 ? (
                <div className="bg-dark-card p-4 rounded-lg border border-gold/20 text-center">
                  <p className="text-text-secondary text-sm">Sin paquetes JADE</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDetail.purchases.map((purchase) => (
                    <div key={purchase.id} className="bg-dark-card p-4 rounded-lg border border-gold/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-text-primary">{purchase.vip_package_name}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {new Date(purchase.purchase_date).toLocaleDateString('es-ES')}
                          </p>
                          <div className="mt-2">
                            <p className="text-xs text-text-secondary">Inversión</p>
                            <p className="text-lg text-gold font-bold">${purchase.investment_bs.toFixed(2)}</p>
                          </div>
                        </div>
                        <div>
                          {getPurchaseStatusBadge(purchase.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors font-semibold"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-red-500">Error al cargar los detalles</p>
          </div>
        )}
      </div>
    </div>
  )
}
