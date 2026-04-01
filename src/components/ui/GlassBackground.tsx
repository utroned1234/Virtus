'use client'

export default function GlassBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" style={{ background: 'linear-gradient(135deg, #0A1A1A 0%, #122524 50%, #1A3D38 100%)' }}>
            {/* Soft gradient blobs */}
            <div
                className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full opacity-20 filter blur-[100px] animate-blob"
                style={{
                    background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
                    animationDelay: '0s'
                }}
            />

            <div
                className="absolute top-[30%] right-[-10%] w-[45%] h-[50%] rounded-full opacity-15 filter blur-[120px] animate-blob"
                style={{
                    background: 'radial-gradient(circle, #059669 0%, transparent 70%)',
                    animationDelay: '3s'
                }}
            />

            <div
                className="absolute bottom-[-10%] left-[25%] w-[40%] h-[40%] rounded-full opacity-15 filter blur-[80px] animate-blob"
                style={{
                    background: 'radial-gradient(circle, #1A3D38 0%, transparent 70%)',
                    animationDelay: '5s'
                }}
            />

            <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 12s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
        </div>
    )
}
