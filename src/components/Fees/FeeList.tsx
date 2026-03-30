import { useState, useEffect } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { supabase, getPublicUrl } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Fee } from '../../types'
import { FEE_TYPE_LABELS, FEE_FREQ_LABELS } from '../../types'
import Modal         from '../ui/Modal'
import FeeForm       from './FeeForm'
import PhotoGrid     from '../Photos/PhotoGrid'
import ConfirmDialog from '../ui/ConfirmDialog'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { propertyId: string }

export default function FeeList({ propertyId }: Props) {
  const { user } = useAuth()
  const [fees,    setFees]    = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Fee | null>(null)

  useEffect(() => { fetchFees() }, [propertyId])

  const fetchFees = async () => {
    const { data } = await supabase
      .from('pm_fees')
      .select('*, photos:pm_photos(id,storage_path,thumbnail_path,display_order,caption,entity_type)')
      .eq('property_id', propertyId)
      .order('fee_type')

    if (data) setFees(data.map(f => ({
      ...f,
      photos: (f.photos ?? [])
        .filter((ph: { entity_type: string }) => ph.entity_type === 'fee')
        .map((ph: { id: string; storage_path: string; thumbnail_path: string | null; display_order: number; caption: string | null; entity_type: string }) => ({
          ...ph,
          url:           getPublicUrl(ph.storage_path),
          thumbnail_url: ph.thumbnail_path ? getPublicUrl(ph.thumbnail_path) : getPublicUrl(ph.storage_path),
        }))
        .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
    })))
    setLoading(false)
  }

  const totalAnnual = fees.reduce((sum, f) => {
    if (!f.amount) return sum
    const m = f.frequency === 'monthly' ? 12 : f.frequency === 'semi_annual' ? 2 : f.frequency === 'annual' ? 1 : 0
    return sum + f.amount * m
  }, 0)

  return (
    <div className="p-4 space-y-3">
      {/* Summary */}
      {fees.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs text-primary-700 font-medium">รวมค่าใช้จ่ายต่อปี</span>
          <span className="text-sm font-bold text-primary-800">฿{totalAnnual.toLocaleString()}</span>
        </div>
      )}

      <button
        onClick={() => { setEditing(null); setModal(true) }}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 active:border-primary-300 active:text-primary-600"
      >
        <Plus size={18} /> เพิ่มค่าใช้จ่าย
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : fees.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Wallet size={40} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีค่าใช้จ่าย</p>
        </div>
      ) : (
        fees.map(fee => (
          <FeeCard key={fee.id} fee={fee} userId={user!.id}
            onEdit={() => { setEditing(fee); setModal(true) }} onUpdated={fetchFees} />
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}>
        <FeeForm propertyId={propertyId} initial={editing ?? undefined} onSaved={() => { setModal(false); fetchFees() }} />
      </Modal>
    </div>
  )
}

function FeeCard({ fee, userId, onEdit, onUpdated }: { fee: Fee; userId: string; onEdit: () => void; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('pm_fees').delete().eq('id', fee.id)
    setDeleting(false); onUpdated()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">{FEE_TYPE_LABELS[fee.fee_type]}</p>
          <p className="font-medium text-sm text-gray-900">{fee.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {fee.amount != null ? `฿${fee.amount.toLocaleString()}` : '-'} • {FEE_FREQ_LABELS[fee.frequency]}
          </p>
        </div>
        {fee.next_due_date && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">ครบ {fee.next_due_date}</span>}
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
          {[['ชำระล่าสุด', fee.last_paid_date], ['หมายเหตุ', fee.notes]].filter(([,v]) => v).map(([l, v]) => (
            <div key={l as string} className="flex gap-2"><span className="text-xs text-gray-400 w-24 flex-shrink-0">{l}</span><span className="text-sm text-gray-700">{v}</span></div>
          ))}
          <PhotoGrid entityType="fee" entityId={fee.id} userId={userId} photos={fee.photos ?? []} onUpdated={onUpdated} />
        </div>
      )}
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={handleDelete}
        title="ลบค่าใช้จ่าย" message={`ลบ "${fee.name}" ใช่หรือไม่?`} confirmLabel="ลบ" danger loading={deleting} />
    </div>
  )
}
