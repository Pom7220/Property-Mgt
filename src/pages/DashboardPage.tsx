import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, LogOut, Search } from 'lucide-react'
import { supabase, getPublicUrl } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Property } from '../types'
import { PROPERTY_TYPE_LABELS } from '../types'
import PropertyCard from '../components/Properties/PropertyCard'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate          = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    if (!user) return
    fetchProperties()

    // Realtime subscription
    const channel = supabase
      .channel('pm_properties_changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pm_properties',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchProperties())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('pm_properties')
      .select('*, photos:pm_photos(id,storage_path,thumbnail_path,display_order)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const enriched = data.map(p => ({
        ...p,
        photos: (p.photos ?? []).map((ph: { id: string; storage_path: string; thumbnail_path: string | null; display_order: number }) => ({
          ...ph,
          url:           getPublicUrl(ph.storage_path),
          thumbnail_url: ph.thumbnail_path ? getPublicUrl(ph.thumbnail_path) : getPublicUrl(ph.storage_path),
        })).sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
      }))
      setProperties(enriched)
    }
    setLoading(false)
  }

  const filtered = properties.filter(p =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.project_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.province ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by type
  const grouped = (['house', 'condo', 'land'] as const).map(type => ({
    type,
    label: PROPERTY_TYPE_LABELS[type],
    items: filtered.filter(p => p.type === type),
  })).filter(g => g.items.length > 0)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary-700 pt-safe px-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={22} className="text-white" />
            <span className="text-white font-semibold text-base">ทรัพย์สิน</span>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-full text-primary-200 active:text-white active:bg-primary-600"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาทรัพย์สิน..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'ไม่พบทรัพย์สินที่ค้นหา' : 'ยังไม่มีทรัพย์สิน'}
            </p>
            {!search && (
              <p className="text-gray-400 text-sm mt-1">แตะปุ่ม + เพื่อเพิ่มทรัพย์สินแรกของคุณ</p>
            )}
          </div>
        ) : (
          grouped.map(({ type, label, items }) => (
            <section key={type}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {label} ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map(p => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onClick={() => navigate(`/property/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/property/new')}
        className="fixed right-5 bottom-20 z-20 w-14 h-14 bg-primary-600 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'calc(4rem + max(0.5rem, env(safe-area-inset-bottom)))' }}
      >
        <Plus size={26} className="text-white" />
      </button>
    </div>
  )
}
