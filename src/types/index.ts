export type PropertyType = 'house' | 'condo' | 'land'

export type DocumentType =
  | 'title_deed'            // โฉนด
  | 'house_registration'    // ทะเบียนบ้าน
  | 'mortgage'              // ใบจำนอง
  | 'water_contract'        // สัญญาน้ำประปา
  | 'electricity_contract'  // สัญญาไฟฟ้า
  | 'accident_insurance'    // ประกันอุบัติเหตุ
  | 'fire_insurance'        // ประกันอัคคีภัย
  | 'floor_plan'            // แผนผังห้อง
  | 'other'

export type FeeType = 'management' | 'termite' | 'water' | 'electricity' | 'garbage' | 'other'
export type FeeFrequency = 'monthly' | 'semi_annual' | 'annual' | 'one_time'
export type TaxType = 'land' | 'condo' | 'other'
export type EventType = 'renovation' | 'repair' | 'incident' | 'inspection' | 'other'
export type PhotoEntityType = 'property' | 'document' | 'fee' | 'tax' | 'event'

// ─── Database row types ──────────────────────────────────────────────────────

export interface Property {
  id: string
  user_id: string
  type: PropertyType
  project_name: string | null   // โครงการ
  name: string
  address: string | null
  district: string | null
  province: string | null
  purchase_date: string | null
  purchase_price: number | null
  current_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  photos?: Photo[]
}

export interface PropertyDocument {
  id: string
  property_id: string
  doc_type: DocumentType
  name: string
  description: string | null
  document_number: string | null
  issue_date: string | null
  expiry_date: string | null
  issuer: string | null
  notes: string | null
  created_at: string
  updated_at: string
  photos?: Photo[]
}

export interface Fee {
  id: string
  property_id: string
  fee_type: FeeType
  name: string
  amount: number | null
  frequency: FeeFrequency
  due_month: number | null   // 1-12
  last_paid_date: string | null
  next_due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  photos?: Photo[]
}

export interface Tax {
  id: string
  property_id: string
  tax_type: TaxType
  year: number
  amount: number | null
  assessed_value: number | null
  paid_date: string | null
  receipt_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  photos?: Photo[]
}

export interface PropertyEvent {
  id: string
  property_id: string
  event_type: EventType
  title: string
  description: string | null
  event_date: string | null
  cost: number | null
  contractor: string | null
  notes: string | null
  created_at: string
  updated_at: string
  photos?: Photo[]
}

export interface Photo {
  id: string
  entity_type: PhotoEntityType
  entity_id: string
  storage_path: string
  thumbnail_path: string | null
  original_name: string | null
  file_size: number | null
  mime_type: string | null
  display_order: number
  caption: string | null
  created_at: string
  // computed after fetch
  url?: string
  thumbnail_url?: string
}

// ─── Form value types (subset of DB types for create/update) ────────────────

export type PropertyFormValues = Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'photos'>
export type DocumentFormValues = Omit<PropertyDocument, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'photos'>
export type FeeFormValues      = Omit<Fee,              'id' | 'property_id' | 'created_at' | 'updated_at' | 'photos'>
export type TaxFormValues      = Omit<Tax,              'id' | 'property_id' | 'created_at' | 'updated_at' | 'photos'>
export type EventFormValues    = Omit<PropertyEvent,    'id' | 'property_id' | 'created_at' | 'updated_at' | 'photos'>

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'บ้าน',
  condo: 'คอนโด',
  land:  'ที่ดิน',
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  title_deed:            'โฉนดที่ดิน',
  house_registration:    'ทะเบียนบ้าน',
  mortgage:              'ใบจำนอง',
  water_contract:        'สัญญาน้ำประปา',
  electricity_contract:  'สัญญาไฟฟ้า',
  accident_insurance:    'ประกันอุบัติเหตุ',
  fire_insurance:        'ประกันอัคคีภัย',
  floor_plan:            'แผนผังห้อง/ที่ดิน',
  other:                 'อื่นๆ',
}

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  management:  'ค่าส่วนกลาง',
  termite:     'ค่าฉีดปลวก',
  water:       'ค่าน้ำประปา',
  electricity: 'ค่าไฟฟ้า',
  garbage:     'ค่าเก็บขยะ',
  other:       'อื่นๆ',
}

export const FEE_FREQ_LABELS: Record<FeeFrequency, string> = {
  monthly:     'รายเดือน',
  semi_annual: 'ราย 6 เดือน',
  annual:      'รายปี',
  one_time:    'ครั้งเดียว',
}

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  land:  'ภาษีที่ดินและสิ่งปลูกสร้าง',
  condo: 'ภาษีคอนโด/อาคารชุด',
  other: 'ภาษีอื่นๆ',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  renovation: 'ปรับปรุง/ต่อเติม',
  repair:     'ซ่อมแซม',
  incident:   'เหตุการณ์สำคัญ',
  inspection: 'ตรวจสอบ',
  other:      'อื่นๆ',
}
