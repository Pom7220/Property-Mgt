import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchEntityPhotos } from '../lib/photos'
import { useAuth } from '../contexts/AuthContext'
import type { Property } from '../types'
import { PROPERTY_TYPE_LABELS } from '../types'
import DocumentList  from '../components/Documents/DocumentList'
import FeeList       from '../components/Fees/FeeList'
import TaxList       from '../components/Taxes/TaxList'
import EventList     from '../components/Events/EventList'
import PhotoGrid     from '../components/Photos/PhotoGrid'
import ConfirmDialog from '../components/ui/ConfirmDialog'

type Tab = 'overview' | 'documents' | 'fees' | 'taxes' | 'events'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',   label: 'ภาพรวม' },
  { id: 'documents',  label: 'เอกสาร' },
  { id: 'fees',       label: 'ค่าใช้จ่าย' },
  { id: 'taxes',      label: 'ภาษี' },
  { id: 'events',     label: 'เหตุการณ์' },
]

const TYPE_BG = { house: 'bg-emerald-600', condo: 'bg-blue-600', land: 'bg-amber-600' }

export default function PropertyDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  const [property, setProperty]     = useState<Property | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>(
    (searchParams.get('tab') as Tab) ?? 'overview'
  )
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (!id) return
    fetchProperty()
  }, [id])

  const fetchProperty = async () => {
    const { data, error } = await supabase
      .from('pm_properties')
      .select('*')
      .eq('id', id!)
      .single()

    if (!error && data) {
      const photos = await fetchEntityPhotos('property', id!)
      setProperty({ ...data, photos })
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    await supabase.from('pm_properties').delete().eq('id', id)
    navigate('/', { replace: true })
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!property) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <p className="text-gray-500">ไม่พบทรัพย์สิน</p>
      <button onClick={() => navigate('/')} className="mt-4 text-primary-600 font-medium">กลับหน้าหลัก</button>
    </div>
  )

  const typeBg = TYPE_BG[property.type]

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className={`sticky top-0 z-10 ${typeBg} pt-safe px-4 pb-0`}>
        <div className="flex items-center justify-between h-12">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full text-white/80 active:text-white active:bg-white/20">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/property/${id}/edit`)} className="p-1.5 rounded-full text-white/80 active:text-white active:bg-white/20">
              <Pencil size={18} />
            </button>
            <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-full text-white/80 active:text-white active:bg-white/20">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="pb-3">
          {property.project_name && <p className="text-white/70 text-xs">{property.project_name}</p>}
          <h1 className="text-white font-bold text-lg leading-tight">{property.name}</h1>
          {(property.district || property.province) && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-white/60" />
              <span className="text-white/70 text-xs">
                {[property.district, property.province].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
            {PROPERTY_TYPE_LABELS[property.type]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'text-white border-white' : 'text-white/60 border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === 'overview' && (
          <OverviewTab property={property} onPhotosUpdated={fetchProperty} userId={user!.id} />
        )}
        {activeTab === 'documents' && <DocumentList propertyId={id!} />}
        {activeTab === 'fees'      && <FeeList      propertyId={id!} />}
        {activeTab === 'taxes'     && <TaxList      propertyId={id!} />}
        {activeTab === 'events'    && <EventList    propertyId={id!} />}
      </div>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={handleDelete}
        title="ลบทรัพย์สิน"
        message={`คุณต้องการลบ "${property.name}" ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้`}
        confirmLabel="ลบ"
        danger
        loading={deleting}
      />
    </div>
  )
}

function OverviewTab({ property, onPhotosUpdated, userId }: { property: Property; onPhotosUpdated: () => void; userId: string }) {
  const rows: [string, string | null | undefined][] = [
    ['ที่อยู่',         property.address],
    ['เขต/อำเภอ',       property.district],
    ['จังหวัด',         property.province],
    ['วันที่ซื้อ',       property.purchase_date],
    ['ราคาซื้อ',        property.purchase_price != null ? `฿${property.purchase_price.toLocaleString()}` : null],
    ['มูลค่าปัจจุบัน', property.current_value  != null ? `฿${property.current_value.toLocaleString()}`  : null],
    ['หมายเหตุ',        property.notes],
  ]

  return (
    <div className="p-4 space-y-4">
      <PhotoGrid
        entityType="property"
        entityId={property.id}
        userId={userId}
        photos={property.photos ?? []}
        onUpdated={onPhotosUpdated}
      />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex items-start gap-3 px-4 py-3">
            <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-gray-800 flex-1">{value}</span>
          </div>
        ))}
        {rows.every(([, v]) => !v) && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</div>
        )}
      </div>
    </div>
  )
}
