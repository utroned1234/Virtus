'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface User {
  id: string
  username: string
  full_name: string
  email: string
  balance: number
  active_vip: string | null
}

interface ManualAdjustTabProps {
  token: string
}

export default function ManualAdjustTab({ token }: ManualAdjustTabProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (!token) return
    fetchUsers()
  }, [token])

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

  const handleAdjust = async () => {
    if (!selectedUser || !amount) {
      showToast('Por favor selecciona un usuario y especifica el monto', 'error')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum === 0) {
      showToast('El monto debe ser un número diferente de 0', 'error')
      return
    }

    if (!confirm(`¿Ajustar ${amountNum > 0 ? '+' : ''}${amountNum} USD al usuario seleccionado?`)) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUser,
          amount_bs: amountNum,
          description: description || undefined,
        }),
      })

      if (res.ok) {
        showToast(`Ajuste realizado: ${amountNum > 0 ? '+' : ''}${amountNum} USD`, 'success')
        setAmount('')
        setDescription('')
        setSelectedUser('')
        fetchUsers()
      } else {
        const data = await res.json()
        showToast(data.error || 'Error al realizar ajuste', 'error')
      }
    } catch (error) {
      showToast('Error de conexión', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <p className="text-center text-gold">Cargando usuarios...</p>
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gold mb-2">Ajustes Manuales de Saldo</h2>
        <p className="text-sm text-text-secondary">
          Agregar o quitar saldo directamente a cualquier usuario
        </p>
      </div>

      <Card glassEffect>
        <div className="space-y-6">
          {/* Search User */}
          <div>
            <label className="block text-sm text-text-secondary uppercase tracking-wider font-light mb-3">
              BUSCAR USUARIO
            </label>
            <Input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm text-text-secondary uppercase tracking-wider font-light mb-3">
              SELECCIONAR USUARIO
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-3 bg-dark-card border border-gold border-opacity-30 rounded-btn text-text-primary focus:outline-none focus:border-gold transition-all"
            >
              <option value="">-- Selecciona un usuario --</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} (@{user.username}) - Saldo actual: USD {user.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm text-text-secondary uppercase tracking-wider font-light mb-3">
              MONTO DEL AJUSTE
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ej: 100 (agregar) o -50 (quitar)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-text-secondary mt-2">
              💡 Usa números positivos para agregar (+) y negativos para quitar (-)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary uppercase tracking-wider font-light mb-3">
              DESCRIPCIÓN (OPCIONAL)
            </label>
            <Input
              type="text"
              placeholder="Ej: Bono especial, Corrección de saldo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            onClick={handleAdjust}
            disabled={processing || !selectedUser || !amount}
            className="w-full"
          >
            {processing ? 'Procesando...' : 'Aplicar Ajuste'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
