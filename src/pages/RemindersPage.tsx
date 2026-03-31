import { useState, useEffect } from 'react'
import { Bell, CheckCircle2, Clock, Building2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'

interface ReminderItem {
  id:           string
  propertyId:   string
  propertyName: string
  title:        string
  subtitle:     string
  dueDate:      string
  daysLeft:     number
  type:         'fee' | 'tax'
  amount:       number | null
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function urgencyClass(days: number) {
  if (days < 0)   return { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-600',    badge: 'bg-red-100 text-red-700',    label: 'เกินกำหนด' }
  if (days <= 7)  return { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-600',    badge: 'bg-red-100 text-red-700',    label: `${days} วัน` }
  if (days <= 30) return { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700', label: `${days} วัน` }
  return             { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-600',  badge: 'bg-green-100 text-green-700', label: `${days} วัน` }
}

export default function RemindersPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [items,    setItems]   = useState<ReminderItem[]>([])
  const [loading,  setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [markDoneItem, setMarkDoneItem] = useState<ReminderItem | null>(null)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [nextDue,  setNextDue]  = useState('')

  useEffect(() => { if (user) fetchReminders() }, [user])

  const fetchReminders = async () => {
    setLoading(true)

    // Fetch all properties for this user
    const { data: props } = await supabase
      .from('pm_properties')
      .select('id, name')
      .eq('user_id', user!.id)

    if (!props || props.length === 0) { setLoading(false); return }

    const propIds = props.map(p => p.id)
    const propMap = Object.fromEntries(props.map(p => [p.id, p.name]))

    // Fees with next_due_date
    const { data: fees } = await supabase
      .from('pm_fees')
      .select('id, property_id, name, fee_type, amount, frequency, next_due_date')
      .in('property_id', propIds)
      .not('next_due_date', 'is', null)
      .order('next_due_date')

    // Taxes not yet paid for current + previous year
    const thisYear = new Date().getFullYear()
    const { data: taxes } = await supabase
      .from('pm_taxes')
      .select('id, property_id, tax_type, year, amount, paid_date')
      .in('property_id', propIds)
      .in('year', [thisYear - 1, thisYear])
      .is('paid_date', null)

    const list: ReminderItem[] = []

    for (const f of fees ?? []) {
      const days = daysUntil(f.next_due_date)
      list.push({
        id:           f.id,
        propertyId:   f.property_id,
        propertyName: propMap[f.property_id] ?? '',
        title:        f.name,
        subtitle:     f.frequency === 'semi_annual' ? 'ราย 6 เดือน' : f.frequency === 'annual' ? 'รายปี' : f.frequency === 'monthly' ? 'รายเดือน' : 'ครั้งเดียว',
        dueDate:      f.next_due_date,
        daysLeft:     days,
        type:         'fee',
        amount:       f.amount,
      })
    }

    for (const t of taxes ?? []) {
      // Estimate due date = April 30 of the tax year
      const dueDate = `${t.year}-04-30`
      const days    = daysUntil(dueDate)
      const label   = t.tax_type === 'land' ? 'ภาษีที่ดินและสิ่งปลูกสร้าง' : t.tax_type === 'condo' ? 'ภาษีคอนโด' : 'ภาษีอื่นๆ'
      list.push({
        id:           t.id,
        propertyId:   t.property_id,
        propertyName: propMap[t.property_id] ?? '',
        title:        `${label} ปี ${t.year}`,
        subtitle:     'ภาษี',
        dueDate,
        daysLeft:     days,
        type:         'tax',
        amount:       t.amount,
      })
    }

    // Sort: overdue first, then by days asc
    list.sort((a, b) => a.daysLeft - b.daysLeft)
    setItems(list)
    setLoading(false)
  }

  const openMarkDone = (item: ReminderItem) => {
    setMarkDoneItem(item)
    setPaidDate(new Date().toISOString().slice(0, 10))
    // Auto-calculate next due based on frequency — for fees
    setNextDue('')
  }

  const handleMarkDone = async () => {
    if (!markDoneItem) return
    setUpdating(markDoneItem.id)

    if (markDoneItem.type === 'fee') {
      await supabase.from('pm_fees').update({
        last_paid_date: paidDate,
        next_due_date:  nextDue || null,
        updated_at:     new Date().toISOString(),
      }).eq('id', markDoneItem.id)
    } else {
      await supabase.from('pm_taxes').update({
        paid_date:  paidDate,
        updated_at: new Date().toISOString(),
      }).eq('id', markDoneItem.id)
    }

    setUpdating(null)
    setMarkDoneItem(null)
    fetchReminders()
  }

  const overdue = items.filter(i => i.daysLeft < 0)
  const upcoming = items.filter(i => i.daysLeft >= 0)

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary-700 pt-safe px-4 pb-3">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-white" />
          <span className="text-white font-semibold text-base">แจ้งเตือนและนัดชำระ</span>
        </div>
        {!loading && items.length > 0 && (
          <p className="text-primary-200 text-xs mt-0.5">
            {overdue.length > 0 && <span className="text-red-300 font-medium">{overdue.length} รายการเกินกำหนด  </span>}
            {upcoming.length} รายการกำลังจะถึง
          </p>
        )}
      </div>

      <div className="flex-1 p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckCircle2 size={48} className="text-green-300 mb-3" />
            <p className="text-gray-500 font-medium">ไม่มีรายการที่ต้องชำระ</p>
            <p className="text-gray-400 text-sm mt-1">ตั้งค่าวันครบกำหนดในหน้าค่าใช้จ่ายและภาษี</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 px-1">
                  เกินกำหนดแล้ว ({overdue.length})
                </h2>
                <div className="space-y-2">
                  {overdue.map(item => <ReminderCard key={`${item.type}-${item.id}`} item={item} onMark={() => openMarkDone(item)} onNavigate={() => navigate(`/property/${item.propertyId}?tab=${item.type === 'fee' ? 'fees' : 'taxes'}`)} />)}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  กำลังจะถึง ({upcoming.length})
                </h2>
                <div className="space-y-2">
                  {upcoming.map(item => <ReminderCard key={`${item.type}-${item.id}`} item={item} onMark={() => openMarkDone(item)} onNavigate={() => navigate(`/property/${item.propertyId}?tab=${item.type === 'fee' ? 'fees' : 'taxes'}`)} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Mark as done modal */}
      <Modal open={markDoneItem !== null} onClose={() => setMarkDoneItem(null)} title="บันทึกการชำระ">
        {markDoneItem && (
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-semibold text-gray-900">{markDoneItem.title}</p>
              <p className="text-xs text-gray-500">{markDoneItem.propertyName}</p>
              {markDoneItem.amount && (
                <p className="text-sm font-bold text-primary-700 mt-1">฿{markDoneItem.amount.toLocaleString()}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ชำระ</label>
              <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>

            {markDoneItem.type === 'fee' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  วันครบกำหนดครั้งต่อไป
                  <span className="text-gray-400 font-normal ml-1">(ไม่บังคับ)</span>
                </label>
                <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setMarkDoneItem(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 active:bg-gray-200">
                ยกเลิก
              </button>
              <button onClick={handleMarkDone} disabled={updating !== null}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-green-600 active:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1">
                {updating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><CheckCircle2 size={15} /> บันทึกชำระแล้ว</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReminderCard({ item, onMark, onNavigate }: { item: ReminderItem; onMark: () => void; onNavigate: () => void }) {
  const u = urgencyClass(item.daysLeft)

  return (
    <div className={`${u.bg} border ${u.border} rounded-2xl overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Countdown badge */}
        <div className={`${u.badge} rounded-xl px-2.5 py-1.5 text-center min-w-[52px] flex-shrink-0`}>
          <p className="text-lg font-bold leading-none">
            {item.daysLeft < 0 ? Math.abs(item.daysLeft) : item.daysLeft}
          </p>
          <p className="text-[10px] font-medium leading-none mt-0.5">
            {item.daysLeft < 0 ? 'วันที่แล้ว' : 'วัน'}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Building2 size={10} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">{item.propertyName}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{item.subtitle}</span>
            {item.amount && <span className={`text-xs font-semibold ${u.text}`}>฿{item.amount.toLocaleString()}</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} className="text-gray-400" />
            <span className="text-xs text-gray-400">ครบกำหนด {item.dueDate}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onMark}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg active:bg-green-700">
            ชำระแล้ว
          </button>
          <button onClick={onNavigate}
            className="px-3 py-1.5 bg-white/80 text-gray-600 text-xs font-medium rounded-lg active:bg-white flex items-center gap-0.5 whitespace-nowrap">
            ดู <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
