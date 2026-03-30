import { useState, useRef } from 'react'
import { Camera, Plus, Trash2, GripVertical } from 'lucide-react'
import { supabase, STORAGE_BUCKET, getPublicUrl } from '../../lib/supabase'
import type { Photo, PhotoEntityType } from '../../types'
import PhotoViewer  from './PhotoViewer'
import PhotoCropper from './PhotoCropper'
import ConfirmDialog from '../ui/ConfirmDialog'

interface PhotoGridProps {
  entityType: PhotoEntityType
  entityId:   string
  userId:     string
  photos:     Photo[]
  onUpdated:  () => void
  readOnly?:  boolean
}

export default function PhotoGrid({ entityType, entityId, userId, photos, onUpdated, readOnly = false }: PhotoGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cropSrc,    setCropSrc]    = useState<string | null>(null)
  const [viewerIdx,  setViewerIdx]  = useState<number | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // ── Select file ──────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    // Reset so same file can be picked again
    e.target.value = ''
  }

  // ── After crop done → upload to Supabase Storage ────────────────────────────
  const handleCropDone = async (blob: Blob) => {
    setCropSrc(null)
    setUploading(true)

    const ext     = 'jpg'
    const path    = `${userId}/${entityType}/${entityId}/${Date.now()}.${ext}`
    const thumbPath = `${userId}/${entityType}/${entityId}/thumb_${Date.now()}.${ext}`

    // Upload full image
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

    if (upErr) { setUploading(false); alert('อัปโหลดรูปล้มเหลว: ' + upErr.message); return }

    // Create thumbnail (resize via canvas)
    const thumbBlob = await resizeBlob(blob, 300)
    await supabase.storage.from(STORAGE_BUCKET).upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: false })

    // Insert record
    const maxOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) : -1
    await supabase.from('pm_photos').insert({
      entity_type:    entityType,
      entity_id:      entityId,
      storage_path:   path,
      thumbnail_path: thumbPath,
      original_name:  'photo.jpg',
      file_size:      blob.size,
      mime_type:      'image/jpeg',
      display_order:  maxOrder + 1,
    })

    setUploading(false)
    onUpdated()
  }

  // ── Delete photo ──────────────────────────────────────────────────────────────
  const handleDelete = async (photoId: string) => {
    setDeleting(photoId)
    const photo = photos.find(p => p.id === photoId)
    if (photo) {
      await supabase.storage.from(STORAGE_BUCKET).remove([photo.storage_path])
      if (photo.thumbnail_path) await supabase.storage.from(STORAGE_BUCKET).remove([photo.thumbnail_path])
    }
    await supabase.from('pm_photos').delete().eq('id', photoId)
    setDeleting(null)
    setConfirmDel(null)
    onUpdated()
  }

  return (
    <>
      {/* Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">รูปภาพ ({photos.length})</span>
          {!readOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium active:text-primary-800 disabled:opacity-50"
            >
              <Plus size={14} />
              เพิ่มรูป
            </button>
          )}
        </div>

        {photos.length === 0 && !uploading && (
          <div
            onClick={() => !readOnly && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl gap-1 ${!readOnly ? 'cursor-pointer active:border-primary-300' : ''}`}
          >
            <Camera size={22} className="text-gray-300" />
            <span className="text-xs text-gray-400">{readOnly ? 'ไม่มีรูปภาพ' : 'แตะเพื่อเพิ่มรูป'}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.caption ?? ''}
                className="w-full h-full object-cover cursor-pointer active:opacity-80"
                onClick={() => setViewerIdx(i)}
                loading="lazy"
              />
              {!readOnly && (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDel(photo.id) }}
                  disabled={deleting === photo.id}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white active:bg-red-600"
                >
                  {deleting === photo.id
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={11} />
                  }
                </button>
              )}
            </div>
          ))}

          {uploading && (
            <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input – capture="environment" for iOS camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Crop modal */}
      {cropSrc && (
        <PhotoCropper
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
        />
      )}

      {/* Full-screen viewer */}
      {viewerIdx !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIdx}
          onClose={() => setViewerIdx(null)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && handleDelete(confirmDel)}
        title="ลบรูปภาพ"
        message="คุณต้องการลบรูปภาพนี้ใช่หรือไม่?"
        confirmLabel="ลบ"
        danger
        loading={deleting !== null}
      />
    </>
  )
}

// ── Helper: resize blob via canvas ───────────────────────────────────────────
async function resizeBlob(blob: Blob, maxSize: number): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const ratio  = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.75)
    }
    img.src = url
  })
}
