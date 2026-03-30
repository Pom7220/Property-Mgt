import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PropertyForm from '../components/Properties/PropertyForm'
import type { PropertyFormValues } from '../types'

export default function AddEditPropertyPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit  = Boolean(id)
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [initial, setInitial] = useState<Partial<PropertyFormValues>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    supabase
      .from('pm_properties')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setInitial(data)
        setFetching(false)
      })
  }, [id, isEdit])

  const handleSubmit = async (values: PropertyFormValues) => {
    setLoading(true)
    setError(null)

    const payload = { ...values, user_id: user!.id, updated_at: new Date().toISOString() }

    const { error } = isEdit
      ? await supabase.from('pm_properties').update(payload).eq('id', id!)
      : await supabase.from('pm_properties').insert({ ...payload, created_at: new Date().toISOString() })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      navigate(isEdit ? `/property/${id}` : '/', { replace: true })
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-safe flex items-center gap-3 h-14">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full text-gray-600 active:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-gray-900">
          {isEdit ? 'แก้ไขทรัพย์สิน' : 'เพิ่มทรัพย์สิน'}
        </h1>
      </div>

      {fetching ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
          <PropertyForm initial={initial} onSubmit={handleSubmit} loading={loading} />
        </>
      )}
    </div>
  )
}
