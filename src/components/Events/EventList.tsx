import { useState, useEffect } from 'react'
import { Plus, Zap, Pencil, Trash2, Calendar, DollarSign } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fetchPhotos } from '../../lib/photos'
import { useAuth } from '../../contexts/AuthContext'
import type { PropertyEvent } from '../../types'
import { EVENT_TYPE_LABELS } from '../../types'
import Modal         from '../ui/Modal'
import EventForm     from './EventForm'
import PhotoGrid     from '../Photos/PhotoGrid'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props { propertyId: string }

const EVENT_COLORS: Record<string, string> = {
  renovation: 'bg-blue-100 text-blue-700',
  repair:     'bg-orange-100 text-orange-700',
  incident:   'bg-red-100 text-red-700',
  inspection: 'bg-purple-100 text-purple-700',
  other:      'bg-gray-100 text-gray-700',
}

export default function EventList({ propertyId }: Props) {
  const { user } = useAuth()
  const [events,  setEvents]  = useState<PropertyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<PropertyEvent | null>(null)

  useEffect(() => { fetchEvents() }, [propertyId])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('pm_events')
      .select('*')
      .eq('property_id', propertyId)
      .order('event_date', { ascending: false, nullsFirst: false })

    if (!error && data) {
      const photoMap = await fetchPhotos('event', data.map(e => e.id))
      setEvents(data.map(e => ({ ...e, photos: photoMap[e.id] ?? [] })))
    }
    setLoading(false)
  }

  const totalCost = events.reduce((s, e) => s + (e.cost ?? 0), 0)

  return (
    <div className="p-4 space-y-3">
      {events.length > 0 && totalCost > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs text-orange-700 font-medium">ค่าใช้จ่ายรวมทั้งหมด</span>
          <span className="text-sm font-bold text-orange-800">฿{totalCost.toLocaleString()}</span>
        </div>
      )}

      <button onClick={() => { setEditing(null); setModal(true) }}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 active:border-primary-300 active:text-primary-600">
        <Plus size={18} /> บันทึกเหตุการณ์
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Zap size={40} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีเหตุการณ์สำคัญ</p>
          <p className="text-xs text-gray-300 mt-1">เช่น ต่อเติม ซ่อมแซม เหตุการณ์พิเศษ</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-3">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} userId={user!.id}
                onEdit={() => { setEditing(ev); setModal(true) }} onUpdated={fetchEvents}
                colorClass={EVENT_COLORS[ev.event_type] ?? EVENT_COLORS.other} />
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'แก้ไขเหตุการณ์' : 'บันทึกเหตุการณ์'}>
        <EventForm propertyId={propertyId} initial={editing ?? undefined}
          onSaved={() => { setModal(false); fetchEvents() }} />
      </Modal>
    </div>
  )
}

function EventCard({ event: ev, userId, onEdit, onUpdated, colorClass }: {
  event: PropertyEvent; userId: string; onEdit: () => void; onUpdated: () => void; colorClass: string
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('pm_events').delete().eq('id', ev.id)
    setDeleting(false); onUpdated()
  }

  return (
    <div className="flex gap-3 relative">
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${colorClass}`}>
        <Zap size={14} />
      </div>
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-4 py-3 active:bg-gray-50">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900">{ev.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ev.event_date && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <Calendar size={10} /> {ev.event_date}
                  </span>
                )}
                {ev.cost != null && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <DollarSign size={10} /> ฿{ev.cost.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${colorClass}`}>
              {EVENT_TYPE_LABELS[ev.event_type]}
            </span>
          </div>
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
            {[['ผู้รับเหมา', ev.contractor], ['คำอธิบาย', ev.description], ['หมายเหตุ', ev.notes]]
              .filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string} className="flex gap-2">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">{l}</span>
                <span className="text-sm text-gray-700">{v}</span>
              </div>
            ))}
            <PhotoGrid entityType="event" entityId={ev.id} userId={userId} photos={ev.photos ?? []} onUpdated={onUpdated} />
          </div>
        )}
        <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={handleDelete}
          title="ลบเหตุการณ์" message={`ลบ "${ev.title}" ใช่หรือไม่?`} confirmLabel="ลบ" danger loading={deleting} />
      </div>
    </div>
  )
}
