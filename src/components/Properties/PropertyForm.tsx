import { useState } from 'react'
import type { PropertyFormValues, PropertyType } from '../../types'
import { PROPERTY_TYPE_LABELS } from '../../types'

interface PropertyFormProps {
  initial?: Partial<PropertyFormValues>
  onSubmit: (values: PropertyFormValues) => Promise<void>
  loading?: boolean
}

const THAI_PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี',
  'ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง',
  'ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์',
  'นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์',
  'ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก',
  'เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร',
  'ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย',
  'ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร',
  'สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์',
  'หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
]

const empty: PropertyFormValues = {
  type: 'house',
  project_name: null,
  name: '',
  address: null,
  district: null,
  province: null,
  purchase_date: null,
  purchase_price: null,
  current_value: null,
  notes: null,
}

export default function PropertyForm({ initial = {}, onSubmit, loading }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyFormValues>({ ...empty, ...initial })

  const set = <K extends keyof PropertyFormValues>(key: K, val: PropertyFormValues[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const field = (label: string, el: React.ReactNode, required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {el}
    </div>
  )

  const input = (key: keyof PropertyFormValues, type = 'text', placeholder = '') => (
    <input
      type={type}
      value={(form[key] as string) ?? ''}
      onChange={e => set(key, (e.target.value || null) as never)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
    />
  )

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {/* Property type */}
      {field('ประเภทอสังหาริมทรัพย์', (
        <div className="flex gap-2">
          {(['house', 'condo', 'land'] as PropertyType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.type === t
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 text-gray-600 active:bg-gray-50'
              }`}
            >
              {PROPERTY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      ), true)}

      {field('ชื่อโครงการ / หมู่บ้าน', input('project_name', 'text', 'เช่น ลลิล วิลล่า, เดอะนิช...'))}
      {field('ชื่อ / เลขที่ห้อง / แปลง', input('name', 'text', 'เช่น บ้านเลขที่ 123, ห้อง 502...'), true)}
      {field('ที่อยู่', (
        <textarea
          value={form.address ?? ''}
          onChange={e => set('address', e.target.value || null)}
          rows={2}
          placeholder="เลขที่, ถนน, ซอย..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      ))}

      <div className="grid grid-cols-2 gap-3">
        {field('เขต / อำเภอ', input('district', 'text', 'เขต/อำเภอ'))}
        {field('จังหวัด', (
          <select
            value={form.province ?? ''}
            onChange={e => set('province', e.target.value || null)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
          >
            <option value="">เลือกจังหวัด</option>
            {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field('วันที่ซื้อ', input('purchase_date', 'date'))}
        {field('ราคาซื้อ (บาท)', input('purchase_price', 'number', '0'))}
      </div>

      {field('มูลค่าปัจจุบัน (บาท)', input('current_value', 'number', '0'))}

      {field('หมายเหตุ', (
        <textarea
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value || null)}
          rows={2}
          placeholder="บันทึกเพิ่มเติม..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      ))}

      <button
        type="submit"
        disabled={loading || !form.name}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm active:bg-primary-700 disabled:opacity-60 mt-2"
      >
        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </form>
  )
}
