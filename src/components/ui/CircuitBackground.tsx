'use client'

import { useEffect, useRef } from 'react'

export default function CircuitBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svgNS = "http://www.w3.org/2000/svg"

    // Crear SVG
    const svg = document.createElementNS(svgNS, "svg")
    svg.setAttribute("width", "100%")
    svg.setAttribute("height", "100%")
    svg.style.position = "absolute"
    container.appendChild(svg)

    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const numLines = 40

    function createCircuitLine() {
      const startX = centerX + (Math.random() - 0.5) * 100
      const startY = centerY + (Math.random() - 0.5) * 60

      let pathD = `M ${startX} ${startY}`
      let currentX = startX
      let currentY = startY

      const segments = 3 + Math.floor(Math.random() * 4)

      for (let i = 0; i < segments; i++) {
        const isHorizontal = Math.random() > 0.5
        const length = 50 + Math.random() * 150
        const direction = Math.random() > 0.5 ? 1 : -1

        if (isHorizontal) {
          currentX += length * direction
        } else {
          currentY += length * direction
        }
        pathD += ` L ${currentX} ${currentY}`
      }

      // Path del circuito
      const path = document.createElementNS(svgNS, "path")
      path.setAttribute("d", pathD)
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", "#10B981")
      path.setAttribute("stroke-width", "1")
      path.style.opacity = String(0.05 + Math.random() * 0.1)
      svg.appendChild(path)

      // Partícula luminosa
      const circle = document.createElementNS(svgNS, "circle")
      circle.setAttribute("r", "1.5")
      circle.setAttribute("fill", "#6EE7B7")
      circle.style.filter = "drop-shadow(0 0 2px #10B981)"
      circle.style.opacity = "0.4"

      const animateMotion = document.createElementNS(svgNS, "animateMotion")
      animateMotion.setAttribute("dur", (4 + Math.random() * 5) + "s")
      animateMotion.setAttribute("repeatCount", "indefinite")
      animateMotion.setAttribute("path", pathD)

      circle.appendChild(animateMotion)
      svg.appendChild(circle)

      // Nodo al final
      const endNode = document.createElementNS(svgNS, "circle")
      endNode.setAttribute("cx", String(currentX))
      endNode.setAttribute("cy", String(currentY))
      endNode.setAttribute("r", "1")
      endNode.setAttribute("fill", "#10B981")
      endNode.setAttribute("opacity", "0.25")
      svg.appendChild(endNode)
    }

    for (let i = 0; i < numLines; i++) {
      createCircuitLine()
    }

    return () => {
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [])

  return (
    <>
      {/* Overlay de fondo */}
      <div
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ backgroundColor: 'transparent' }}
      />

      {/* Contenedor del circuito SVG */}
      <div
        ref={containerRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: 'transparent' }}
      />

      {/* Rayos de energía horizontales */}
      <div
        className="fixed left-0 w-full h-0.5 z-0 pointer-events-none"
        style={{
          top: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent)',
          filter: 'blur(3px)',
          animation: 'streamPass 7s infinite cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      />
      <div
        className="fixed left-0 w-full h-0.5 z-0 pointer-events-none"
        style={{
          top: '60%',
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.25), transparent)',
          filter: 'blur(3px)',
          animation: 'streamPass 7s infinite cubic-bezier(0.4, 0.0, 0.2, 1)',
          animationDelay: '2s',
        }}
      />
      <div
        className="fixed left-0 w-full z-0 pointer-events-none"
        style={{
          top: '30%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent)',
          filter: 'blur(3px)',
          animation: 'streamPass 7s infinite cubic-bezier(0.4, 0.0, 0.2, 1)',
          animationDelay: '4s',
        }}
      />

      <style jsx global>{`
        @keyframes streamPass {
          0% {
            transform: translateX(-100%) scaleX(0.2);
            opacity: 0;
          }
          50% {
            opacity: 1;
            transform: translateX(0%) scaleX(1);
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
