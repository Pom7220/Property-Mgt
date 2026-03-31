import { useState, useEffect } from 'react'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fetchPhotos } from '../../lib/photos'
import { useAuth } from '../../contexts/AuthContext'
import type { PropertyDocument } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'
import Modal         from '../ui/Modal'
import DocumentForm  from './DocumentForm'
import DocumentCard  from './DocumentCard'

interface Props { propertyId: string }

export default function DocumentList({ propertyId }: Props) {
  const { user } = useAuth()
  const [docs,    setDocs]    = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<PropertyDocument | null>(null)

  useEffect(() => { fetchDocs() }, [propertyId])

  const fetchDocs = async () => {
    const { data, error } = await supabase
      .from('pm_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const photoMap = await fetchPhotos('document', data.map(d => d.id))
      setDocs(data.map(d => ({ ...d, photos: photoMap[d.id] ?? [] })))
    }
    setLoading(false)
  }

  const openAdd  = () => { setEditing(null); setModal(true) }
  const openEdit = (doc: PropertyDocument) => { setEditing(doc); setModal(true) }

  const soon = docs.filter(d => {
    if (!d.expiry_date) return false
    const diff = (new Date(d.expiry_date).getTime() - Date.now()) / 86400000
    return diff > 0 && diff <= 60
  })

  return (
    <div className="p-4 space-y-3">
      {soon.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700">เอกสารใกล้หมดอายุ</p>
            {soon.map(d => (
              <p key={d.id} className="text-xs text-amber-600">{d.name} – {d.expiry_date}</p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 active:border-primary-300 active:text-primary-600"
      >
        <Plus size={18} /> เพิ่มเอกสาร
      </button>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText size={40} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีเอกสาร</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <DocumentCard key={doc.id} doc={doc} userId={user!.id}
              onEdit={() => openEdit(doc)} onUpdated={fetchDocs} />
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? `แก้ไข: ${DOC_TYPE_LABELS[editing.doc_type]}` : 'เพิ่มเอกสาร'}>
        <DocumentForm propertyId={propertyId} initial={editing ?? undefined}
          onSaved={() => { setModal(false); fetchDocs() }} />
      </Modal>
    </div>
  )
}
