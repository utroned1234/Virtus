'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import BottomNav from '@/components/ui/BottomNav'
import ScreenshotProtection from '@/components/ui/ScreenshotProtection'

interface Purchase {
  id: string
  vip_package: {
    name: string
    level: number
  }
  investment_bs: number
  status: string
  created_at: string
  activated_at?: string
  is_upgrade: boolean
  upgraded_from_purchase_id: string | null
  upgraded_to_package: string | null
}

export default function MyPurchasesPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1]

      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/purchases/my', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setPurchases(data)
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500'
      case 'ACTIVE': return 'text-green-500'
      case 'REJECTED': return 'text-red-500'
      case 'CANCELLED': return 'text-text-secondary'
      default: return 'text-text-secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'ACTIVE': return 'Activo'
      case 'REJECTED': return 'Rechazado'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <p className="text-gold text-xl">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <ScreenshotProtection />
      <div className="max-w-screen-xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-sm font-bold text-gradient-gold-blue">Mis JADE</h1>
          <p className="mt-2 text-text-secondary uppercase tracking-wider text-sm font-light">
            Paquetes JADE adquiridos
          </p>
        </div>

        {purchases.length === 0 ? (
          <Card>
            <p className="text-center text-text-secondary">
              No tienes compras registradas
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const wasUpgraded = purchase.upgraded_to_package !== null

              // Tarjeta bloqueada: ya hizo upgrade desde este paquete
              if (wasUpgraded) {
                return (
                  <div key={purchase.id} className="relative">
                    <Card glassEffect>
                      <div className="absolute inset-0 bg-dark-card bg-opacity-80 rounded-card flex flex-col items-center justify-center z-10 gap-2 px-4 text-center">
                        <span className="text-3xl">🏆</span>
                        <p className="text-gold font-bold text-sm">¡Felicidades! Ya hiciste upgrade</p>
                        <p className="text-text-secondary text-xs">
                          Ahora tienes el paquete{' '}
                          <span className="text-gold font-semibold">{purchase.upgraded_to_package}</span>
                        </p>
                      </div>
                      <div className="blur-sm pointer-events-none space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-bold text-gold">{purchase.vip_package.name}</h3>
                            <p className="text-sm text-text-secondary">Nivel {purchase.vip_package.level}</p>
                          </div>
                          <span className="font-medium text-sm text-text-secondary">Cancelado</span>
                        </div>
                        <div className="border-t border-gold border-opacity-20 pt-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Inversión:</span>
                            <span className="font-medium text-text-primary">${purchase.investment_bs.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              }

              // Tarjeta normal
              return (
                <Card key={purchase.id} glassEffect>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-gold">
                          {purchase.vip_package.name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Nivel {purchase.vip_package.level}
                        </p>
                      </div>
                      <span className={`font-medium text-sm ${getStatusColor(purchase.status)}`}>
                        {getStatusText(purchase.status)}
                      </span>
                    </div>

                    <div className="border-t border-gold border-opacity-20 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Inversión:</span>
                        <span className="font-medium text-text-primary">
                          ${purchase.investment_bs.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-text-secondary pt-2 border-t border-gold border-opacity-20">
                      <p>Comprado: {new Date(purchase.created_at).toLocaleDateString('es-ES')}</p>
                      {purchase.activated_at && (
                        <p>Activado: {new Date(purchase.activated_at).toLocaleDateString('es-ES')}</p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <p className="mt-8 text-[10px] text-white/20 text-center px-4">
        © 2026 Virtus. Todos los derechos reservados. El contenido y la marca están protegidos por la legislación vigente.
      </p>

      <BottomNav />
    </div>
  )
}
