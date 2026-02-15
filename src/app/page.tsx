import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Main content */}
      <div className="max-w-sm w-full text-center relative z-10 space-y-10">

        {/* Logo + Brand */}
        <div className="space-y-6">
          {/* Logo with glow */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -inset-3 bg-emerald-500/10 rounded-full blur-xl" />
            <img
              src="/logo.png"
              alt="VIRTUS Logo"
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]"
            />
          </div>

          {/* Brand name */}
          <div>
            <h1 className="text-5xl font-bold tracking-widest font-outfit text-white">
              VIRT<span className="text-[#34D399]">U</span>S
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#34D399]/50" />
              <p className="text-[#34D399]/70 text-xs font-medium uppercase tracking-[0.25em]">
                Tu futuro financiero
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#34D399]/50" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Link href="/login" className="block">
            <button
              className="w-full py-4 px-6 rounded-2xl font-bold text-white text-base transition-all active:scale-95 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
              }}
            >
              Iniciar Sesion
            </button>
          </Link>

          <Link href="/signup" className="block">
            <button
              className="w-full py-4 px-6 rounded-2xl font-bold text-base transition-all active:scale-95 hover:-translate-y-0.5 border-2 border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/10"
            >
              Crear Cuenta
            </button>
          </Link>
        </div>

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
          <div className="w-1 h-1 rounded-full bg-[#34D399]/50" />
          <div className="w-1 h-1 rounded-full bg-[#34D399]/30" />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-[10px] text-white/20 px-4">
          © 2026 Virtus. Todos los derechos reservados. El contenido y la marca están protegidos por la legislación vigente.
        </p>
      </div>

    </div>
  )
}
