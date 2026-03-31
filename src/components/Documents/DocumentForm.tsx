import { useState } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { DocumentFormValues, DocumentType, PropertyDocument } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'
import PhotoGrid from '../Photos/PhotoGrid'

interface Props {
  propertyId: string
  initial?:   PropertyDocument
  onSaved:    () => void
}

const empty: DocumentFormValues = {
  doc_type: 'title_deed', name: '', description: null,
  document_number: null, issue_date: null, expiry_date: null, issuer: null, notes: null,
}

export default function DocumentForm({ propertyId, initial, onSaved }: Props) {
  const { user } = useAuth()
  const isEdit   = Boolean(initial)

  // After save we switch to photo-upload step
  const [savedDoc, setSavedDoc] = useState<PropertyDocument | null>(initial ?? null)
  const [step, setStep]         = useState<'form' | 'photos'>(initial ? 'photos' : 'form')

  const [form, setForm] = useState<DocumentFormValues>(initial ? {
    doc_type: initial.doc_type, name: initial.name, description: initial.description,
    document_number: initial.document_number, issue_date: initial.issue_date,
    expiry_date: initial.expiry_date, issuer: initial.issuer, notes: initial.notes,
  } : empty)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const set = <K extends keyof DocumentFormValues>(k: K, v: DocumentFormValues[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)

    const payload = { ...form, property_id: propertyId, updated_at: new Date().toISOString() }

    if (isEdit && initial) {
      const { error } = await supabase.from('pm_documents').update(payload).eq('id', initial.id)
      setLoading(false)
      if (error) { setError(error.message); return }
      setSavedDoc({ ...initial, ...payload })
      setStep('photos')
    } else {
      const { data, error } = await supabase
        .from('pm_documents')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      setLoading(false)
      if (error || !data) { setError(error?.message ?? 'เกิดข้อผิดพลาด'); return }
      setSavedDoc(data)
      setStep('photos')
    }
  }

  // ── Photo step ────────────────────────────────────────────────────────────
  if (step === 'photos' && savedDoc) {
    return (
      <PhotoStep
        doc={savedDoc}
        userId={user!.id}
        onDone={onSaved}
      />
    )
  }

  // ── Form step ─────────────────────────────────────────────────────────────
  const inp = (k: keyof DocumentFormValues, type = 'text', placeholder = '') => (
    <input type={type} value={(form[k] as string) ?? ''} onChange={e => set(k, (e.target.value || null) as never)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
  )
  const field = (label: string, el: React.ReactNode, required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {el}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {field('ประเภทเอกสาร', (
        <select value={form.doc_type} onChange={e => set('doc_type', e.target.value as DocumentType)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) =>
            <option key={k} value={k}>{v}</option>)}
        </select>
      ), true)}

      {field('ชื่อเอกสาร', inp('name', 'text', 'เช่น โฉนดที่ดิน เลขที่ 12345'), true)}
      {field('เลขที่เอกสาร', inp('document_number', 'text', 'เลขที่หรือรหัสเอกสาร'))}

      <div className="grid grid-cols-2 gap-3">
        {field('วันที่ออก',    inp('issue_date',  'date'))}
        {field('วันหมดอายุ',  inp('expiry_date', 'date'))}
      </div>

      {field('ผู้ออกเอกสาร', inp('issuer', 'text', 'หน่วยงาน / บริษัท'))}
      {field('คำอธิบาย', (
        <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value || null)}
          rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      ))}
      {field('หมายเหตุ', (
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)}
          rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      ))}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button type="submit" disabled={loading || !form.name}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm active:bg-primary-700 disabled:opacity-60">
        {loading ? 'กำลังบันทึก...' : 'บันทึก และเพิ่มรูปภาพ →'}
      </button>
    </form>
  )
}

// ── Photo upload step shown inline after save ─────────────────────────────────
function PhotoStep({ doc, userId, onDone }: { doc: PropertyDocument; userId: string; onDone: () => void }) {
  const [photos, setPhotos] = useState(doc.photos ?? [])

  // Re-fetch photos to keep grid in sync
  const handleUpdated = async () => {
    const { fetchEntityPhotos } = await import('../../lib/photos')
    const updated = await fetchEntityPhotos('document', doc.id)
    setPhotos(updated)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Doc summary */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
        <p className="text-xs text-primary-500 font-medium">เอกสารบันทึกแล้ว</p>
        <p className="text-sm font-semibold text-primary-800">{doc.name}</p>
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-600 font-medium">
        เพิ่มรูปภาพเอกสาร
        <span className="text-gray-400 font-normal ml-1">(ถ่ายรูปหรือเลือกจากคลัง)</span>
      </p>

      <PhotoGrid
        entityType="document"
        entityId={doc.id}
        userId={userId}
        photos={photos}
        onUpdated={handleUpdated}
      />

      <button
        onClick={onDone}
        className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:bg-gray-700"
      >
        <Check size={16} /> เสร็จสิ้น
      </button>
    </div>
  )
}
