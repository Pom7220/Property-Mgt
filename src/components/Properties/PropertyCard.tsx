import { MapPin, ChevronRight } from 'lucide-react'
import type { Property } from '../../types'
import { PROPERTY_TYPE_LABELS } from '../../types'

const TYPE_COLORS = {
  house: 'bg-emerald-100 text-emerald-700',
  condo: 'bg-blue-100   text-blue-700',
  land:  'bg-amber-100  text-amber-700',
}

interface PropertyCardProps {
  property: Property
  onClick: () => void
}

export default function PropertyCard({ property, onClick }: PropertyCardProps) {
  const coverPhoto = property.photos?.[0]

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex active:scale-[0.98] transition-transform text-left"
    >
      {/* Cover image */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100">
        {coverPhoto ? (
          <img
            src={coverPhoto.thumbnail_url ?? coverPhoto.url}
            alt={property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">
              {property.type === 'house' ? '🏠' : property.type === 'condo' ? '🏢' : '🌿'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            {property.project_name && (
              <p className="text-xs text-gray-400 truncate">{property.project_name}</p>
            )}
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{property.name}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[property.type]}`}>
            {PROPERTY_TYPE_LABELS[property.type]}
          </span>
        </div>

        {(property.district || property.province) && (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 truncate">
              {[property.district, property.province].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center pr-2 text-gray-300">
        <ChevronRight size={18} />
      </div>
    </button>
  )
}
