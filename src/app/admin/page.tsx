'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Image from 'next/image'
import ManualAdjustTab from '@/components/admin/ManualAdjustTab'
import ConfigTab from '@/components/admin/ConfigTab'
import TasksTab from '@/components/admin/TasksTab'
import FuturosAdminTab from '@/components/admin/FuturosAdminTab'
import { useToast } from '@/components/ui/Toast'

type Tab =
  | 'purchases'
  | 'withdrawals'
  | 'adjust'
  | 'active-users'
  | 'news'
  | 'config'
  | 'futuros'
  | 'rangos'

interface Purchase {
  id: string
  user: {
    id: string
    username: string
    full_name: string
    email: string
  }
  vip_package: {
    name: string
    level: number
  }
  investment_bs: number
  receipt_url?: string
  tx_hash?: string
  block_confirmations?: number
  created_at: string
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED'
}

interface Withdrawal {
  id: string
  user: {
    username: string
    full_name: string
    email: string
  }
  amount_bs: number
  total_earnings_bs: number
  phone_number: string
  bank_name?: string
  account_number?: string
  payout_method?: string
  qr_image_url: string
  receipt_url?: string
  created_at: string
}

interface ActiveUser {
  user: {
    username: string
    full_name: string
    email: string
  }
  active_packages: {
    name: string
    level: number
    created_at: string | null
    activated_at: string | null
  }[]
  earnings: {
    adjustments: {
      items: Array<{
        amount: number
        type: 'ABONADO' | 'DESCUENTO'
        description: string
      }>
      total: number
    }
    referralBonus: {
      byLevel: Array<{
        level: string
        amount: number
      }>
      total: number
    }
    totalEarnings: number
  }
}

interface Announcement {
  id: number
  title: string
  body: string
  is_active: boolean
  created_at: string
}



interface VipPackage {
  id: number
  level: number
  name: string
  investment_bs: number
  daily_profit_bs: number
  is_enabled: boolean
}

