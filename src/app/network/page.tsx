'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import BottomNav from '@/components/ui/BottomNav'
import ScreenshotProtection from '@/components/ui/ScreenshotProtection'

interface ReferralUser {
  id: string
  username: string
  full_name: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  vip_packages: { name: string; level: number; status: string }[]
  referrals: ReferralUser[]
}

export default function NetworkPage() {
  const router = useRouter()
  const [network, setNetwork] = useState<ReferralUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedUser, setSelectedUser] = useState<ReferralUser | null>(null)

  useEffect(() => {
    fetchNetwork()
  }, [])

  /* Robust Network Fetcher */
  const fetchNetwork = async () => {
    try {
      // 1. Try extracting token from loose cookies
      const tokenMatch = document.cookie.match(/auth_token=([^;]+)/)
      const token = tokenMatch ? tokenMatch[1] : null

      // 2. Prepare headers (explicit auth or rely on cookie)
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/user/network', {
        headers,
        credentials: 'include', // Ensure cookies are sent even if HttpOnly
      })

      if (res.ok) {
        const data = await res.json()
        setNetwork(data)
      } else {
        const errorText = await res.text()
        console.error('API Error:', res.status, errorText)
        if (res.status === 401) {
          router.push('/login')
          return
        }
        try {
          const jsonError = JSON.parse(errorText)
          setError(jsonError.error || `Error ${res.status}: No se pudo cargar la red`)
        } catch (e) {
          setError(`Error ${res.status}: Fallo en el servidor`)
        }
      }
    } catch (error) {
      console.error('Error fetching network:', error)
      setError('Error de conexión al cargar la red')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVO':
        return '🟢'
      case 'INACTIVO':
        return '🔴'
      case 'PENDIENTE':
        return '🟠'
      default:
        return '⚪'
    }
  }

  const countReferrals = (user: ReferralUser): number => {
    return user.referrals.reduce((total, ref) => {
      return total + 1 + countReferrals(ref)
    }, 0)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanX(e.clientX - dragStart.x)
    setPanY(e.clientY - dragStart.y)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    setIsDragging(true)
    const touch = e.touches[0]
    setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setPanX(touch.clientX - dragStart.x)
    setPanY(touch.clientY - dragStart.y)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const resetView = () => {
    setZoom(100)
    setPanX(0)
    setPanY(0)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Pendiente'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /* Robust Recursive Tree Renderer (Div-based) */
  const renderTree = (node: ReferralUser) => {
    const hasChildren = node.referrals && node.referrals.length > 0

    return (
      <div key={node.id} className="flex flex-col items-center relative px-2">
        {/* Node Card */}
        <div
          className="relative z-10 flex flex-col items-center group cursor-pointer p-2 transition-transform hover:scale-105"
          onClick={() => setSelectedUser(node)}
        >
          {/* Avatar Container */}
          <div className="relative mb-2">
            <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-dark-bg flex items-center justify-center shadow-lg ${node.status === 'ACTIVO' ? 'border-green-400 shadow-green-400/20' :
              node.status === 'PENDIENTE' ? 'border-orange-400' : 'border-gray-600'
              }`}>
              <span className="text-xs font-bold text-white">
                {node.username.substring(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-dark-bg border border-dark-card flex items-center justify-center text-[8px]">
              {getStatusIcon(node.status)}
            </div>

            {node.vip_packages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center text-[8px] font-bold text-black border border-white animate-pulse">
                {node.vip_packages.length}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded border border-white/5">
            <p className="text-[10px] font-bold text-white truncate max-w-[80px] group-hover:text-gold">
              {node.username}
            </p>
          </div>
        </div>

        {/* Lines and Children */}
        {hasChildren && (
          <div className="flex flex-col items-center">
            {/* Vertical Line Down from Parent */}
            <div className="w-px h-6 bg-gold/50"></div>

            {/* Horizontal Bar */}
            <div className="relative flex items-start justify-center gap-4">
              {/* Connecting Bar */}
              {node.referrals.length > 1 && (
                <div className="absolute top-0 h-px bg-gold/50"
                  style={{
                    left: '0',
                    right: '0',
                    // Logic to clamp bar to centers of first/last child needs absolute positioning relative to this container
                    // Simplification: Standard full width bar minus padding
                    width: '100%',
                    // Actually, to make it perfect without JS, we can use the technique of children having "Up Lines" that meet a "Cross Bar"
                  }}
                ></div>
              )}

              {/* Children Wrapper */}
              <div className="flex">
                {node.referrals.map((child, index) => (
                  <div key={child.id} className="flex flex-col items-center relative pt-4">
                    {/* Up Line for Child */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-gold/50"></div>

                    {/* Horizontal Bar Segments (Left/Right) for this child slot to connect to neighbors */}
                    {node.referrals.length > 1 && (
                      <>
                        {/* Right connector (if not last) */}
                        {index < node.referrals.length - 1 && (
                          <div className="absolute top-0 right-0 w-1/2 h-px bg-gold/50"></div>
                        )}
                        {/* Left connector (if not first) */}
                        {index > 0 && (
                          <div className="absolute top-0 left-0 w-1/2 h-px bg-gold/50"></div>
                        )}
                      </>
                    )}

                    {renderTree(child)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gold text-sm font-light animate-pulse">Cargando árbol de red...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pb-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-sm text-red-400 font-bold">Error</h2>
        <p className="text-text-secondary">{error}</p>
        <button
          onClick={fetchNetwork}
          className="px-6 py-2 bg-dark-card border border-gold/30 text-gold rounded-full hover:bg-gold hover:text-dark-bg transition-all"
        >
          Reintentar
        </button>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 overflow-hidden relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-azul-armada via-azul-noche to-black">
      <ScreenshotProtection />
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 max-w-screen-2xl mx-auto h-full flex flex-col">
        {/* Header Flotante */}
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="text-center pointer-events-auto mt-2">
            <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-white to-gold animate-shine">
              Mi Red Global
            </h1>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs font-mono">
              <span className="bg-dark-card/80 px-3 py-1 rounded-full border border-gold/20 text-gold">
                Total: {network ? countReferrals(network) : 0}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(20, z - 10))} className="w-6 h-6 bg-dark-card rounded flex items-center justify-center hover:bg-gold/20">-</button>
                <span className="w-8 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="w-6 h-6 bg-dark-card rounded flex items-center justify-center hover:bg-gold/20">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Área de Visualización del Árbol - Pantalla Completa */}
        <div className="flex-1 overflow-auto relative w-full" style={{ minHeight: 'calc(100vh - 60px)' }}>

          <div className="min-w-max min-h-full flex justify-center pt-32 pb-10 px-4 transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            {network ? (
              <div className="flex flex-col items-center">
                {renderTree(network)}

                {(!network.referrals || network.referrals.length === 0) && (
                  <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded text-gray-300 text-center max-w-xs backdrop-blur-sm">
                    <p className="font-bold text-gold">⚠️ Red Unipersonal</p>
                    <p className="text-sm mt-1">Aún no tienes referidos registrados debajo de ti.</p>
                    <p className="text-xs mt-2 text-gray-400">Invita a usuarios para ver crecer tu árbol.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-white">
                <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gold animate-pulse">Cargando red...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedUser(null)}
        >
          <Card glassEffect className="max-w-md w-full animate-bounce-slow border-gold/30">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-base font-bold bg-dark-bg ${selectedUser.status === 'ACTIVO' ? 'border-green-400 text-green-400' : 'border-gray-500 text-gray-500'}`}>
                    {selectedUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedUser.full_name}</h2>
                    <p className="text-sm text-gold">@{selectedUser.username}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${selectedUser.status === 'ACTIVO' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/5">
                <div className="bg-dark-bg/50 p-3 rounded-lg text-center">
                  <p className="text-base font-bold text-white">{selectedUser.referrals?.length || 0}</p>
                  <p className="text-[10px] text-text-secondary uppercase">Referidos</p>
                </div>
                <div className="bg-dark-bg/50 p-3 rounded-lg text-center">
                  <p className="text-base font-bold text-gold">{selectedUser.vip_packages?.length || 0}</p>
                  <p className="text-[10px] text-text-secondary uppercase">Paks Activos</p>
                </div>
              </div>

              {/* VIP Packages List */}
              {selectedUser.vip_packages && selectedUser.vip_packages.length > 0 && (
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wider sticky top-0 bg-dark-card/95 py-1">Paquetes JADE</p>
                  {selectedUser.vip_packages.map((pkg, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                      <span className="text-sm text-white font-medium">{pkg.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${pkg.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {pkg.status === 'ACTIVE' ? 'ACTIVO' : 'PENDIENTE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* View Profile Action */}
              <button className="w-full py-3 bg-gradient-to-r from-azul-acero to-azul-armada rounded-xl text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95">
                Ver Perfil Completo
              </button>
            </div>
          </Card>
        </div>
      )}

      <p className="mt-8 text-[10px] text-white/20 text-center px-4">
        © 2026 Virtus. Todos los derechos reservados. El contenido y la marca están protegidos por la legislación vigente.
      </p>

      <BottomNav />
    </div>
  )
}
