import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Check, X } from 'lucide-react'

interface PhotoCropperProps {
  src: string          // object URL of the selected image
  onDone: (blob: Blob) => void
  onCancel: () => void
}

function centerAspectCrop(w: number, h: number) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, w / h, w, h), w, h)
}

export default function PhotoCropper({ src, onDone, onCancel }: PhotoCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    setCrop(centerAspectCrop(w, h))
  }, [])

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return

    const img    = imgRef.current
    const scaleX = img.naturalWidth  / img.width
    const scaleY = img.naturalHeight / img.height

    const canvas = document.createElement('canvas')
    const ctx    = canvas.getContext('2d')!

    const pixelRatio = window.devicePixelRatio
    canvas.width  = completedCrop.width  * scaleX * pixelRatio
    canvas.height = completedCrop.height * scaleY * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      img,
      completedCrop.x  * scaleX,
      completedCrop.y  * scaleY,
      completedCrop.width  * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      completedCrop.width  * scaleX,
      completedCrop.height * scaleY,
    )

    canvas.toBlob(blob => {
      if (blob) onDone(blob)
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pb-2 bg-black">
        <button onClick={onCancel} className="p-2 text-white/80 active:text-white">
          <X size={22} />
        </button>
        <p className="text-white text-sm font-medium">ครอบรูปภาพ</p>
        <button
          onClick={handleConfirm}
          disabled={!completedCrop}
          className="p-2 text-primary-400 disabled:opacity-40 active:text-primary-300"
        >
          <Check size={22} />
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
        <ReactCrop
          crop={crop}
          onChange={c => setCrop(c)}
          onComplete={c => setCompletedCrop(c)}
          minWidth={30}
          minHeight={30}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={onImageLoad}
            alt="crop preview"
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(100dvh - 120px)' }}
          />
        </ReactCrop>
      </div>

      <p className="text-center text-white/50 text-xs pb-safe pb-3">ลากเพื่อเลือกพื้นที่ • แตะ ✓ เพื่อยืนยัน</p>
    </div>
  )
}
