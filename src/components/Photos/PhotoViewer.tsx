import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import type { Photo } from '../../types'

interface PhotoViewerProps {
  photos: Photo[]
  initialIndex?: number
  onClose: () => void
}

export default function PhotoViewer({ photos, initialIndex = 0, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pinch-to-zoom state
  const scaleRef     = useRef(1)
  const lastScaleRef = useRef(1)
  const originRef    = useRef({ x: 0, y: 0 })
  const translateRef = useRef({ x: 0, y: 0 })
  const imgRef       = useRef<HTMLImageElement>(null)
  const [, forceRender] = useState(0)

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Reset zoom when changing photo
  useEffect(() => {
    scaleRef.current     = 1
    lastScaleRef.current = 1
    translateRef.current = { x: 0, y: 0 }
    applyTransform()
  }, [index])

  const applyTransform = () => {
    if (!imgRef.current) return
    imgRef.current.style.transform =
      `translate(${translateRef.current.x}px, ${translateRef.current.y}px) scale(${scaleRef.current})`
    forceRender(n => n + 1)
  }

  // Touch handling for pinch-zoom + swipe
  const touchesRef    = useRef<React.Touch[]>([])
  const swipeStartX   = useRef(0)
  const isDragging    = useRef(false)

  const getTouchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchesRef.current = Array.from(e.touches) as unknown as React.Touch[]
      lastScaleRef.current = scaleRef.current
    } else if (e.touches.length === 1 && scaleRef.current <= 1) {
      swipeStartX.current = e.touches[0].clientX
      isDragging.current  = true
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2) {
      // Pinch zoom
      const newDist  = getTouchDist(e.touches)
      const prevDist = Math.hypot(
        touchesRef.current[0].clientX - touchesRef.current[1].clientX,
        touchesRef.current[0].clientY - touchesRef.current[1].clientY,
      )
      const ratio = prevDist > 0 ? newDist / prevDist : 1
      scaleRef.current = Math.min(5, Math.max(1, lastScaleRef.current * ratio))
      applyTransform()
    } else if (e.touches.length === 1 && isDragging.current && scaleRef.current > 1) {
      // Pan when zoomed
      const dx = e.touches[0].clientX - swipeStartX.current
      translateRef.current = { x: translateRef.current.x + dx, y: translateRef.current.y }
      swipeStartX.current  = e.touches[0].clientX
      applyTransform()
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isDragging.current && scaleRef.current <= 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - swipeStartX.current
      if (Math.abs(dx) > 60) {
        if (dx < 0 && index < photos.length - 1) setIndex(i => i + 1)
        if (dx > 0 && index > 0)                 setIndex(i => i - 1)
      }
    }
    isDragging.current = false
  }

  const onDoubleTap = () => {
    if (scaleRef.current > 1) {
      scaleRef.current     = 1
      translateRef.current = { x: 0, y: 0 }
    } else {
      scaleRef.current = 2.5
    }
    applyTransform()
  }

  const photo = photos[index]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ touchAction: 'none' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pb-2 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 text-white active:bg-black/60"
        >
          <X size={20} />
        </button>
        <span className="text-white/80 text-sm">{index + 1} / {photos.length}</span>
        <div className="w-9" />
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={onDoubleTap}
      >
        <img
          ref={imgRef}
          src={photo.url}
          alt={photo.caption ?? ''}
          className="max-w-full max-h-full object-contain select-none"
          style={{ willChange: 'transform', transition: 'transform 0.05s' }}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {photo.caption && (
        <div className="absolute bottom-20 left-0 right-0 px-4 pb-2 text-center">
          <span className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">{photo.caption}</span>
        </div>
      )}

      {/* Bottom nav arrows (desktop-friendly fallback) */}
      <div className="flex items-center justify-between px-4 pb-safe pt-2 bg-gradient-to-t from-black/60 to-transparent absolute bottom-0 left-0 right-0">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="p-2 rounded-full bg-black/40 text-white disabled:opacity-30 active:bg-black/60"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-1.5">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === index ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex(i => Math.min(photos.length - 1, i + 1))}
          disabled={index === photos.length - 1}
          className="p-2 rounded-full bg-black/40 text-white disabled:opacity-30 active:bg-black/60"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Hint */}
      {scaleRef.current <= 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 animate-fade-out">
          <ZoomIn size={32} className="text-white/50" />
        </div>
      )}
    </div>
  )
}
