'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const typeStyles: Record<ToastType, { border: string; text: string; icon: string }> = {
  success: { border: 'border-green-500', text: 'text-green-400', icon: '✅' },
  error: { border: 'border-red-500', text: 'text-red-400', icon: '⚠️' },
  info: { border: 'border-gold', text: 'text-gold', icon: 'ℹ️' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: ToastItem = { id, message, type }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3500)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
        <div className="space-y-3 max-w-sm w-full px-4">
        {toasts.map((toast) => {
          const styles = typeStyles[toast.type]
          return (
            <div
              key={toast.id}
              className={`bg-dark-card border ${styles.border} rounded-btn px-4 py-3 shadow-lg pointer-events-auto`}
            >
              <div className={`text-sm ${styles.text} flex gap-2`}>
                <span>{styles.icon}</span>
                <span>{toast.message}</span>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
