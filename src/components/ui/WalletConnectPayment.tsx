'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ethers, BrowserProvider, Contract } from 'ethers'
import { useToast } from '@/components/ui/Toast'
import { USDT_BSC_ADDRESS, PAYMENT_RECEIVER, ERC20_ABI, USDT_DECIMALS } from '@/lib/usdt'

interface WalletConnectPaymentProps {
  packageId: number
  packageName: string
  amountUsdt: number
  onSuccess: (purchaseId: string, txHash: string) => void
  onError: (message: string) => void
}

type PaymentStep = 'connect' | 'confirm' | 'sending'

export default function WalletConnectPayment({
  packageId,
  packageName,
  amountUsdt,
  onSuccess,
  onError,
}: WalletConnectPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('connect')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const { showToast } = useToast()
  const unsubRef = useRef<(() => void) | null>(null)

  // Subscribe to account changes on mount
  useEffect(() => {
    const setup = async () => {
      try {
        const { getAppKit } = await import('@/lib/web3modal')
        const appKit = getAppKit()
        if (!appKit) return

        // Check if already connected
        const addr = appKit.getAddress()
        if (addr && appKit.getIsConnectedState()) {
          setWalletAddress(addr)
          setStep('confirm')
          fetchBalance(addr)
        }

        // Subscribe to account changes
        const unsub = appKit.subscribeAccount((account: any) => {
          if (account.address && account.isConnected) {
            setWalletAddress(account.address)
            setStep('confirm')
            fetchBalance(account.address)
          } else if (!account.isConnected) {
            setWalletAddress('')
            setStep('connect')
          }
        })
        unsubRef.current = unsub
      } catch (err) {
        console.error('Error setting up AppKit:', err)
      }
    }
    setup()

    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  const fetchBalance = useCallback(async (address: string) => {
    try {
      // Use direct BSC RPC to check balance (independent of wallet chain)
      const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/')
      const usdtContract = new Contract(USDT_BSC_ADDRESS, ERC20_ABI, bscProvider)
      const balance = await usdtContract.balanceOf(address)
      const formatted = ethers.formatUnits(balance, USDT_DECIMALS)
      setUsdtBalance(parseFloat(formatted).toFixed(2))

      // Also check which chain the wallet is on
      try {
        const { getAppKit } = await import('@/lib/web3modal')
        const appKit = getAppKit()
        if (appKit) {
          const walletProvider = appKit.getWalletProvider()
          if (walletProvider) {
            const wp = new BrowserProvider(walletProvider as any)
            const network = await wp.getNetwork()
            setDebugInfo(`Chain: ${network.chainId}, BSC Balance: ${formatted} USDT, Address: ${address}`)
          }
        }
      } catch (e) {
        setDebugInfo(`BSC Balance: ${formatted} USDT, Address: ${address}`)
      }

    } catch (error) {
      console.error('Error fetching balance:', error)
      setDebugInfo('Error balance: ' + (error as any)?.message)
      setUsdtBalance(null)
    }
  }, [])

  const connectWallet = useCallback(async () => {
    try {
      setDebugInfo('Iniciando conexión...')
      const { getAppKit } = await import('@/lib/web3modal')
      const appKit = getAppKit()
      if (!appKit) {
        setDebugInfo('Error: AppKit no inicializado (Falta Project ID)')
        onError('WalletConnect no configurado. Falta Project ID.')
        return
      }

      await appKit.open()
      setDebugInfo('Modal abierto, esperando conexión...')

    } catch (err: any) {
      console.error('Wallet connect error:', err)
      setDebugInfo('Error: ' + err.message)
      onError('Error al conectar wallet: ' + (err.message || 'Desconocido'))
    }
  }, [onError])

  const manualCheck = async () => {
    try {
      setDebugInfo('Verificando manualmente...')
      const { getAppKit } = await import('@/lib/web3modal')
      const appKit = getAppKit()
      if (appKit) {
        const addr = appKit.getAddress()
        const isConnected = appKit.getIsConnectedState()
        setDebugInfo(`Manual: Address=${addr || 'null'}, Connected=${isConnected}`)
        if (addr && isConnected) {
          setWalletAddress(addr)
          setStep('confirm')
          fetchBalance(addr)
          showToast('Conexión detectada', 'success')
        } else {
          showToast('No se detecta conexión activa', 'error')
        }
      }
    } catch (e: any) {
      setDebugInfo('Error manual: ' + e.message)
    }
  }

  const sendPayment = useCallback(async () => {
    setIsProcessing(true)
    try {
      const { getAppKit } = await import('@/lib/web3modal')
      const appKit = getAppKit()
      if (!appKit) {
        onError('WalletConnect no configurado')
        return
      }

      const addr = appKit.getAddress()
      if (!addr || !appKit.getIsConnectedState()) {
        onError('Wallet no conectada')
        setStep('connect')
        return
      }

      const walletProvider = appKit.getWalletProvider()
      if (!walletProvider) {
        onError('No se pudo obtener el proveedor de la wallet')
        return
      }

      const provider = new BrowserProvider(walletProvider as any)
      const signer = await provider.getSigner()

      // Create USDT contract instance
      const usdtContract = new Contract(USDT_BSC_ADDRESS, ERC20_ABI, signer)

      // Convert amount to wei (18 decimals for BSC USDT)
      const amountWei = ethers.parseUnits(amountUsdt.toString(), USDT_DECIMALS)

      // Check balance
      const balance = await usdtContract.balanceOf(addr)
      if (balance < amountWei) {
        const balanceFormatted = ethers.formatUnits(balance, USDT_DECIMALS)
        onError(`Saldo USDT insuficiente. Tienes ${parseFloat(balanceFormatted).toFixed(2)} USDT`)
        setIsProcessing(false)
        return
      }

      setStep('sending')
      showToast('Confirma la transaccion en tu wallet...', 'info')

      // Send USDT transfer
      const tx = await usdtContract.transfer(PAYMENT_RECEIVER, amountWei)

      // Submit purchase to backend with tx_hash
      const token = document.cookie
        .split('; ')
        .find((row: string) => row.startsWith('auth_token='))
        ?.split('=')[1]

      if (!token) {
        onError('Sesion expirada. Inicia sesion nuevamente.')
        return
      }

      const purchaseRes = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vip_package_id: packageId,
          tx_hash: tx.hash,
        }),
      })

      if (!purchaseRes.ok) {
        const data = await purchaseRes.json()
        onError(data.error || 'Error al registrar la compra')
        return
      }

      const { purchase } = await purchaseRes.json()
      showToast('Transaccion enviada. Verificando en blockchain...', 'success')
      onSuccess(purchase.id, tx.hash)
    } catch (err: any) {
      console.error('Payment error:', err)

      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        onError('Transaccion cancelada por el usuario')
        setStep('confirm')
      } else {
        onError('Error al enviar pago: ' + (err.shortMessage || err.message || 'Desconocido'))
      }
    } finally {
      setIsProcessing(false)
    }
  }, [amountUsdt, packageId, showToast, onSuccess, onError])

  const disconnectWallet = useCallback(async () => {
    const { getAppKit } = await import('@/lib/web3modal')
    const appKit = getAppKit()
    if (appKit) await appKit.disconnect()
    setWalletAddress('')
    setStep('connect')
  }, [])

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : ''

  return (
    <div className="space-y-4">
      {/* Step 1: Connect Wallet */}
      {step === 'connect' && (
        <div className="glass-card !p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#FBBF24]/20 flex items-center justify-center text-[#FBBF24] text-xs font-bold">1</span>
            <h2 className="text-sm font-bold text-[#FBBF24] uppercase tracking-wider">Conectar Trust Wallet</h2>
          </div>

          <p className="text-[10px] text-white/50">
            Conecta tu Trust Wallet via WalletConnect para realizar el pago de forma segura en la red BSC.
          </p>

          <button
            onClick={connectWallet}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6a2.25 2.25 0 012.25-2.25h13.5m-3 0V3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" />
              </svg>
              Conectar Wallet
            </span>
          </button>

          <p className="text-[10px] text-white/30 text-center">
            Se abrira un QR code. Escanea con Trust Wallet o selecciona tu wallet.
          </p>

          <div className="pt-2 border-t border-white/5">
            <button
              onClick={manualCheck}
              className="w-full py-2 text-xs text-[#34D399] underline"
            >
              ¿Ya conectaste? Verificar Conexión
            </button>
            {debugInfo && (
              <p className="text-[9px] text-white/30 text-center mt-1 font-mono">
                Debug: {debugInfo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Confirm Payment */}
      {step === 'confirm' && (
        <div className="glass-card !p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#34D399] text-xs font-bold">2</span>
            <h2 className="text-sm font-bold text-[#34D399] uppercase tracking-wider">Confirmar Pago</h2>
          </div>

          {/* Connected wallet */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-xs text-white/70 font-mono">{shortAddress}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              Desconectar
            </button>
          </div>

          {/* Payment summary */}
          <div className="space-y-2 px-3 py-3 rounded-xl bg-white/5 border border-[#FBBF24]/20">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Paquete:</span>
              <span className="text-white font-semibold">{packageName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Token:</span>
              <span className="text-white font-semibold">USDT (BEP-20)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Red:</span>
              <span className="text-white font-semibold">BNB Smart Chain</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Monto:</span>
              <span className="text-[#FBBF24] font-bold text-base">${amountUsdt} USDT</span>
            </div>

            {usdtBalance && (
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between text-xs">
                <span className="text-white/50">Tu Saldo:</span>
                <span className={`${parseFloat(usdtBalance) >= amountUsdt ? 'text-[#34D399]' : 'text-red-400'} font-bold`}>
                  {usdtBalance} USDT
                </span>
              </div>
            )}
          </div>

          <button
            onClick={sendPayment}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
            }}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Procesando...
              </span>
            ) : (
              `Pagar $${amountUsdt} USDT`
            )}
          </button>

          {debugInfo && (
            <p className="text-[9px] text-white/30 text-center mt-1 font-mono break-all">
              {debugInfo}
            </p>
          )}
        </div>
      )}

      {/* Step 3: Sending */}
      {step === 'sending' && (
        <div className="glass-card !p-4 space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34D399] mx-auto" />
          <h3 className="text-white font-bold">Enviando transaccion...</h3>
          <p className="text-xs text-white/50">
            Confirma la transaccion en tu Trust Wallet.
            No cierres esta pagina.
          </p>
        </div>
      )}
    </div>
  )
}
