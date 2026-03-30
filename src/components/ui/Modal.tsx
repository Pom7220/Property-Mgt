import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  fullScreen?: boolean
}

export default function Modal({ open, onClose, title, children, fullScreen = false }: ModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative bg-white w-full z-10 ${
          fullScreen
            ? 'h-full rounded-none'
            : 'max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden'
        }`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 active:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={`overflow-y-auto ${fullScreen ? 'h-full pb-safe' : 'max-h-[80vh]'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
