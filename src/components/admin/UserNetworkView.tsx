'use client'

import { useState } from 'react'
import UserDetailModal from './UserDetailModal'

interface UserNetworkNode {
  id: string
  username: string
  full_name: string
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE'
  vip_packages: string[]
  referrals: UserNetworkNode[]
}

interface UserNetworkViewProps {
  user: UserNetworkNode
  token: string
}

const getStatusColor = (status: string) => {
  if (status === 'ACTIVO') return 'bg-green-500'
  if (status === 'PENDIENTE') return 'bg-yellow-500'
  if (status === 'INACTIVO') return 'bg-red-500'
  return 'bg-gray-500'
}

// Función para aplanar la red en niveles
function flattenNetwork(user: UserNetworkNode): { level: number; users: UserNetworkNode[] }[] {
  const levels: { level: number; users: UserNetworkNode[] }[] = []

  function traverse(nodes: UserNetworkNode[], currentLevel: number) {
    if (nodes.length === 0) return

    // Agregar usuarios del nivel actual
    if (!levels[currentLevel]) {
      levels[currentLevel] = { level: currentLevel, users: [] }
    }
    levels[currentLevel].users.push(...nodes)

    // Recursivamente procesar hijos
    const allChildren = nodes.flatMap(node => node.referrals)
    if (allChildren.length > 0) {
      traverse(allChildren, currentLevel + 1)
    }
  }

  // Nivel 0 es el usuario raíz
  levels[0] = { level: 0, users: [user] }
  traverse(user.referrals, 1)

  return levels
}

function countTotalReferrals(user: UserNetworkNode): number {
  return user.referrals.reduce(
    (total, referral) => total + 1 + countTotalReferrals(referral),
    0
  )
}

export function UserNetworkView({ user, token }: UserNetworkViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const handleNodeClick = (userId: string) => {
    setSelectedUserId(userId)
  }

  const handleCloseModal = () => {
    setSelectedUserId(null)
  }

  // Aplanar la red en niveles
  const levels = flattenNetwork(user)

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h3 className="text-3xl font-bold text-gold gold-glow">Red de {user.full_name}</h3>
        <p className="text-text-secondary">
          Total de referidos: <span className="text-gold font-bold">{countTotalReferrals(user)}</span>
        </p>

        {/* Leyenda de colores */}
        <div className="flex gap-6 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-text-secondary">Activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-text-secondary">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-text-secondary">Inactivo</span>
          </div>
        </div>
      </div>

      {/* Red por niveles */}
      <div className="space-y-10">
        {levels.map((levelData, index) => (
          <div key={levelData.level} className="space-y-6">
            {/* Flecha separadora entre niveles */}
            {index > 0 && (
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-1 h-12 bg-gradient-to-b from-gold to-transparent"></div>
                  <div className="text-2xl text-gold animate-bounce">↓</div>
                </div>
              </div>
            )}

            {/* Título del nivel */}
            <div className="text-center space-y-2">
              <h4 className="text-xl font-bold text-gold">
                {levelData.level === 0 ? '👤 Usuario Raíz' : `📍 Nivel ${levelData.level}`}
              </h4>
              <p className="text-sm text-text-secondary">
                {levelData.users.length} {levelData.users.length === 1 ? 'usuario' : 'usuarios'}
              </p>
            </div>

            {/* Contenedor de usuarios del nivel */}
            <div className="bg-gradient-to-br from-dark-card to-transparent border-2 border-gold border-opacity-20 rounded-2xl p-8 shadow-2xl">
              <div className="flex flex-wrap justify-center items-start gap-12">
                {levelData.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleNodeClick(u.id)}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    {/* Icono circular con estado */}
                    <div className="relative">
                      <div
                        className={`w-20 h-20 rounded-full ${getStatusColor(u.status)} flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-dark-bg transition-all group-hover:scale-110 group-hover:shadow-2xl`}
                      >
                        👤
                      </div>
                      {/* Indicador de VIP packages */}
                      {u.vip_packages.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gold rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-dark-bg">
                          {u.vip_packages.length}
                        </div>
                      )}
                    </div>

                    {/* Username */}
                    <span className="mt-3 text-sm font-bold text-text-primary group-hover:text-gold transition-colors text-center max-w-[100px] truncate">
                      @{u.username}
                    </span>

                    {/* Nombre completo */}
                    <span className="text-xs text-text-secondary text-center max-w-[120px] truncate">
                      {u.full_name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalle */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          token={token}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
