'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function LogoutButton() {
    const router = useRouter()
    const pathname = usePathname()

    // No mostrar el botón en páginas públicas
    const publicPages = ['/', '/login', '/signup']
    if (publicPages.includes(pathname)) {
        return <div className="w-10" /> // Spacer para mantener el layout
    }

    const handleLogout = () => {
        document.cookie = 'auth_token=; path=/; max-age=0'
        router.push('/login')
    }

    return (
        <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#00838F] hover:border-red-500 hover:bg-red-50 transition-all duration-200 group"
            title="Cerrar sesión"
        >
            <svg
                className="w-5 h-5 text-[#00838F] group-hover:text-red-500 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </button>
    )
}
