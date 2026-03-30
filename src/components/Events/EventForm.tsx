import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { EventFormValues, EventType, PropertyEvent } from '../../types'
import { EVENT_TYPE_LABELS } from '../../types'

interface Props { propertyId: string; initial?: PropertyEvent; onSaved: () => void }

const empty: EventFormValues = {
  event_type: 'repair', title: '', description: null,
  event_date: null, cost: null, contractor: null, notes: null,
}

export default function EventForm({ propertyId, initial, onSaved }: Props) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<EventFormValues>(initial ? {
    event_type: initial.event_type, title: initial.title, description: initial.description,
    event_date: initial.event_date, cost: initial.cost, contractor: initial.contractor, notes: initial.notes,
  } : empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    const payload = { ...form, property_id: propertyId, updated_at: new Date().toISOString() }
    const { error } = isEdit
      ? await supabase.from('pm_events').update(payload).eq('id', initial!.id)
      : await supabase.from('pm_events').insert({ ...payload, created_at: new Date().toISOString() })
    setLoading(false)
    if (error) setError(error.message); else onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ประเภท<span className="text-red-400 ml-0.5">*</span></label>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([k, v]) => (
            <button key={k} type="button" onClick={() => set('event_type', k)}
              className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                form.event_type === k ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-600'
              }`}>{v}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">หัวข้อ<span className="text-red-400 ml-0.5">*</span></label>
        <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="เช่น ซ่อมหลังคารั่ว, ต่อเติมห้องนอน, แผ่นดินไหว 2567"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">วันที่</label>
          <input type="date" value={form.event_date ?? ''} onChange={e => set('event_date', e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ค่าใช้จ่าย (บาท)</label>
          <input type="number" value={form.cost ?? ''} onChange={e => set('cost', e.target.value ? +e.target.value : null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับเหมา / บริษัท</label>
        <input type="text" value={form.contractor ?? ''} onChange={e => set('contractor', e.target.value || null)}
          placeholder="ชื่อผู้รับเหมาหรือบริษัท"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
        <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value || null)} rows={3}
          placeholder="อธิบายรายละเอียดของเหตุการณ์..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label>
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={loading || !form.title}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm active:bg-primary-700 disabled:opacity-60">
        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </form>
  )
}
