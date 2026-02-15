'use client'

import { useEffect, useRef } from 'react'

export default function StarfieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Star properties
        interface Star {
            x: number
            y: number
            size: number
            speed: number
            opacity: number
            twinkleSpeed: number
            twinklePhase: number
        }

        const stars: Star[] = []
        const starCount = 150

        // Initialize stars
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
            })
        }

        // Animation loop
        let animationId: number
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            stars.forEach((star) => {
                // Update twinkle
                star.twinklePhase += star.twinkleSpeed
                const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7

                // Draw star
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)

                // Verde lechuga color with twinkle
                const greenValue = Math.floor(217 * twinkle)
                ctx.fillStyle = `rgba(126, ${greenValue}, 87, ${star.opacity * twinkle})`
                ctx.fill()

                // Glow effect for larger stars
                if (star.size > 1.2) {
                    ctx.beginPath()
                    ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(126, 217, 87, ${star.opacity * 0.1 * twinkle})`
                    ctx.fill()
                }

                // Move star slowly
                star.y += star.speed
                if (star.y > canvas.height) {
                    star.y = 0
                    star.x = Math.random() * canvas.width
                }
            })

            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    )
}