interface BonusRule {
  id: number
  level: number
  percentage: number
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('purchases')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchasesTotal, setPurchasesTotal] = useState(0)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const [newsTitle, setNewsTitle] = useState('')
  const [newsBody, setNewsBody] = useState('')
  const [newsActive, setNewsActive] = useState(true)
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [token, setToken] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  // ...

  const pageSize = 30
  const [purchasesOffset, setPurchasesOffset] = useState(0)
  const [purchasesHasMore, setPurchasesHasMore] = useState(true)
  const [withdrawalsOffset, setWithdrawalsOffset] = useState(0)
  const [withdrawalsHasMore, setWithdrawalsHasMore] = useState(true)
  const [activeOffset, setActiveOffset] = useState(0)
  const [activeHasMore, setActiveHasMore] = useState(true)

  // Rangos state
  interface RankUser {
    id: string
    username: string
    full_name: string
    user_code: string
    current_rank: number
    current_rank_title: string | null
    eligible_rank: number
    eligible_rank_title: string | null
    stats: {
      frontals_activos: number
      total_org: number
      own_package: number
    }
  }
  const [ranksData, setRanksData] = useState<RankUser[]>([])
  const [rankCounts, setRankCounts] = useState<Record<number, number>>({})
  const [ranksLoading, setRanksLoading] = useState(false)
  const [ranksSearch, setRanksSearch] = useState('')
  const [recalculating, setRecalculating] = useState(false)

  // Config states
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [adminVerified, setAdminVerified] = useState(false)
  const [adminChecking, setAdminChecking] = useState(true)
  const [selectedWithdrawalForReceipt, setSelectedWithdrawalForReceipt] = useState<Withdrawal | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptUploading, setReceiptUploading] = useState(false)

  // Activación manual de paquete
  const [manualUsers, setManualUsers] = useState<{ id: string; username: string; full_name: string }[]>([])
  const [manualUserSearch, setManualUserSearch] = useState('')
  const [manualSelectedUser, setManualSelectedUser] = useState<{ id: string; username: string; full_name: string } | null>(null)
  const [manualSelectedPackage, setManualSelectedPackage] = useState<number | null>(null)
  const [manualActivating, setManualActivating] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)

  // Upgrade manual de paquete
  const [upgradeUsers, setUpgradeUsers] = useState<{ id: string; username: string; full_name: string }[]>([])
  const [upgradeUserSearch, setUpgradeUserSearch] = useState('')
  const [upgradeSelectedUser, setUpgradeSelectedUser] = useState<{ id: string; username: string; full_name: string } | null>(null)
  const [upgradeSelectedPackage, setUpgradeSelectedPackage] = useState<number | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgradeForm, setShowUpgradeForm] = useState(false)


  useEffect(() => {
    // Get token only on client side
    if (typeof window !== 'undefined') {
      const cookieToken = document.cookie.match(/auth_token=([^;]+)/)?.[1] || ''
      setToken(cookieToken)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    if (tab === 'purchases') {
      setPurchases([])
      setPurchasesOffset(0)
      setPurchasesHasMore(true)
      fetchPurchases(0, false)
    } else if (tab === 'withdrawals') {
      setWithdrawals([])
      setWithdrawalsOffset(0)
      setWithdrawalsHasMore(true)
      fetchWithdrawals(0, false)
    } else if (tab === 'active-users') {
      setActiveUsers([])
      setActiveOffset(0)
      setActiveHasMore(true)
      fetchActiveUsers(0, false)
    } else if (tab === 'news') {
      fetchNews()
    } else if (tab === 'rangos') {
      fetchRanks('')
    }
  }, [tab, token])

  // Auto-refresh removido - El panel se actualiza al aprobar/rechazar compras


  useEffect(() => {
    if (token) {
      fetchConfigData()
    }
  }, [token])

  const getToken = () => {
    return token
  }

  const handleAuthRedirect = (status: number) => {
    if (status === 401) {
      router.push('/login')
      return
    }
    if (status === 403) {
      showToast('Acceso solo para administradores', 'error')
      router.push('/home')
    }
  }

  const fetchConfigData = async () => {
    setConfigLoading(true)
    setAdminChecking(true)
    try {
      const [pkgRes, bonusRes] = await Promise.all([
        fetch('/api/admin/vip-packages', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/bonus-rules', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (pkgRes.status === 401 || pkgRes.status === 403) {
        handleAuthRedirect(pkgRes.status)
        return
      }
      if (bonusRes.status === 401 || bonusRes.status === 403) {
        handleAuthRedirect(bonusRes.status)
        return
      }

      if (pkgRes.ok || bonusRes.ok) {
        setAdminVerified(true)
      }
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json()
        setPackages(pkgData)
      }
      if (bonusRes.ok) {
        const bonusData = await bonusRes.json()
        setBonusRules(bonusData)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setConfigLoading(false)
      setAdminChecking(false)
    }
  }

  const updatePackage = async (pkg: VipPackage) => {
    setSaving(`pkg-${pkg.id}`)
    try {
      const res = await fetch('/api/admin/vip-packages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pkg),
      })

      if (res.ok) {
        showToast('Paquete actualizado correctamente', 'success')
        fetchConfigData()
      } else {
        showToast('Error al actualizar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setSaving(null)
    }
  }

  const updateBonus = async (rule: BonusRule) => {
    setSaving(`bonus-${rule.id}`)
    try {
      const res = await fetch('/api/admin/bonus-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rule),
      })

      if (res.ok) {
        showToast('Bono actualizado correctamente. Aplica a todos los usuarios.', 'success')
        fetchConfigData()
      } else {
        showToast('Error al actualizar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setSaving(null)
    }
  }

  const updatePackageField = (pkgId: number, field: keyof VipPackage, value: any) => {
    setPackages(packages.map(p =>
      p.id === pkgId ? { ...p, [field]: value } : p
    ))
  }

  const updateBonusField = (ruleId: number, field: keyof BonusRule, value: any) => {
    setBonusRules(bonusRules.map(r =>
      r.id === ruleId ? { ...r, [field]: value } : r
    ))
  }

  const fetchPurchases = async (offset = 0, append = false) => {
    setLoading(!append)
    setLoadingMore(append)
    setErrorMessage('')
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch(`/api/admin/purchases?limit=${pageSize}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        handleAuthRedirect(res.status)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.error || 'Error al cargar compras')
        setPurchases([])
        setPurchasesTotal(0)
      } else {
        const data = await res.json()
        const items = data.purchases || []
        setPurchases((prev) => (append ? [...prev, ...items] : items))
        setPurchasesTotal(data.total_investment_bs || 0)
        setPurchasesHasMore(Boolean(data.has_more))
        setPurchasesOffset(data.next_offset || 0)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setErrorMessage('Error de conexión')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchWithdrawals = async (offset = 0, append = false) => {
    setLoading(!append)
    setLoadingMore(append)
    setErrorMessage('')
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch(`/api/admin/withdrawals?limit=${pageSize}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        handleAuthRedirect(res.status)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.error || 'Error al cargar retiros')
        setWithdrawals([])
      } else {
        const data = await res.json()
        const items = data.withdrawals || []
        setWithdrawals((prev) => (append ? [...prev, ...items] : items))
        setWithdrawalsHasMore(Boolean(data.has_more))
        setWithdrawalsOffset(data.next_offset || 0)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setErrorMessage('Error de conexión')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchActiveUsers = async (offset = 0, append = false) => {
    setLoading(!append)
    setLoadingMore(append)
    setErrorMessage('')
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch(`/api/admin/active-users?limit=${pageSize}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        handleAuthRedirect(res.status)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.error || 'Error al cargar usuarios activos')
        setActiveUsers([])
      } else {
        const data = await res.json()
        const items = data.users || []
        setActiveUsers((prev) => (append ? [...prev, ...items] : items))
        setActiveHasMore(Boolean(data.has_more))
        setActiveOffset(data.next_offset || 0)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setErrorMessage('Error de conexión')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchNews = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/admin/news', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        handleAuthRedirect(res.status)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.error || 'Error al cargar noticias')
        setAnnouncements([])
      } else {
        const data = await res.json()
        setAnnouncements(data)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setErrorMessage('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const fetchRanks = async (search = '') => {
    setRanksLoading(true)
    try {
      const token = getToken()
      if (!token) { router.push('/login'); return }
      const res = await fetch(`/api/admin/ranks?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) { handleAuthRedirect(res.status); return }
      if (res.ok) {
        const data = await res.json()
        setRanksData(data.users)
        setRankCounts(data.rank_counts)
      }
    } catch (error) {
      console.error('Fetch ranks error:', error)
    } finally {
      setRanksLoading(false)
    }
  }

  const handleRecalculateRanks = async () => {
    if (!confirm('¿Recalcular rangos de todos los usuarios? Esto puede tomar unos segundos.')) return
    setRecalculating(true)
    try {
      const token = getToken()
      const res = await fetch('/api/admin/ranks/recalculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        showToast(`Rangos actualizados: ${data.updated} usuarios, ${data.bonusPaid} bonos pagados`, 'success')
        fetchRanks(ranksSearch)
      } else {
        showToast('Error al recalcular rangos', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setRecalculating(false)
    }
  }

  const handleSetUserRank = async (userId: string, rank: number, username: string) => {
    const action = rank === 0 ? `eliminar el rango de @${username}` : `asignar rango ${rank}R a @${username}`
    if (!confirm(`¿${action}?`)) return
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/users/${userId}/rank`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank }),
      })
      if (res.ok) {
        const data = await res.json()
        showToast(data.message + (data.bonus_paid ? ` (+$${data.bonus_paid ? '' : ''} bono pagado)` : ''), 'success')
        fetchRanks(ranksSearch)
      } else {
        const data = await res.json()
        showToast(data.error || 'Error al asignar rango', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    }
  }

  const handleApprovePurchase = async (id: string) => {
    if (!confirm('¿Activar esta compra?')) return

    setProcessing(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/purchases/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Compra aprobada exitosamente', 'success')
        fetchPurchases(0, false)
      } else {
        const data = await res.json()
        showToast(data.error || 'Error al aprobar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const fetchManualUsers = async (search: string) => {
    if (!search.trim()) { setManualUsers([]); return }
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const lower = search.toLowerCase()
      const filtered = (data as any[])
        .filter((u: any) =>
          u.username.toLowerCase().includes(lower) ||
          u.full_name.toLowerCase().includes(lower)
        )
        .slice(0, 10)
        .map((u: any) => ({ id: u.id, username: u.username, full_name: u.full_name }))
      setManualUsers(filtered)
    } catch { setManualUsers([]) }
  }

  const handleManualActivate = async () => {
    if (!manualSelectedUser || !manualSelectedPackage) {
      showToast('Selecciona un usuario y un paquete', 'error')
      return
    }
    if (!confirm(`¿Activar paquete para @${manualSelectedUser.username}?`)) return
    setManualActivating(true)
    try {
      const res = await fetch('/api/admin/purchases/manual-activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: manualSelectedUser.id, package_id: manualSelectedPackage }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'success')
        setManualSelectedUser(null)
        setManualSelectedPackage(null)
        setManualUserSearch('')
        setManualUsers([])
        setShowManualForm(false)
        fetchPurchases(0, false)
      } else {
        showToast(data.error || 'Error al activar', 'error')
      }
    } catch { showToast('Error de conexión', 'error') }
    finally { setManualActivating(false) }
  }

  const fetchUpgradeUsers = async (search: string) => {
    if (!search.trim()) { setUpgradeUsers([]); return }
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const lower = search.toLowerCase()
      const filtered = (data as any[])
        .filter((u: any) =>
          u.username.toLowerCase().includes(lower) ||
          u.full_name.toLowerCase().includes(lower)
        )
        .slice(0, 10)
        .map((u: any) => ({ id: u.id, username: u.username, full_name: u.full_name }))
      setUpgradeUsers(filtered)
    } catch { setUpgradeUsers([]) }
  }

  const handleManualUpgrade = async () => {
    if (!upgradeSelectedUser || !upgradeSelectedPackage) {
      showToast('Selecciona un usuario y un paquete destino', 'error')
      return
    }
    if (!confirm(`¿Hacer upgrade a @${upgradeSelectedUser.username}?`)) return
    setUpgrading(true)
    try {
      const res = await fetch('/api/admin/purchases/manual-upgrade', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: upgradeSelectedUser.id, new_package_id: upgradeSelectedPackage }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'success')
        setUpgradeSelectedUser(null)
        setUpgradeSelectedPackage(null)
        setUpgradeUserSearch('')
        setUpgradeUsers([])
        setShowUpgradeForm(false)
        fetchPurchases(0, false)
      } else {
        showToast(data.error || 'Error al hacer upgrade', 'error')
      }
    } catch { showToast('Error de conexión', 'error') }
    finally { setUpgrading(false) }
  }

  const handleRejectPurchase = async (id: string) => {
    if (!confirm('¿Rechazar esta compra? El usuario podrá volver a solicitar este paquete.')) return

    setProcessing(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/purchases/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Compra rechazada - Usuario puede solicitar nuevamente', 'info')
        fetchPurchases(0, false)
      } else {
        showToast('Error al rechazar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handlePayWithdrawal = async (receiptUrl?: string) => {
    if (!selectedWithdrawalForReceipt) return

    setProcessing(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/withdrawals/${selectedWithdrawalForReceipt.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receipt_url: receiptUrl || null }),
      })

      if (res.ok) {
        showToast('Retiro marcado como pagado', 'success')
        setSelectedWithdrawalForReceipt(null)
        setReceiptFile(null)
        fetchWithdrawals(0, false)
      } else {
        showToast('Error al procesar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleUploadReceipt = async () => {
    if (!receiptFile) {
      showToast('Debes subir un comprobante de pago', 'error')
      return
    }

    setReceiptUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', receiptFile)

      const token = getToken()
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!uploadRes.ok) {
        showToast('Error al subir comprobante', 'error')
        return
      }

      const { url } = await uploadRes.json()
      await handlePayWithdrawal(url)
    } catch (error) {
      showToast('Error al subir comprobante', 'error')
    } finally {
      setReceiptUploading(false)
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    if (!confirm('¿Rechazar este retiro? Los fondos serán devueltos al usuario.')) return

    setProcessing(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Retiro rechazado - Fondos devueltos al usuario', 'info')
        fetchWithdrawals(0, false)
      } else {
        showToast('Error al rechazar', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const adminTabs = [
    { key: 'purchases' as const, label: 'Billetera', icon: '👛' },
    { key: 'withdrawals' as const, label: 'Retiros', icon: '💰' },
    { key: 'adjust' as const, label: 'Ajustes', icon: '🛠️' },
    { key: 'active-users' as const, label: 'Activos', icon: '✅' },
    { key: 'config' as const, label: 'Ganancias', icon: '📈' },
    { key: 'news' as const, label: 'Noticias', icon: '📰' },
    { key: 'futuros' as const, label: 'Futuros', icon: '📊' },
    { key: 'rangos' as const, label: 'Rangos', icon: '🏆' },
  ]


  const handleCreateNews = async () => {
    if (!newsTitle || !newsBody) {
      setErrorMessage('Título y contenido son requeridos')
      return
    }

    setProcessing(true)
    try {
      const token = getToken()
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newsTitle,
          body: newsBody,
          is_active: newsActive,
        }),
      })

      if (res.ok) {
        showToast('Noticia publicada exitosamente', 'success')
        setNewsTitle('')
        setNewsBody('')
        setNewsActive(true)
        fetchNews()
      } else {
        const data = await res.json().catch(() => null)
        showToast(data?.error || 'Error al crear noticia', 'error')
        setErrorMessage(data?.error || 'Error al crear noticia')
      }
    } catch (error) {
      setErrorMessage('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const purchasedNamesByUser = purchases.reduce((acc, purchase) => {
    const list = acc[purchase.user.id] || []
    if (!list.includes(purchase.vip_package.name)) {
      list.push(purchase.vip_package.name)
    }
    acc[purchase.user.id] = list
    return acc
  }, {} as Record<string, string[]>)

  const purchasesUsersList = purchases.reduce((acc, purchase) => {
    if (!acc.some((item) => item.user.id === purchase.user.id)) {
      acc.push(purchase)
    }
    return acc
  }, [] as Purchase[])

  const filteredActiveUsersList = purchaseSearch.trim()
    ? purchasesUsersList.filter((purchase) => {
      const query = purchaseSearch.trim().toLowerCase()
      return (
        purchase.user.username.toLowerCase().includes(query) ||
        purchase.user.full_name.toLowerCase().includes(query) ||
        purchase.user.email.toLowerCase().includes(query)
      )
    })
    : purchasesUsersList

  const filteredActiveUsers = activeSearch.trim()
    ? activeUsers.filter((entry) => {
      const query = activeSearch.trim().toLowerCase()
      return (
        entry.user.username.toLowerCase().includes(query) ||
        entry.user.full_name.toLowerCase().includes(query)
      )
    })
    : activeUsers

  if (!token || adminChecking || !adminVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card glassEffect>
          <p className="text-center text-text-secondary">
            Verificando acceso de administrador...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-screen-xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gold-blue">Panel Admin</h1>
          <p className="mt-2 text-text-secondary uppercase tracking-wider text-sm font-light">
            GESTIÓN DEL SISTEMA
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gold">Cargando...</p>
        ) : (
          <>
            {errorMessage && (
              <Card>
                <p className="text-center text-red-500">{errorMessage}</p>
              </Card>
            )}
            {tab === 'purchases' && (
              <div className="space-y-4">
                <Card glassEffect>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary uppercase tracking-wider text-sm">
                      Total de inversiones sumadas
                    </span>
                    <span className="text-2xl font-bold text-gold">
                      ${purchasesTotal.toFixed(2)}
                    </span>
                  </div>
                </Card>
                <Card glassEffect>
                  <div className="space-y-3">
                    <Input
                      label="Buscar usuario"
                      type="text"
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      placeholder="Nombre o usuario"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setPurchaseSearch((value) => value.trim())}
                    >
                      Buscar
                    </Button>
                  </div>
                </Card>

                {/* Activar paquete manualmente */}
                <Card glassEffect>
                  <button
                    className="w-full flex justify-between items-center text-left"
                    onClick={() => setShowManualForm(!showManualForm)}
                  >
                    <span className="text-gold font-bold text-sm uppercase tracking-wider">
                      Activar paquete manualmente
                    </span>
                    <span className="text-gold text-lg">{showManualForm ? '▲' : '▼'}</span>
                  </button>

                  {showManualForm && (
                    <div className="mt-4 space-y-3 border-t border-gold border-opacity-20 pt-4">
                      {/* Buscar usuario */}
                      <div className="space-y-2">
                        <Input
                          label="Buscar usuario"
                          type="text"
                          value={manualUserSearch}
                          onChange={(e) => {
                            setManualUserSearch(e.target.value)
                            setManualSelectedUser(null)
                            fetchManualUsers(e.target.value)
                          }}
                          placeholder="Nombre de usuario o nombre completo"
                        />
                        {manualUsers.length > 0 && !manualSelectedUser && (
                          <div className="bg-dark-card rounded-card border border-gold border-opacity-20 overflow-hidden">
                            {manualUsers.map((u) => (
                              <button
                                key={u.id}
                                className="w-full text-left px-3 py-2 hover:bg-gold hover:bg-opacity-10 border-b border-gold border-opacity-10 last:border-0"
                                onClick={() => {
                                  setManualSelectedUser(u)
                                  setManualUserSearch(u.username)
                                  setManualUsers([])
                                }}
                              >
                                <span className="text-gold text-sm font-bold">@{u.username}</span>
                                <span className="text-text-secondary text-xs ml-2">{u.full_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {manualSelectedUser && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2 flex justify-between items-center">
                            <div>
                              <span className="text-green-400 text-sm font-bold">@{manualSelectedUser.username}</span>
                              <span className="text-text-secondary text-xs ml-2">{manualSelectedUser.full_name}</span>
                            </div>
                            <button
                              className="text-text-secondary text-xs hover:text-red-400"
                              onClick={() => { setManualSelectedUser(null); setManualUserSearch('') }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Seleccionar paquete */}
                      <div className="space-y-1">
                        <p className="text-text-secondary text-xs uppercase tracking-wider">Paquete</p>
                        <select
                          className="w-full bg-dark-card border border-gold border-opacity-30 rounded-card px-3 py-2 text-text-primary text-sm"
                          value={manualSelectedPackage ?? ''}
                          onChange={(e) => setManualSelectedPackage(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Seleccionar paquete...</option>
                          {packages.filter(p => p.is_enabled).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} – ${p.investment_bs.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleManualActivate}
                        disabled={manualActivating || !manualSelectedUser || !manualSelectedPackage}
                      >
                        {manualActivating ? 'Activando...' : 'Activar paquete'}
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Upgrade manual de paquete */}
                <Card glassEffect>
                  <button
                    className="w-full flex justify-between items-center text-left"
                    onClick={() => setShowUpgradeForm(!showUpgradeForm)}
                  >
                    <span className="text-gold font-bold text-sm uppercase tracking-wider">
                      Hacer upgrade manualmente
                    </span>
                    <span className="text-gold text-lg">{showUpgradeForm ? '▲' : '▼'}</span>
                  </button>

                  {showUpgradeForm && (
                    <div className="mt-4 space-y-3 border-t border-gold border-opacity-20 pt-4">
                      {/* Buscar usuario */}
                      <div className="space-y-2">
                        <Input
                          label="Buscar usuario"
                          type="text"
                          value={upgradeUserSearch}
                          onChange={(e) => {
                            setUpgradeUserSearch(e.target.value)
                            setUpgradeSelectedUser(null)
                            fetchUpgradeUsers(e.target.value)
                          }}
                          placeholder="Nombre de usuario o nombre completo"
                        />
                        {upgradeUsers.length > 0 && !upgradeSelectedUser && (
                          <div className="bg-dark-card rounded-card border border-gold border-opacity-20 overflow-hidden">
                            {upgradeUsers.map((u) => (
                              <button
                                key={u.id}
                                className="w-full text-left px-3 py-2 hover:bg-gold hover:bg-opacity-10 border-b border-gold border-opacity-10 last:border-0"
                                onClick={() => {
                                  setUpgradeSelectedUser(u)
                                  setUpgradeUserSearch(u.username)
                                  setUpgradeUsers([])
                                }}
                              >
                                <span className="text-gold text-sm font-bold">@{u.username}</span>
                                <span className="text-text-secondary text-xs ml-2">{u.full_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {upgradeSelectedUser && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2 flex justify-between items-center">
                            <div>
                              <span className="text-green-400 text-sm font-bold">@{upgradeSelectedUser.username}</span>
                              <span className="text-text-secondary text-xs ml-2">{upgradeSelectedUser.full_name}</span>
                            </div>
                            <button
                              className="text-text-secondary text-xs hover:text-red-400"
                              onClick={() => { setUpgradeSelectedUser(null); setUpgradeUserSearch('') }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Seleccionar paquete destino */}
                      <div className="space-y-1">
                        <p className="text-text-secondary text-xs uppercase tracking-wider">Paquete destino (debe ser mayor nivel)</p>
                        <select
                          className="w-full bg-dark-card border border-gold border-opacity-30 rounded-card px-3 py-2 text-text-primary text-sm"
                          value={upgradeSelectedPackage ?? ''}
                          onChange={(e) => setUpgradeSelectedPackage(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Seleccionar paquete...</option>
                          {packages.filter(p => p.is_enabled).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} – ${p.investment_bs.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleManualUpgrade}
                        disabled={upgrading || !upgradeSelectedUser || !upgradeSelectedPackage}
                      >
                        {upgrading ? 'Procesando...' : 'Hacer upgrade'}
                      </Button>
                    </div>
                  )}
                </Card>

                {filteredActiveUsersList.length === 0 ? (
                  <Card>
                    <p className="text-center text-text-secondary">
                      No hay usuarios activos
                    </p>
                  </Card>
                ) : (
                  filteredActiveUsersList.map((p) => (
                    <Card key={p.id} glassEffect>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-xl font-bold text-gold">
                              {p.user.username}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {p.user.full_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {purchases.filter(item => item.user.id === p.user.id && item.status === 'PENDING').length > 0 && (
                              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-full animate-pulse">
                                ⚠️ {purchases.filter(item => item.user.id === p.user.id && item.status === 'PENDING').length} Pendiente{purchases.filter(item => item.user.id === p.user.id && item.status === 'PENDING').length > 1 ? 's' : ''}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              className="text-xs px-3 py-1"
                              onClick={() =>
                                setExpandedUserId(
                                  expandedUserId === p.user.id ? null : p.user.id
                                )
                              }
                            >
                              Ver pak comprados
                            </Button>
                          </div>
                        </div>
                        {expandedUserId === p.user.id && (
                          <div className="border-t border-gold border-opacity-20 pt-4 space-y-4">
                            {purchases
                              .filter((item) => item.user.id === p.user.id)
                              .map((item) => (
                                <div key={item.id} className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-secondary">
                                      {item.vip_package.name}
                                    </span>
                                    <span
                                      className={`text-xs ${item.status === 'ACTIVE'
                                        ? 'text-green-500'
                                        : item.status === 'REJECTED'
                                          ? 'text-red-500'
                                          : item.status === 'PENDING_VERIFICATION'
                                            ? 'text-blue-400'
                                            : 'text-yellow-500'
                                        }`}
                                    >
                                      {item.status === 'ACTIVE'
                                        ? 'ACTIVO'
                                        : item.status === 'REJECTED'
                                          ? 'RECHAZADO'
                                          : item.status === 'PENDING_VERIFICATION'
                                            ? 'VERIFICANDO'
                                            : 'PENDIENTE'}
                                    </span>
                                  </div>

                                  <div className="bg-dark-card bg-opacity-50 rounded p-2 space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-text-secondary uppercase tracking-wider">Correo:</span>
                                      <span className="text-gold">{p.user.email}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-text-secondary uppercase tracking-wider">Fecha de solicitud:</span>
                                      <span className="text-gold">
                                        {new Date(item.created_at).toLocaleString('es-ES', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  </div>

                                  {item.tx_hash ? (
                                    <div className="bg-dark-card rounded-card p-3 space-y-2">
                                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">Transaccion Blockchain (BSC)</p>
                                      <a
                                        href={`https://bscscan.com/tx/${item.tx_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 underline font-mono break-all"
                                      >
                                        {item.tx_hash.slice(0, 14)}...{item.tx_hash.slice(-10)}
                                      </a>
                                      {item.block_confirmations !== undefined && (
                                        <p className="text-[10px] text-text-secondary">
                                          Confirmaciones: <span className="text-gold">{item.block_confirmations}</span>
                                        </p>
                                      )}
                                    </div>
                                  ) : item.receipt_url ? (
                                    <div className="w-full h-56 bg-dark-card rounded-card overflow-hidden">
                                      <img
                                        src={item.receipt_url}
                                        alt="Comprobante"
                                        className="w-full h-full object-contain"
                                        loading="lazy"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full h-20 bg-dark-card rounded-card flex items-center justify-center">
                                      <p className="text-text-secondary text-sm">
                                        Sin comprobante
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <Button
                                      variant="primary"
                                      className="flex-1"
                                      onClick={() => handleApprovePurchase(item.id)}
                                      disabled={processing}
                                    >
                                      Activar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => handleRejectPurchase(item.id)}
                                      disabled={processing}
                                    >
                                      Rechazar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
                {purchasesHasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fetchPurchases(purchasesOffset, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar mas'}
                  </Button>
                )}
              </div>
            )}

            {tab === 'withdrawals' && (
              <div className="space-y-4">
                {withdrawals.length === 0 ? (
                  <Card>
                    <p className="text-center text-text-secondary">
                      No hay solicitudes de retiro
                    </p>
                  </Card>
                ) : (
                  withdrawals.map((w) => (
                    <Card key={w.id} glassEffect>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-text-primary">
                              {w.user.full_name}
                            </h3>
                            <p className="text-text-secondary">@{w.user.username}</p>
                            <div className="mt-2 bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                              <p className="text-[10px] text-text-secondary uppercase tracking-wider">Saldo en billetera</p>
                              <p className={`text-lg font-bold ${w.total_earnings_bs >= w.amount_bs ? 'text-green-400' : 'text-red-400'}`}>
                                ${w.total_earnings_bs.toFixed(2)}
                              </p>
                              {w.total_earnings_bs < w.amount_bs && (
                                <p className="text-[9px] text-red-400">Saldo insuficiente</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-text-secondary uppercase tracking-wider">Monto solicitado</p>
                            <p className="text-xl font-bold text-gold">
                              ${w.amount_bs.toFixed(2)}
                            </p>
                            <div className="mt-2 text-[10px] text-text-secondary space-y-1">
                              <div>
                                <span className="uppercase tracking-wider">Telefono:</span> {w.phone_number || 'No registrado'}
                              </div>
                              <div>
                                <span className="uppercase tracking-wider">Banco:</span> {w.bank_name || 'No registrado'}
                              </div>
                              <div>
                                <span className="uppercase tracking-wider">Modo:</span> {w.payout_method || 'No registrado'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Imagen QR del usuario */}
                        {w.qr_image_url && (
                          <div className="bg-dark-card bg-opacity-50 rounded p-3">
                            <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">QR para pagar:</p>
                            <div className="flex justify-center">
                              <img
                                src={w.qr_image_url}
                                alt="QR del usuario"
                                className="w-48 h-48 object-contain rounded-lg border border-gold/30"
                              />
                            </div>
                          </div>
                        )}

                        <div className="bg-dark-card bg-opacity-50 rounded p-2 space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-text-secondary uppercase tracking-wider">Correo:</span>
                            <span className="text-gold">{w.user.email}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-text-secondary uppercase tracking-wider">Fecha de solicitud:</span>
                            <span className="text-gold">
                              {new Date(w.created_at).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            className="flex-1"
                            onClick={() => {
                              // Set the selected withdrawal for receipt upload
                              setSelectedWithdrawalForReceipt(w)
                            }}
                            disabled={processing}
                          >
                            Marcar Pagado
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRejectWithdrawal(w.id)}
                            disabled={processing}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
                {withdrawalsHasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fetchWithdrawals(withdrawalsOffset, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar mas'}
                  </Button>
                )}
              </div>
            )}

            {/* Receipt Upload Modal */}
            {selectedWithdrawalForReceipt && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <Card glassEffect className="max-w-md w-full">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gold">Marcar Retiro como Pagado</h3>
                    <div className="bg-dark-card bg-opacity-50 rounded p-3 space-y-2">
                      <p className="text-sm text-text-secondary">
                        <span className="font-bold text-text-primary">{selectedWithdrawalForReceipt.user.full_name}</span>
                      </p>
                      <p className="text-lg font-bold text-gold">${selectedWithdrawalForReceipt.amount_bs.toFixed(2)}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-text-secondary">
                        Comprobante de Pago <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-dark-bg hover:file:bg-gold/80"
                      />
                      {receiptFile && (
                        <p className="text-xs text-green-400">✓ {receiptFile.name}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedWithdrawalForReceipt(null)
                          setReceiptFile(null)
                        }}
                        disabled={processing || receiptUploading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={handleUploadReceipt}
                        disabled={processing || receiptUploading || !receiptFile}
                      >
                        {receiptUploading ? 'Subiendo...' : processing ? 'Procesando...' : 'Confirmar Pago'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'adjust' && <ManualAdjustTab token={token} />}

            {tab === 'config' && <ConfigTab token={token} />}

            {tab === 'active-users' && (
              <div className="space-y-4">
                <Card glassEffect>
                  <div className="space-y-2">
                    <Input
                      label="Buscar usuario"
                      type="text"
                      value={activeSearch}
                      onChange={(e) => setActiveSearch(e.target.value)}
                      placeholder="Usuario o nombre"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveSearch((value) => value.trim())}
                    >
                      Buscar
                    </Button>
                  </div>
                </Card>
                {filteredActiveUsers.length === 0 ? (
                  <Card>
                    <p className="text-center text-text-secondary">
                      No hay usuarios activos
                    </p>
                  </Card>
                ) : (
                  filteredActiveUsers.map((entry) => (
                    <Card key={entry.user.username} glassEffect>
                      <div className="space-y-4">
                        {/* Header del usuario */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-gold">
                              {entry.user.full_name}
                            </h3>
                            <p className="text-sm text-text-secondary">@{entry.user.username}</p>
                            <p className="text-xs text-text-secondary">{entry.user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-text-secondary uppercase">Total Ganado</p>
                            <p className="text-2xl font-bold text-gold">
                              ${entry.earnings.totalEarnings.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Paquetes VIP Activos */}
                        <div className="bg-dark-card bg-opacity-50 rounded-lg p-3">
                          <p className="text-xs text-gold font-bold uppercase mb-2">📦 Paquetes JADE Activos</p>
                          <div className="space-y-2">
                            {entry.active_packages.map((pkg, idx) => (
                              <div key={idx} className="bg-dark-bg rounded p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-jade">{pkg.name}</span>
                                  <span className="text-xs text-text-secondary bg-gold/20 px-2 py-0.5 rounded">Nivel {pkg.level}</span>
                                </div>
                                <div className="text-xs text-text-secondary grid grid-cols-2 gap-1">
                                  <div>
                                    <span className="opacity-70">Solicitado:</span> {pkg.created_at
                                      ? new Date(pkg.created_at).toLocaleDateString('es-ES')
                                      : 'N/A'}
                                  </div>
                                  <div>
                                    <span className="opacity-70">Activado:</span> {pkg.activated_at
                                      ? new Date(pkg.activated_at).toLocaleDateString('es-ES')
                                      : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Desglose de Ganancias */}
                        <div className="space-y-3">
                          {/* Ajustes Manuales */}
                          {entry.earnings.adjustments.items.length > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-jade uppercase">🛠️ Ajustes desde Panel</p>
                                <p className={`text-lg font-bold ${entry.earnings.adjustments.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {entry.earnings.adjustments.total >= 0 ? '+' : ''}${entry.earnings.adjustments.total.toFixed(2)}
                                </p>
                              </div>
                              <div className="space-y-1">
                                {entry.earnings.adjustments.items.map((adj, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-dark-bg rounded px-2 py-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${adj.type === 'ABONADO' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {adj.type}
                                      </span>
                                      <span className="text-text-secondary">{adj.description}</span>
                                    </div>
                                    <span className={`font-bold ${adj.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {adj.amount >= 0 ? '+' : ''}${adj.amount.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Bonos de Patrocinio */}
                          {entry.earnings.referralBonus.byLevel.length > 0 && (
                            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gold uppercase">🤝 Ganancias de Patrocinio</p>
                                <p className="text-lg font-bold text-gold">
                                  ${entry.earnings.referralBonus.total.toFixed(2)}
                                </p>
                              </div>
                              <div className="space-y-1">
                                {entry.earnings.referralBonus.byLevel.map((bonus, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-dark-bg rounded px-2 py-1">
                                    <span className="text-text-secondary">
                                      <span className="font-bold text-gold">Bonos de patrocinados Nivel {bonus.level}</span>
                                    </span>
                                    <span className="font-bold text-gold">
                                      ${bonus.amount.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </Card>
                  ))
                )}
                {activeHasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fetchActiveUsers(activeOffset, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar mas'}
                  </Button>
                )}
              </div>
            )}

            {tab === 'news' && (
              <div className="space-y-4">
                <Card glassEffect>
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gold">📰 Crear Nueva Noticia</h2>
                    <Input
                      label="Título"
                      type="text"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="Título de la noticia"
                      required
                    />
                    <div>
                      <label className="block text-sm text-text-secondary uppercase tracking-wider font-light mb-3">
                        Contenido
                      </label>
                      <textarea
                        value={newsBody}
                        onChange={(e) => setNewsBody(e.target.value)}
                        className="w-full min-h-[120px] px-4 py-3 bg-dark-card border border-gold border-opacity-30 rounded-btn text-text-primary focus:outline-none focus:border-gold transition-all"
                        placeholder="Escribe la noticia"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={newsActive}
                        onChange={(e) => setNewsActive(e.target.checked)}
                        className="w-4 h-4 accent-gold"
                      />
                      Mostrar en Home (usuarios verán esta noticia)
                    </label>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleCreateNews}
                      disabled={processing}
                    >
                      {processing ? 'Publicando...' : '✅ Publicar Noticia'}
                    </Button>
                  </div>
                </Card>

                <div className="border-t border-gold border-opacity-20 pt-4">
                  <h3 className="text-lg font-bold text-gold mb-3">📋 Noticias Publicadas</h3>
                  {announcements.length === 0 ? (
                    <Card>
                      <p className="text-center text-text-secondary">
                        No hay noticias publicadas
                      </p>
                    </Card>
                  ) : (
                    announcements.map((item) => (
                      <Card key={item.id} glassEffect className="mb-3">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-text-primary font-bold text-lg">{item.title}</h4>
                              <p className="text-xs text-text-secondary mt-1">
                                📅 {new Date(item.created_at).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${item.is_active
                              ? 'bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30'
                              : 'bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30'
                              }`}>
                              {item.is_active ? '✓ Visible' : '✗ Oculta'}
                            </div>
                          </div>

                          <p className="text-sm text-text-secondary whitespace-pre-wrap">{item.body}</p>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant={item.is_active ? 'outline' : 'primary'}
                              className="flex-1"
                              onClick={async () => {
                                setProcessing(true)
                                try {
                                  const token = getToken()
                                  const res = await fetch('/api/admin/news', {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      id: item.id,
                                      is_active: !item.is_active
                                    }),
                                  })
                                  if (res.ok) {
                                    showToast(
                                      item.is_active ? 'Noticia ocultada' : 'Noticia visible',
                                      'success'
                                    )
                                    fetchNews()
                                  } else {
                                    const data = await res.json().catch(() => null)
                                    showToast(data?.error || 'Error al actualizar', 'error')
                                  }
                                } catch (error) {
                                  showToast('Error de conexión', 'error')
                                } finally {
                                  setProcessing(false)
                                }
                              }}
                              disabled={processing}
                            >
                              {item.is_active ? '👁️ Ocultar' : '👁️ Mostrar'}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 text-red-400 border-red-500"
                              onClick={async () => {
                                if (!confirm('¿Eliminar esta noticia permanentemente?')) return
                                setProcessing(true)
                                try {
                                  const token = getToken()
                                  const res = await fetch('/api/admin/news', {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ id: item.id }),
                                  })
                                  if (res.ok) {
                                    showToast('Noticia eliminada', 'success')
                                    fetchNews()
                                  } else {
                                    const data = await res.json().catch(() => null)
                                    showToast(data?.error || 'Error al eliminar', 'error')
                                  }
                                } catch (error) {
                                  showToast('Error de conexión', 'error')
                                } finally {
                                  setProcessing(false)
                                }
                              }}
                              disabled={processing}
                            >
                              🗑️ Eliminar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

              </div>
            )}

            {tab === 'futuros' && <FuturosAdminTab token={token} />}

          </>
        )}

        {/* Configuración del Sistema removida por solicitud */}

        {/* ─── TAB: RANGOS ─── */}
        {tab === 'rangos' && (
          <div className="space-y-4">
            {/* Header + Recalcular */}
            <Card glassEffect>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-gold font-bold text-lg uppercase tracking-wider">Plan de Rangos VIRTUS</h2>
                  <p className="text-text-secondary text-xs mt-0.5">1R – 5R · Cálculo automático de requisitos</p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleRecalculateRanks}
                  disabled={recalculating}
                >
                  {recalculating ? 'Recalculando...' : '🔄 Recalcular Todos'}
                </Button>
              </div>

              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { rank: 0, label: 'Sin Rango', color: '#6B7280' },
                  { rank: 1, label: '1R Brand Ambassador', color: '#60A5FA' },
                  { rank: 2, label: '2R Team Supervisor', color: '#818CF8' },
                  { rank: 3, label: '3R Senior Manager', color: '#C084FC' },
                  { rank: 4, label: '4R Regional Director', color: '#F59E0B' },
                  { rank: 5, label: '5R Global Exec.', color: '#FFD700' },
                ].map(({ rank, label, color }) => (
                  <div
                    key={rank}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                  >
                    <span>{rankCounts[rank] ?? 0}</span>
                    <span className="opacity-70">·</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Search */}
            <Card glassEffect>
              <div className="flex gap-2">
                <Input
                  label=""
                  type="text"
                  value={ranksSearch}
                  onChange={(e) => setRanksSearch(e.target.value)}
                  placeholder="Buscar por usuario o nombre..."
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => fetchRanks(ranksSearch)}>
                  Buscar
                </Button>
              </div>
            </Card>

            {/* Users list */}
            {ranksLoading ? (
              <Card><p className="text-center text-text-secondary py-4">Cargando rangos...</p></Card>
            ) : ranksData.length === 0 ? (
              <Card><p className="text-center text-text-secondary py-4">No hay usuarios con rango o referidos</p></Card>
            ) : (
              ranksData.map((user) => {
                const rankColors: Record<number, string> = {
                  0: '#6B7280', 1: '#60A5FA', 2: '#818CF8', 3: '#C084FC', 4: '#F59E0B', 5: '#FFD700',
                }
                const rankColor = rankColors[user.current_rank] ?? '#6B7280'
                const eligibleColor = rankColors[user.eligible_rank] ?? '#6B7280'

                return (
                  <Card key={user.id} glassEffect>
                    <div className="space-y-3">
                      {/* User info row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{user.full_name}</p>
                          <p className="text-text-secondary text-xs">@{user.username} · #{user.user_code}</p>
                        </div>
                        {/* Current rank badge */}
                        <div
                          className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold text-center"
                          style={{ background: `${rankColor}22`, border: `1px solid ${rankColor}55`, color: rankColor }}
                        >
                          {user.current_rank === 0 ? 'Sin Rango' : `${user.current_rank}R`}
                          {user.current_rank_title && <div className="text-[9px] opacity-70 mt-0.5">{user.current_rank_title}</div>}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/5 rounded-lg py-1.5">
                          <p className="text-white font-bold text-sm">{user.stats.frontals_activos}</p>
                          <p className="text-text-secondary text-[9px] uppercase">Frontales</p>
                        </div>
                        <div className="bg-white/5 rounded-lg py-1.5">
                          <p className="text-white font-bold text-sm">{user.stats.total_org}</p>
                          <p className="text-text-secondary text-[9px] uppercase">Org Total</p>
                        </div>
                        <div className="bg-white/5 rounded-lg py-1.5">
                          <p className="text-white font-bold text-sm">${user.stats.own_package.toLocaleString()}</p>
                          <p className="text-text-secondary text-[9px] uppercase">Paquete</p>
                        </div>
                      </div>

                      {/* Eligible rank indicator */}
                      {user.eligible_rank > user.current_rank && (
                        <div
                          className="text-xs text-center py-1 rounded-lg"
                          style={{ background: `${eligibleColor}15`, color: eligibleColor, border: `1px solid ${eligibleColor}30` }}
                        >
                          ⬆ Elegible para {user.eligible_rank}R – {user.eligible_rank_title}
                        </div>
                      )}

                      {/* Rank controls */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[0, 1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            onClick={() => handleSetUserRank(user.id, r, user.username)}
                            disabled={user.current_rank === r}
                            className="flex-1 min-w-[36px] py-1 text-[10px] font-bold rounded-md transition-all disabled:opacity-30"
                            style={{
                              background: user.current_rank === r ? `${rankColors[r]}33` : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${user.current_rank === r ? rankColors[r] : 'rgba(255,255,255,0.1)'}`,
                              color: rankColors[r],
                            }}
                          >
                            {r === 0 ? '✕' : `${r}R`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card border-t border-gold border-opacity-20 z-50">
        <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-4">
          {adminTabs.map((item) => {
            const isActive = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${isActive
                  ? 'text-gold'
                  : 'text-text-secondary hover:text-gold'
                  }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
