import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Trash2, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchEntityPhotos } from '../lib/photos'
import { useAuth } from '../contexts/AuthContext'
import type { Property, PropertyFormValues } from '../types'
import { PROPERTY_TYPE_LABELS } from '../types'
import DocumentList  from '../components/Documents/DocumentList'
import FeeList       from '../components/Fees/FeeList'
import TaxList       from '../components/Taxes/TaxList'
import EventList     from '../components/Events/EventList'
import PhotoGrid     from '../components/Photos/PhotoGrid'
import PropertyForm  from '../components/Properties/PropertyForm'
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
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
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
      document.title = `${data.name} | จัดการทรัพย์สิน`
    }
    setLoading(false)
  }

  const handleSave = async (values: PropertyFormValues) => {
    setSaving(true)
    await supabase
      .from('pm_properties')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id!)
    await fetchProperty()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
        <div className="flex items-center gap-2 h-12">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full text-white/80 active:text-white active:bg-white/20 flex-shrink-0">
            <ArrowLeft size={20} />
          </button>

          {/* Property identity — always visible */}
          <div className="flex-1 min-w-0">
            {property.project_name && (
              <p className="text-white/60 text-[10px] leading-none truncate">{property.project_name}</p>
            )}
            <p className="text-white font-bold text-sm leading-tight truncate">{property.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] bg-white/20 text-white/90 px-1.5 py-0 rounded-full leading-4">
                {PROPERTY_TYPE_LABELS[property.type]}
              </span>
              {(property.district || property.province) && (
                <div className="flex items-center gap-0.5 min-w-0">
                  <MapPin size={9} className="text-white/50 flex-shrink-0" />
                  <span className="text-white/60 text-[10px] truncate">
                    {[property.district, property.province].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {saved && (
              <span className="text-xs text-green-300 font-medium animate-pulse">✓</span>
            )}
            <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-full text-white/80 active:text-white active:bg-white/20">
              <Trash2 size={18} />
            </button>
          </div>
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
          <OverviewTab
            property={property}
            onPhotosUpdated={fetchProperty}
            userId={user!.id}
            onSave={handleSave}
            saving={saving}
          />
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

function OverviewTab({ property, onPhotosUpdated, userId, onSave, saving }: {
  property:       Property
  onPhotosUpdated: () => void
  userId:         string
  onSave:         (values: PropertyFormValues) => Promise<void>
  saving:         boolean
}) {
  return (
    <div className="pb-6">
      {/* Photos at top */}
      <div className="px-4 pt-4 pb-2">
        <PhotoGrid
          entityType="property"
          entityId={property.id}
          userId={userId}
          photos={property.photos ?? []}
          onUpdated={onPhotosUpdated}
        />
      </div>

      {/* Inline editable form — pre-filled with current values */}
      <PropertyForm
        initial={{
          type:           property.type,
          project_name:   property.project_name,
          name:           property.name,
          address:        property.address,
          district:       property.district,
          province:       property.province,
          purchase_date:  property.purchase_date,
          purchase_price: property.purchase_price,
          current_value:  property.current_value,
          notes:          property.notes,
        }}
        onSubmit={onSave}
        loading={saving}
        submitLabel="บันทึกการเปลี่ยนแปลง"
      />
    </div>
  )
}
