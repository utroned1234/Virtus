'use client'

import { useEffect } from 'react'
import { useToast } from './Toast'

export default function ScreenshotProtection() {
    const { showToast } = useToast()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault()
                showToast('Las capturas de pantalla están deshabilitadas', 'error')
                // Limpiar el clipboard
                navigator.clipboard.writeText('')
                return false
            }

            // Windows: Win + Shift + S (Snipping Tool)
            if (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                showToast('Las capturas de pantalla están deshabilitadas', 'error')
                return false
            }

            // Mac: Cmd + Shift + 3/4/5
            if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
                e.preventDefault()
                showToast('Las capturas de pantalla están deshabilitadas', 'error')
                return false
            }

            // F12 / DevTools
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault()
                return false
            }
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            return false
        }

        // Detectar cuando se pierde el foco (posible captura)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Usuario minimizó o cambió de ventana - posible captura
                navigator.clipboard.writeText('')
            }
        }

        // Agregar event listeners
        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('keyup', handleKeyDown)
        document.addEventListener('contextmenu', handleContextMenu)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Deshabilitar selección de texto
        document.body.style.userSelect = 'none'
        document.body.style.webkitUserSelect = 'none'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('keyup', handleKeyDown)
            document.removeEventListener('contextmenu', handleContextMenu)
            document.removeEventListener('visibilitychange', handleVisibilityChange)

            // Restaurar selección de texto al desmontar
            document.body.style.userSelect = 'auto'
            document.body.style.webkitUserSelect = 'auto'
        }
    }, [showToast])

    return null
}
