import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FeeFormValues, FeeType, FeeFrequency, Fee } from '../../types'
import { FEE_TYPE_LABELS, FEE_FREQ_LABELS } from '../../types'

interface Props { propertyId: string; initial?: Fee; onSaved: () => void }

const empty: FeeFormValues = {
  fee_type: 'management', name: '', amount: null, frequency: 'annual',
  due_month: null, last_paid_date: null, next_due_date: null, notes: null,
}

function calcNextDue(lastPaid: string, frequency: FeeFrequency): string {
  const d = new Date(lastPaid)
  if (frequency === 'monthly')     d.setMonth(d.getMonth() + 1)
  else if (frequency === 'semi_annual') d.setMonth(d.getMonth() + 6)
  else if (frequency === 'annual') d.setFullYear(d.getFullYear() + 1)
  else return ''
  return d.toISOString().slice(0, 10)
}

export default function FeeForm({ propertyId, initial, onSaved }: Props) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<FeeFormValues>(initial ? {
    fee_type: initial.fee_type, name: initial.name, amount: initial.amount,
    frequency: initial.frequency, due_month: initial.due_month,
    last_paid_date: initial.last_paid_date, next_due_date: initial.next_due_date, notes: initial.notes,
  } : empty)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const set = <K extends keyof FeeFormValues>(k: K, v: FeeFormValues[K]) => setForm(f => ({ ...f, [k]: v }))

  // When last_paid_date changes, auto-compute next_due_date
  const handleLastPaidChange = (val: string | null) => {
    setForm(f => ({
      ...f,
      last_paid_date: val,
      next_due_date: val && f.frequency !== 'one_time' ? calcNextDue(val, f.frequency) : f.next_due_date,
    }))
  }

  // When frequency changes, recompute next_due_date if last_paid is set
  const handleFrequencyChange = (val: FeeFrequency) => {
    setForm(f => ({
      ...f,
      frequency: val,
      next_due_date: f.last_paid_date && val !== 'one_time' ? calcNextDue(f.last_paid_date, val) : f.next_due_date,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    const payload = { ...form, property_id: propertyId, updated_at: new Date().toISOString() }
    const { error } = isEdit
      ? await supabase.from('pm_fees').update(payload).eq('id', initial!.id)
      : await supabase.from('pm_fees').insert({ ...payload, created_at: new Date().toISOString() })
    setLoading(false)
    if (error) setError(error.message); else onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ประเภท<span className="text-red-400 ml-0.5">*</span></label>
        <select value={form.fee_type} onChange={e => set('fee_type', e.target.value as FeeType)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          {(Object.entries(FEE_TYPE_LABELS) as [FeeType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อรายการ<span className="text-red-400 ml-0.5">*</span></label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="เช่น ค่าส่วนกลาง ปีละ 2 ครั้ง"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนเงิน (บาท)</label>
          <input type="number" value={form.amount ?? ''} onChange={e => set('amount', e.target.value ? +e.target.value : null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ความถี่</label>
          <select value={form.frequency} onChange={e => handleFrequencyChange(e.target.value as FeeFrequency)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
            {(Object.entries(FEE_FREQ_LABELS) as [FeeFrequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ชำระล่าสุด</label>
          <input type="date" value={form.last_paid_date ?? ''} onChange={e => handleLastPaidChange(e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            ครบกำหนดต่อไป
            {form.last_paid_date && form.frequency !== 'one_time' && (
              <span className="text-primary-400 font-normal ml-1">(คำนวณอัตโนมัติ)</span>
            )}
          </label>
          <input type="date" value={form.next_due_date ?? ''} onChange={e => set('next_due_date', e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label>
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={loading || !form.name}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm active:bg-primary-700 disabled:opacity-60">
        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </form>
  )
}
