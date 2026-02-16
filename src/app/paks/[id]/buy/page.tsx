'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import { useToast } from '@/components/ui/Toast'
import WalletConnectPayment from '@/components/ui/WalletConnectPayment'

interface VipPackage {
  id: number
  level: number
  name: string
  investment_bs: number
  daily_profit_bs: number
}

interface ActivePurchase {
  id: string
  investment_bs: number
  vip_package: { level: number; name: string; investment_bs: number }
}

export default function BuyPackagePage() {
  const router = useRouter()
  const params = useParams()
  const packageId = params.id as string

  const [pkg, setPkg] = useState<VipPackage | null>(null)
  const [activePurchase, setActivePurchase] = useState<ActivePurchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  // Post-payment state
  const [purchaseId, setPurchaseId] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null)
  const [confirmations, setConfirmations] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1]

      // Fetch package info
      const res = await fetch(`/api/packages/${packageId}`)
      if (res.ok) {
        const data = await res.json()
        setPkg(data)

        // Check if user has an active lower-tier package (upgrade scenario)
        if (token) {
          const myRes = await fetch('/api/purchases/my', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (myRes.ok) {
            const purchases = await myRes.json()
            const highest = purchases
              .filter((p: any) => p.status === 'ACTIVE')
              .sort((a: any, b: any) => (b.vip_package?.level ?? 0) - (a.vip_package?.level ?? 0))[0]

            if (highest && highest.vip_package?.level < data.level) {
              setActivePurchase({
                id: highest.id,
                investment_bs: highest.vip_package.investment_bs,
                vip_package: {
                  level: highest.vip_package.level,
                  name: highest.vip_package.name,
                  investment_bs: highest.vip_package.investment_bs,
                },
              })
            }
          }
        }
      } else {
        setError('Paquete no encontrado')
      }
    } catch {
      setError('Error al cargar el paquete')
    } finally {
      setLoading(false)
    }
  }

  // Poll purchase status after payment
  useEffect(() => {
    if (!purchaseId) return

    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1]

    if (!token) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/purchases/check?id=${purchaseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setConfirmations(data.block_confirmations || 0)
          setPurchaseStatus(data.status)

          if (data.status === 'ACTIVE' || data.status === 'REJECTED') {
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [purchaseId])

  // Also trigger a verification immediately after submitting
  useEffect(() => {
    if (!purchaseId) return

    const triggerVerify = async () => {
      try {
        // Use internal proxy that adds the secret server-side (never expose secret in client)
        await fetch('/api/purchases/trigger-verify', { method: 'POST' })
      } catch {
        // Silent - cron will handle it
      }
    }

    // Trigger after 15 seconds (give BSC time to confirm)
    const timeout = setTimeout(triggerVerify, 15000)
    return () => clearTimeout(timeout)
  }, [purchaseId])

  const handlePaymentSuccess = useCallback((id: string, hash: string) => {
    setPurchaseId(id)
    setTxHash(hash)
    setPurchaseStatus('PENDING_VERIFICATION')
  }, [])

  const handlePaymentError = useCallback((message: string) => {
    showToast(message, 'error')
    setError(message)
    setTimeout(() => setError(''), 5000)
  }, [showToast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#34D399] mx-auto mb-3"></div>
          <p className="text-[#34D399] text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error && !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-xl">{error}</p>
      </div>
    )
  }

  if (!pkg) return null

  const isUpgrade = activePurchase !== null
  const amountToPay = isUpgrade
    ? pkg.investment_bs - activePurchase!.investment_bs
    : pkg.investment_bs

  // Estado: Compra / Upgrade activado
  if (purchaseStatus === 'ACTIVE') {
    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="glass-card !p-8 text-center space-y-5 w-full">
            <div className="w-20 h-20 rounded-full bg-[#34D399]/20 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-[#34D399]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {isUpgrade ? 'Upgrade Activado' : 'Paquete Activado'}
              </h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#34D399]/15 border border-[#34D399]/30">
                <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                <span className="text-sm font-semibold text-[#34D399]">ACTIVO</span>
              </div>
            </div>

            <p className="text-white/60 text-sm leading-relaxed">
              {isUpgrade
                ? `Tu plan ha sido actualizado a ${pkg.name} exitosamente.`
                : `Tu ${pkg.name} ha sido activado exitosamente.`}
              {' '}Tus ganancias diarias de ${pkg.daily_profit_bs} USDT ya estan activas.
            </p>

            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] underline block"
              >
                Ver transaccion en BscScan
              </a>
            )}

            <div className="pt-3 space-y-3">
              <button
                onClick={() => router.push('/my-purchases')}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                }}
              >
                Ver Mis Compras
              </button>
              <button
                onClick={() => router.push('/paks')}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 border border-[#34D399]/30 text-[#34D399] hover:bg-[#34D399]/10"
              >
                Volver a Paquetes
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Estado: Rechazado
  if (purchaseStatus === 'REJECTED') {
    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="glass-card !p-8 text-center space-y-5 w-full">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">Pago No Verificado</h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/30">
                <span className="text-sm font-semibold text-red-400">RECHAZADO</span>
              </div>
            </div>

            <p className="text-white/60 text-sm leading-relaxed">
              La transaccion no pudo ser verificada. Verifica que hayas enviado
              el monto correcto en USDT (BEP-20) a la direccion correcta.
            </p>

            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] underline block"
              >
                Ver transaccion en BscScan
              </a>
            )}

            <button
              onClick={() => {
                setPurchaseId(null)
                setTxHash(null)
                setPurchaseStatus(null)
                setConfirmations(0)
                setError('')
              }}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 border border-white/20 text-white hover:bg-white/5"
            >
              Intentar de Nuevo
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Estado: Verificando en blockchain
  if (purchaseStatus === 'PENDING_VERIFICATION' && txHash) {
    const requiredConfs = 3
    const progress = Math.min((confirmations / requiredConfs) * 100, 100)

    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="glass-card !p-8 text-center space-y-5 w-full">
            <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[#3B82F6] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-white">Verificando en Blockchain</h2>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#3B82F6] to-[#34D399] h-3 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/60">
              {confirmations}/{requiredConfs} confirmaciones
            </p>

            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#3B82F6] underline"
            >
              Ver transaccion en BscScan
            </a>

            <p className="text-[10px] text-white/40">
              Tu paquete se activara automaticamente al completar las confirmaciones.
              Puedes cerrar esta pagina.
            </p>

            <button
              onClick={() => router.push('/my-purchases')}
              className="w-full py-3 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 border border-white/20 text-white/60 hover:bg-white/5"
            >
              Ver Mis Compras
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Estado principal: Selección de pago
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center pt-2 pb-1">
          <h1 className="text-2xl font-bold text-white">{pkg.name}</h1>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">
            {isUpgrade ? 'Upgrade de Plan' : 'Completa tu compra'}
          </p>
        </div>

        {/* Detalles del paquete */}
        <div className="glass-card !p-4 space-y-2">
          {isUpgrade && activePurchase && (
            <div className="flex justify-between items-center text-xs text-white/50 pb-2 border-b border-white/10">
              <span>Plan actual: {activePurchase.vip_package.name}</span>
              <span>${activePurchase.investment_bs.toLocaleString()} USD</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50 uppercase tracking-wider">
              {isUpgrade ? 'Nuevo plan' : 'Inversion'}
            </span>
            <span className="text-lg font-bold text-[#FBBF24]">${pkg.investment_bs.toLocaleString()} USD</span>
          </div>
          {isUpgrade && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50 uppercase tracking-wider">Pagas ahora</span>
              <span className="text-lg font-bold text-[#34D399]">+${amountToPay.toLocaleString()} USD</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50 uppercase tracking-wider">Ganancia diaria</span>
            <span className="text-lg font-bold text-[#34D399]">${pkg.daily_profit_bs} USD</span>
          </div>
          {isUpgrade && (
            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/40 text-center">
              El upgrade no genera bonos de patrocinio ni beneficio compartido
            </div>
          )}
        </div>

        {/* WalletConnect Payment - uses the difference amount for upgrades */}
        <WalletConnectPayment
          packageId={pkg.id}
          packageName={pkg.name}
          amountUsdt={amountToPay}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {error}
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
