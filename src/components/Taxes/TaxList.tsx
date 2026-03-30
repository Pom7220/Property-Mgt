import { useState, useEffect } from 'react'
import { Plus, Receipt, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, getPublicUrl } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Tax } from '../../types'
import { TAX_TYPE_LABELS } from '../../types'
import Modal         from '../ui/Modal'
import TaxForm       from './TaxForm'
import PhotoGrid     from '../Photos/PhotoGrid'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props { propertyId: string }

export default function TaxList({ propertyId }: Props) {
  const { user } = useAuth()
  const [taxes,   setTaxes]   = useState<Tax[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Tax | null>(null)

  useEffect(() => { fetchTaxes() }, [propertyId])

  const fetchTaxes = async () => {
    const { data } = await supabase
      .from('pm_taxes')
      .select('*, photos:pm_photos(id,storage_path,thumbnail_path,display_order,caption,entity_type)')
      .eq('property_id', propertyId)
      .order('year', { ascending: false })

    if (data) setTaxes(data.map(t => ({
      ...t,
      photos: (t.photos ?? [])
        .filter((ph: { entity_type: string }) => ph.entity_type === 'tax')
        .map((ph: { id: string; storage_path: string; thumbnail_path: string | null; display_order: number; caption: string | null; entity_type: string }) => ({
          ...ph,
          url:           getPublicUrl(ph.storage_path),
          thumbnail_url: ph.thumbnail_path ? getPublicUrl(ph.thumbnail_path) : getPublicUrl(ph.storage_path),
        }))
        .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
    })))
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => { setEditing(null); setModal(true) }}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 active:border-primary-300 active:text-primary-600">
        <Plus size={18} /> เพิ่มรายการภาษี
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : taxes.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Receipt size={40} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีรายการภาษี</p>
        </div>
      ) : (
        taxes.map(tax => (
          <TaxCard key={tax.id} tax={tax} userId={user!.id}
            onEdit={() => { setEditing(tax); setModal(true) }} onUpdated={fetchTaxes} />
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'แก้ไขภาษี' : 'เพิ่มรายการภาษี'}>
        <TaxForm propertyId={propertyId} initial={editing ?? undefined} onSaved={() => { setModal(false); fetchTaxes() }} />
      </Modal>
    </div>
  )
}

function TaxCard({ tax, userId, onEdit, onUpdated }: { tax: Tax; userId: string; onEdit: () => void; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('pm_taxes').delete().eq('id', tax.id)
    setDeleting(false); onUpdated()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tax.year}</span>
            <p className="text-sm font-medium text-gray-900">{TAX_TYPE_LABELS[tax.tax_type]}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {tax.amount != null ? `฿${tax.amount.toLocaleString()}` : 'ยังไม่ระบุจำนวน'}
            {tax.paid_date ? ` • ชำระแล้ว ${tax.paid_date}` : ' • ยังไม่ชำระ'}
          </p>
        </div>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tax.paid_date ? 'bg-green-400' : 'bg-amber-400'}`} />
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">
          <div className="flex gap-2 justify-end">
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary-600 px-3 py-1.5 rounded-lg border border-primary-200">
              <Pencil size={12} /> แก้ไข
            </button>
            <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1 text-xs text-red-500 px-3 py-1.5 rounded-lg border border-red-200">
              <Trash2 size={12} /> ลบ
            </button>
          </div>
          {[['มูลค่าประเมิน', tax.assessed_value != null ? `฿${tax.assessed_value.toLocaleString()}` : null],
            ['เลขที่ใบเสร็จ', tax.receipt_number], ['หมายเหตุ', tax.notes]
          ].filter(([,v]) => v).map(([l, v]) => (
            <div key={l as string} className="flex gap-2"><span className="text-xs text-gray-400 w-28 flex-shrink-0">{l}</span><span className="text-sm text-gray-700">{v}</span></div>
          ))}
          <PhotoGrid entityType="tax" entityId={tax.id} userId={userId} photos={tax.photos ?? []} onUpdated={onUpdated} />
        </div>
      )}
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={handleDelete}
        title="ลบรายการภาษี" message={`ลบภาษีปี ${tax.year} ใช่หรือไม่?`} confirmLabel="ลบ" danger loading={deleting} />
    </div>
  )
}
