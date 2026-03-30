import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { TaxFormValues, TaxType, Tax } from '../../types'
import { TAX_TYPE_LABELS } from '../../types'

interface Props { propertyId: string; initial?: Tax; onSaved: () => void }

const empty: TaxFormValues = {
  tax_type: 'land', year: new Date().getFullYear(), amount: null,
  assessed_value: null, paid_date: null, receipt_number: null, notes: null,
}

export default function TaxForm({ propertyId, initial, onSaved }: Props) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<TaxFormValues>(initial ? {
    tax_type: initial.tax_type, year: initial.year, amount: initial.amount,
    assessed_value: initial.assessed_value, paid_date: initial.paid_date,
    receipt_number: initial.receipt_number, notes: initial.notes,
  } : empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TaxFormValues>(k: K, v: TaxFormValues[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    const payload = { ...form, property_id: propertyId, updated_at: new Date().toISOString() }
    const { error } = isEdit
      ? await supabase.from('pm_taxes').update(payload).eq('id', initial!.id)
      : await supabase.from('pm_taxes').insert({ ...payload, created_at: new Date().toISOString() })
    setLoading(false)
    if (error) setError(error.message); else onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทภาษี<span className="text-red-400 ml-0.5">*</span></label>
        <select value={form.tax_type} onChange={e => set('tax_type', e.target.value as TaxType)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
          {(Object.entries(TAX_TYPE_LABELS) as [TaxType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ปี พ.ศ.<span className="text-red-400 ml-0.5">*</span></label>
          <input type="number" value={form.year} onChange={e => set('year', +e.target.value)} min={2000} max={2100}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนภาษี (บาท)</label>
          <input type="number" value={form.amount ?? ''} onChange={e => set('amount', e.target.value ? +e.target.value : null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">มูลค่าประเมิน (บาท)</label>
        <input type="number" value={form.assessed_value ?? ''} onChange={e => set('assessed_value', e.target.value ? +e.target.value : null)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ชำระ</label>
          <input type="date" value={form.paid_date ?? ''} onChange={e => set('paid_date', e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">เลขที่ใบเสร็จ</label>
          <input type="text" value={form.receipt_number ?? ''} onChange={e => set('receipt_number', e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label>
        <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm active:bg-primary-700 disabled:opacity-60">
        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </form>
  )
}
