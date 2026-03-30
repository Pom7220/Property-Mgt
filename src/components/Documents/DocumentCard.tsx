import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { PropertyDocument } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'
import PhotoGrid     from '../Photos/PhotoGrid'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  doc:       PropertyDocument
  userId:    string
  onEdit:    () => void
  onUpdated: () => void
}

const isExpiringSoon = (date: string | null) => {
  if (!date) return false
  const diff = (new Date(date).getTime() - Date.now()) / 86400000
  return diff > 0 && diff <= 60
}

const isExpired = (date: string | null) => {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

export default function DocumentCard({ doc, userId, onEdit, onUpdated }: Props) {
  const [expanded,   setExpanded]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('pm_documents').delete().eq('id', doc.id)
    setDeleting(false)
    onUpdated()
  }

  const expiryStatus = isExpired(doc.expiry_date)
    ? 'expired'
    : isExpiringSoon(doc.expiry_date) ? 'soon' : 'ok'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.doc_type]}</p>
          <p className="font-medium text-sm text-gray-900 truncate">{doc.name}</p>
          {doc.expiry_date && (
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${
              expiryStatus === 'expired' ? 'text-red-500' :
              expiryStatus === 'soon'    ? 'text-amber-500' : 'text-gray-400'
            }`}>
              <Calendar size={10} />
              หมดอายุ {doc.expiry_date}
              {expiryStatus === 'expired' && ' (หมดอายุแล้ว)'}
              {expiryStatus === 'soon'    && ' (ใกล้หมดอายุ)'}
            </p>
          )}
        </div>
        {doc.photos && doc.photos.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
            {doc.photos.length} รูป
          </span>
        )}
        {expanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">
          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary-600 active:text-primary-800 px-3 py-1.5 rounded-lg border border-primary-200 active:bg-primary-50">
              <Pencil size={12} /> แก้ไข
            </button>
            <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1 text-xs text-red-500 active:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 active:bg-red-50">
              <Trash2 size={12} /> ลบ
            </button>
          </div>

          {/* Meta fields */}
          {[
            ['เลขที่เอกสาร', doc.document_number],
            ['วันที่ออก',    doc.issue_date],
            ['ผู้ออกเอกสาร', doc.issuer],
            ['คำอธิบาย',    doc.description],
            ['หมายเหตุ',    doc.notes],
          ].filter(([,v]) => v).map(([l, v]) => (
            <div key={l as string} className="flex gap-2 text-sm">
              <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{l}</span>
              <span className="text-sm text-gray-700 flex-1">{v}</span>
            </div>
          ))}

          {/* Photos */}
          <PhotoGrid
            entityType="document"
            entityId={doc.id}
            userId={userId}
            photos={doc.photos ?? []}
            onUpdated={onUpdated}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={handleDelete}
        title="ลบเอกสาร"
        message={`ลบเอกสาร "${doc.name}" ใช่หรือไม่?`}
        confirmLabel="ลบ"
        danger
        loading={deleting}
      />
    </div>
  )
}
