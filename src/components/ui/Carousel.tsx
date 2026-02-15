'use client'

import { useState, useEffect } from 'react'

interface CarouselProps {
  images: { id: number; image_url: string; link_url?: string | null }[]
  autoPlayInterval?: number
}

export default function Carousel({ images, autoPlayInterval = 5000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [images.length, autoPlayInterval])

  if (images.length === 0) {
    return (
      <div className="bg-dark-card rounded-card flex items-center justify-center" style={{ height: '200px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <p className="text-text-secondary">No hay banners disponibles</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', borderRadius: '20px' }}>
      {images.map((img, index) => (
        <div
          key={img.id}
          className={`transition-opacity duration-700 ${
            index === currentIndex ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'
          }`}
        >
          <img
            src={img.image_url}
            alt={`Banner ${index + 1}`}
            className="w-full h-auto"
            style={{ borderRadius: '20px' }}
          />
        </div>
      ))}

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-gold w-8' : 'bg-text-secondary'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
