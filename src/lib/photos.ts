import { supabase, getPublicUrl } from './supabase'
import type { Photo, PhotoEntityType } from '../types'

/** Fetch photos for one or many entities and attach public URLs */
export async function fetchPhotos(
  entityType: PhotoEntityType,
  entityIds: string[],
): Promise<Record<string, Photo[]>> {
  if (entityIds.length === 0) return {}

  const { data } = await supabase
    .from('pm_photos')
    .select('*')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .order('display_order', { ascending: true })

  const map: Record<string, Photo[]> = {}
  for (const ph of data ?? []) {
    if (!map[ph.entity_id]) map[ph.entity_id] = []
    map[ph.entity_id].push({
      ...ph,
      url:           getPublicUrl(ph.storage_path),
      thumbnail_url: ph.thumbnail_path
        ? getPublicUrl(ph.thumbnail_path)
        : getPublicUrl(ph.storage_path),
    })
  }
  return map
}

/** Fetch photos for a single entity */
export async function fetchEntityPhotos(
  entityType: PhotoEntityType,
  entityId: string,
): Promise<Photo[]> {
  const map = await fetchPhotos(entityType, [entityId])
  return map[entityId] ?? []
}
