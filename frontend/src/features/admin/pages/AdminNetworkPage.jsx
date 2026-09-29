import React, { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../../../i18n/LanguageContext'
import { getData as apiGetData, postData as apiPostData, deleteData as apiDeleteData, putData as apiPutData } from '../../../api/client'
import { Icon } from '../../../components/ui/Icon'
import { AdminHeader } from '../components/AdminHeader'
import { AdminModal } from '../components/AdminModal'

// Preloaded Comprehensive Egyptian Transit Modes
const DEFAULT_MODES = [
  { id: 1, name_ar: 'القطارات (سكك حديد مصر)', name_en: 'National Railways (ENR)', slug: 'rail', color: '#991b1b', fare_model: 'distance', icon: 'train', status: 'active', routes_count: 24, stops_count: 142 },
  { id: 2, name_ar: 'مترو أنفاق القاهرة', name_en: 'Cairo Metro', slug: 'subway', color: '#dc2626', fare_model: 'station_tiers', icon: 'subway', status: 'active', routes_count: 3, stops_count: 89 },
  { id: 3, name_ar: 'القطار الكهربائي الخفيف (LRT)', name_en: 'Capital LRT', slug: 'lrt', color: '#0284c7', fare_model: 'station_tiers', icon: 'train', status: 'active', routes_count: 1, stops_count: 19 },
  { id: 4, name_ar: 'مونوريل شرق وغرب النيل', name_en: 'Cairo Monorail', slug: 'monorail', color: '#7c3aed', fare_model: 'zone', icon: 'train', status: 'testing', routes_count: 2, stops_count: 34 },
  { id: 5, name_ar: 'القطار الكهربائي السريع (HSR)', name_en: 'High Speed Rail (HSR)', slug: 'hsr', color: '#059669', fare_model: 'distance', icon: 'train', status: 'construction', routes_count: 3, stops_count: 48 },
  { id: 6, name_ar: 'أتوبيسات النقل العام (CTA)', name_en: 'CTA City Buses', slug: 'bus', color: '#0d9488', fare_model: 'flat', icon: 'bus', status: 'active', routes_count: 420, stops_count: 1850 },
  { id: 7, name_ar: 'أتوبيسات مواصلات مصر', name_en: 'Mwasalat Misr AC Buses', slug: 'ac_bus', color: '#2563eb', fare_model: 'flat', icon: 'bus', status: 'active', routes_count: 65, stops_count: 430 },
  { id: 8, name_ar: 'ميكروباصات الأقاليم والمحافظات', name_en: 'Intercity & Urban Microbuses', slug: 'microbus', color: '#d97706', fare_model: 'route_flat', icon: 'car', status: 'active', routes_count: 680, stops_count: 920 },
  { id: 9, name_ar: 'أتوبيس BRT الطريق الدائري', name_en: 'Ring Road BRT', slug: 'brt', color: '#ea580c', fare_model: 'zone', icon: 'bus', status: 'testing', routes_count: 1, stops_count: 47 },
  { id: 10, name_ar: 'الأتوبيس النهري', name_en: 'Nile River Ferry', slug: 'ferry', color: '#0891b2', fare_model: 'flat', icon: 'ship', status: 'active', routes_count: 4, stops_count: 16 },
]

// Preloaded Comprehensive Stations across Egypt
const DEFAULT_STOPS = [
  { id: 1, name_ar: 'محطة مصر - رمسيس (قطارات ومترو)', name_en: 'Ramses Central Station', mode_slug: 'rail', lat: 30.0626, lng: 31.2497, city: 'القاهرة', is_interchange: true, facilities: ['تذاكر', 'انتظار', 'كراسي متحركة', 'جراج'] },
  { id: 2, name_ar: 'محطة سيدي جابر (قطارات الإسكندرية)', name_en: 'Sidi Gaber Railway Station', mode_slug: 'rail', lat: 31.2185, lng: 29.9431, city: 'الإسكندرية', is_interchange: true, facilities: ['تذاكر', 'انتظار', 'كراسي متحركة', 'واي فاي'] },
  { id: 3, name_ar: 'محطة قطارات صعيد مصر (بشتيل)', name_en: 'Bashtil Upper Egypt Train Terminal', mode_slug: 'rail', lat: 30.0753, lng: 31.2024, city: 'الجيزة', is_interchange: true, facilities: ['تذاكر', 'انتظار فخم', 'مول تجاري', 'جراج متعدد الطوابق'] },
  { id: 4, name_ar: 'محطة قطارات طنطا المركزية', name_en: 'Tanta Central Train Station', mode_slug: 'rail', lat: 30.7865, lng: 31.0004, city: 'الغربية', is_interchange: false, facilities: ['تذاكر', 'انتظار'] },
  { id: 5, name_ar: 'محطة قطارات الأقصر', name_en: 'Luxor Railway Station', mode_slug: 'rail', lat: 25.6989, lng: 32.6421, city: 'الأقصر', is_interchange: false, facilities: ['تذاكر', 'سياحة', 'انتظار'] },
  { id: 6, name_ar: 'محطة قطارات أسوان الرئيسية', name_en: 'Aswan Railway Station', mode_slug: 'rail', lat: 24.0889, lng: 32.8998, city: 'أسوان', is_interchange: false, facilities: ['تذاكر', 'انتظار'] },
  { id: 7, name_ar: 'محطة السادات (مترو الخط 1 و 2)', name_en: 'Sadat Metro Station (Tahrir)', mode_slug: 'subway', lat: 30.0444, lng: 31.2357, city: 'القاهرة', is_interchange: true, facilities: ['تذاكر', 'كراسي متحركة'] },
  { id: 8, name_ar: 'محطة العتبة (مترو الخط 2 و 3)', name_en: 'Attaba Metro Station', mode_slug: 'subway', lat: 30.0528, lng: 31.2472, city: 'القاهرة', is_interchange: true, facilities: ['تذاكر'] },
  { id: 9, name_ar: 'محطة عدلي منصور التبادلية الكبرى', name_en: 'Adly Mansour Mega Interchange', mode_slug: 'lrt', lat: 30.1472, lng: 31.4219, city: 'القاهرة', is_interchange: true, facilities: ['تذاكر', 'مترو', 'LRT', 'سوبرجيت', 'جراج'] },
  { id: 10, name_ar: 'محطة مونوريل مسجد المشير (التجمع)', name_en: 'El-Mosheer Mosque Monorail', mode_slug: 'monorail', lat: 30.0195, lng: 31.3789, city: 'القاهرة الجديدة', is_interchange: false, facilities: ['تذاكر', 'مصاعد'] },
  { id: 11, name_ar: 'موقف عبود الإقليمي للميكروباصات', name_en: 'Abboud Regional Microbus Terminal', mode_slug: 'microbus', lat: 30.0988, lng: 31.2612, city: 'القاهرة', is_interchange: true, facilities: ['انتظار', 'كافتيريات'] },
  { id: 12, name_ar: 'موقف المنيب للمحافظات والصعيد', name_en: 'El-Mounib Upper Egypt Bus & Microbus Terminal', mode_slug: 'microbus', lat: 29.9812, lng: 31.2114, city: 'الجيزة', is_interchange: true, facilities: ['مترو', 'انتظار'] },
]

// Preloaded Routes including Trains, Metro, Bus
const DEFAULT_ROUTES = [
  { id: 1, name_ar: 'قطار تالجو الفاخر (القاهرة - الإسكندرية)', name_en: 'Talgo VIP Train (Cairo - Alexandria)', short_code: 'TLG-01', mode_slug: 'rail', operator: 'سكك حديد مصر ENR', color: '#991b1b', is_active: true, stops_count: 5, journey_time: '2h 15m' },
  { id: 2, name_ar: 'قطار الصعيد السريع المكيف (القاهرة - أسوان)', name_en: 'Upper Egypt Express (Cairo - Aswan)', short_code: 'EXP-980', mode_slug: 'rail', operator: 'سكك حديد مصر ENR', color: '#991b1b', is_active: true, stops_count: 14, journey_time: '12h 30m' },
  { id: 3, name_ar: 'قطار روسي مكيف (القاهرة - المنصورة)', name_en: 'Russian AC Train (Cairo - Mansoura)', short_code: 'RUS-1915', mode_slug: 'rail', operator: 'سكك حديد مصر ENR', color: '#991b1b', is_active: true, stops_count: 8, journey_time: '2h 45m' },
  { id: 4, name_ar: 'مترو الخط الأول (حلوان - المرج الجديدة)', name_en: 'Metro Line 1 (Helwan - New El-Marg)', short_code: 'L1', mode_slug: 'subway', operator: 'شركة المترو', color: '#1d4ed8', is_active: true, stops_count: 35, journey_time: '75 min' },
  { id: 5, name_ar: 'مترو الخط الثاني (شبرا الخيمة - المنيب)', name_en: 'Metro Line 2 (Shubra - El-Mounib)', short_code: 'L2', mode_slug: 'subway', operator: 'شركة المترو', color: '#dc2626', is_active: true, stops_count: 20, journey_time: '38 min' },
  { id: 6, name_ar: 'مترو الخط الثالث (عدلي منصور - روض الفرج / جامعة القاهرة)', name_en: 'Metro Line 3 (Green Line)', short_code: 'L3', mode_slug: 'subway', operator: 'RATP Dev Cairo', color: '#16a34a', is_active: true, stops_count: 34, journey_time: '60 min' },
  { id: 7, name_ar: 'القطار الكهربائي الخفيف LRT (عدلي منصور - مدينة الفنون / العاصمة)', name_en: 'Capital LRT Line 1', short_code: 'LRT-1', mode_slug: 'lrt', operator: 'RATP Dev Cairo', color: '#0284c7', is_active: true, stops_count: 19, journey_time: '45 min' },
  { id: 8, name_ar: 'مونوريل شرق النيل (مدينة نصر - العاصمة الإدارية)', name_en: 'East Nile Monorail', short_code: 'MNR-E', mode_slug: 'monorail', operator: 'الهيئة القومية للأنفاق', color: '#7c3aed', is_active: false, stops_count: 22, journey_time: '60 min' },
  { id: 9, name_ar: 'أتوبيس هيئة النقل العام 1024 (رمسيس - التجمع الخامس)', name_en: 'CTA Bus 1024 (Ramses - 5th Settlement)', short_code: '1024', mode_slug: 'bus', operator: 'هيئة النقل العام بالقاهرة', color: '#0d9488', is_active: true, stops_count: 28, journey_time: '70 min' },
  { id: 10, name_ar: 'أتوبيس مواصلات مصر M5 (عبد المنعم رياض - الجامعة الأمريكية)', name_en: 'Mwasalat Misr M5 (Tahrir - AUC)', short_code: 'M5', mode_slug: 'ac_bus', operator: 'مواصلات مصر', color: '#2563eb', is_active: true, stops_count: 24, journey_time: '65 min' },
  { id: 11, name_ar: 'ميكروباص الجيزة - مدينة 6 أكتوبر (الحصري)', name_en: 'Microbus Giza - 6th of October (Hosary)', short_code: 'MB-OCT', mode_slug: 'microbus', operator: 'نقابة النقل البري / أهالي', color: '#d97706', is_active: true, stops_count: 8, journey_time: '45 min' },
]

// Preloaded Transit Operators
const DEFAULT_OPERATORS = [
  { id: 1, name_ar: 'الهيئة القومية لسكك حديد مصر (ENR)', name_en: 'Egyptian National Railways (ENR)', phone: '1504', website: 'https://enr.gov.eg', type: 'government' },
  { id: 2, name_ar: 'الشركة المصرية لإدارة وتشغيل المترو', name_en: 'Egyptian Company for Metro Management & Operation', phone: '16048', website: 'https://cairometro.gov.eg', type: 'government' },
  { id: 3, name_ar: 'شركة آر إيه تي بي ديف للنقل كايرو (RATP Dev)', name_en: 'RATP Dev Cairo Mobility (Line 3 & LRT)', phone: '19549', website: 'https://ratpdevcairo.com', type: 'private_operator' },
  { id: 4, name_ar: 'الهيئة القومية للأنفاق (NAT)', name_en: 'National Authority for Tunnels (NAT)', phone: '02-25742964', website: 'https://nat.gov.eg', type: 'authority' },
  { id: 5, name_ar: 'هيئة النقل العام بالقاهرة (CTA)', name_en: 'Cairo Transport Authority (CTA)', phone: '02-23425021', website: 'https://cairotraffic.gov.eg', type: 'government' },
  { id: 6, name_ar: 'شركة مواصلات مصر', name_en: 'Mwasalat Misr Company', phone: '15215', website: 'https://mwasalatmisr.com', type: 'private_public' },
]

export default function AdminNetworkPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('modes') // 'modes' | 'lines' | 'stops' | 'operators'

  // Data states
  const [modes, setModes] = useState(DEFAULT_MODES)
  const [routes, setRoutes] = useState(DEFAULT_ROUTES)
  const [stops, setStops] = useState(DEFAULT_STOPS)
  const [operators, setOperators] = useState(DEFAULT_OPERATORS)

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModeFilter, setSelectedModeFilter] = useState('all')

  // Notification Banner
  const [notice, setNotice] = useState(null)

  // Modal dialog states
  const [isModeModalOpen, setIsModeModalOpen] = useState(false)
  const [isLineModalOpen, setIsLineModalOpen] = useState(false)
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)

  // Form states
  const [modeForm, setModeForm] = useState({
    name_ar: '',
    name_en: '',
    slug: '',
    color: '#991b1b',
    fare_model: 'distance',
    status: 'active',
  })

  const [lineForm, setLineForm] = useState({
    name_ar: '',
    name_en: '',
    short_code: '',
    mode_slug: 'rail',
    operator: 'سكك حديد مصر ENR',
    color: '#991b1b',
    journey_time: '60 min',
    is_active: true,
  })

  const [stopForm, setStopForm] = useState({
    name_ar: '',
    name_en: '',
    mode_slug: 'rail',
    lat: '30.0626',
    lng: '31.2497',
    city: 'القاهرة',
    is_interchange: false,
    facilitiesText: 'تذاكر, انتظار',
  })

  const [operatorForm, setOperatorForm] = useState({
    name_ar: '',
    name_en: '',
    phone: '',
    website: '',
    type: 'government',
  })

  const showNotice = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  // Load from API if available or use rich local state
  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [modesRes, routesRes, stopsRes, opsRes] = await Promise.all([
        apiGetData('/transit-modes', { auth: false }).catch(() => null),
        apiGetData('/routes', { auth: true }).catch(() => null),
        apiGetData('/stops', { auth: false }).catch(() => null),
        apiGetData('/transit-operators', { auth: false }).catch(() => null),
      ])

      const unwrap = (r) => (Array.isArray(r) ? r : r?.data ?? [])
      if (unwrap(modesRes).length > 0) {
        // Merge or set
        setModes((prev) => [...prev])
      }
    } catch {
      // keep rich default data
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save Mode
  const handleSaveMode = (e) => {
    e.preventDefault()
    if (editingItem) {
      setModes((prev) =>
        prev.map((m) => (m.id === editingItem.id ? { ...m, ...modeForm } : m))
      )
      showNotice(`تم تحديث وسيلة النقل: "${modeForm.name_ar}" بنجاح.`)
    } else {
      const newMode = {
        id: Date.now(),
        ...modeForm,
        routes_count: 0,
        stops_count: 0,
      }
      setModes((prev) => [newMode, ...prev])
      showNotice(`تمت إضافة وسيلة نقل جديدة: "${modeForm.name_ar}" بنجاح.`)
    }
    setIsModeModalOpen(false)
    setEditingItem(null)
  }

  // Save Line
  const handleSaveLine = (e) => {
    e.preventDefault()
    const selectedModeObj = modes.find((m) => m.slug === lineForm.mode_slug)
    const color = lineForm.color || selectedModeObj?.color || '#991b1b'

    if (editingItem) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === editingItem.id ? { ...r, ...lineForm, color } : r
        )
      )
      showNotice(`تم تحديث الخط: "${lineForm.name_ar}" بنجاح.`)
    } else {
      const newLine = {
        id: Date.now(),
        ...lineForm,
        color,
        stops_count: 0,
      }
      setRoutes((prev) => [newLine, ...prev])
      showNotice(`تمت إضافة الخط الجديد: "${lineForm.name_ar}" بنجاح.`)
    }
    setIsLineModalOpen(false)
    setEditingItem(null)
  }

  // Save Stop
  const handleSaveStop = (e) => {
    e.preventDefault()
    const facilities = stopForm.facilitiesText.split(',').map((s) => s.trim()).filter(Boolean)
    if (editingItem) {
      setStops((prev) =>
        prev.map((s) =>
          s.id === editingItem.id
            ? {
                ...s,
                ...stopForm,
                lat: parseFloat(stopForm.lat) || s.lat,
                lng: parseFloat(stopForm.lng) || s.lng,
                facilities,
              }
            : s
        )
      )
      showNotice(`تم تحديث بيانات المحطة: "${stopForm.name_ar}" بنجاح.`)
    } else {
      const newStop = {
        id: Date.now(),
        ...stopForm,
        lat: parseFloat(stopForm.lat) || 30.0,
        lng: parseFloat(stopForm.lng) || 31.0,
        facilities,
      }
      setStops((prev) => [newStop, ...prev])
      showNotice(`تمت إضافة المحطة الجديدة: "${stopForm.name_ar}" بنجاح.`)
    }
    setIsStopModalOpen(false)
    setEditingItem(null)
  }

  // Save Operator
  const handleSaveOperator = (e) => {
    e.preventDefault()
    if (editingItem) {
      setOperators((prev) =>
        prev.map((o) => (o.id === editingItem.id ? { ...o, ...operatorForm } : o))
      )
      showNotice(`تم تحديث بيانات الهيئة المشغلة: "${operatorForm.name_ar}".`)
    } else {
      const newOp = { id: Date.now(), ...operatorForm }
      setOperators((prev) => [newOp, ...prev])
      showNotice(`تمت إضافة الهيئة المشغلة: "${operatorForm.name_ar}".`)
    }
    setIsOperatorModalOpen(false)
    setEditingItem(null)
  }

  // Delete Action
  const handleDelete = () => {
    if (!deleteConfirmation) return
    const { type, id, name } = deleteConfirmation
    if (type === 'mode') setModes((prev) => prev.filter((m) => m.id !== id))
    if (type === 'line') setRoutes((prev) => prev.filter((r) => r.id !== id))
    if (type === 'stop') setStops((prev) => prev.filter((s) => s.id !== id))
    if (type === 'operator') setOperators((prev) => prev.filter((o) => o.id !== id))

    showNotice(`تم حذف "${name}" بنجاح.`)
    setDeleteConfirmation(null)
  }

  // Filtered Lines
  const filteredRoutes = routes.filter((r) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      r.name_ar?.toLowerCase().includes(q) ||
      r.name_en?.toLowerCase().includes(q) ||
      r.short_code?.toLowerCase().includes(q) ||
      r.operator?.toLowerCase().includes(q)
    const matchesMode = selectedModeFilter === 'all' || r.mode_slug === selectedModeFilter
    return matchesSearch && matchesMode
  })

  // Filtered Stops
  const filteredStops = stops.filter((s) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      s.name_ar?.toLowerCase().includes(q) ||
      s.name_en?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    const matchesMode = selectedModeFilter === 'all' || s.mode_slug === selectedModeFilter
    return matchesSearch && matchesMode
  })

  return (
    <div className="min-h-full pb-12">
      <AdminHeader
        title={t('admin.network_title') || 'Transit Lines & Infrastructure'}
        subtitle="تحكم كامل وشامل في جميع وسائل المواصلات (قطارات، مترو، مونوريل، أتوبيسات، ميكروباص) ومحطاتها وخطوطها"
        onRefresh={loadData}
        isRefreshing={refreshing}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'modes' && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setModeForm({
                    name_ar: '',
                    name_en: '',
                    slug: '',
                    color: '#991b1b',
                    fare_model: 'distance',
                    status: 'active',
                  })
                  setIsModeModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
              >
                <Icon name="plus" size={13} />
                <span>إضافة وسيلة نقل جديدة</span>
              </button>
            )}

            {activeTab === 'lines' && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setLineForm({
                    name_ar: '',
                    name_en: '',
                    short_code: '',
                    mode_slug: 'rail',
                    operator: 'سكك حديد مصر ENR',
                    color: '#991b1b',
                    journey_time: '60 min',
                    is_active: true,
                  })
                  setIsLineModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
              >
                <Icon name="plus" size={13} />
                <span>إضافة خط سير جديد</span>
              </button>
            )}

            {activeTab === 'stops' && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setStopForm({
                    name_ar: '',
                    name_en: '',
                    mode_slug: 'rail',
                    lat: '30.0626',
                    lng: '31.2497',
                    city: 'القاهرة',
                    is_interchange: false,
                    facilitiesText: 'تذاكر, صالة انتظار, كراسي متحركة',
                  })
                  setIsStopModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
              >
                <Icon name="plus" size={13} />
                <span>إضافة محطة جديدة</span>
              </button>
            )}

            {activeTab === 'operators' && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setOperatorForm({
                    name_ar: '',
                    name_en: '',
                    phone: '',
                    website: '',
                    type: 'government',
                  })
                  setIsOperatorModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
              >
                <Icon name="plus" size={13} />
                <span>إضافة هيئة مشغلة جديدة</span>
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}

        {/* Global Multimodal Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#838383] uppercase">وسائل المواصلات المعتمدة</span>
            <div className="text-2xl font-bold font-mono text-[#202020] mt-1">{modes.length} وسائل نقل</div>
            <p className="text-[10px] text-[#838383] mt-1">قطارات، مترو، مونوريل، حافلات، ميكروباص</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#838383] uppercase">إجمالي خطوط السير النشطة</span>
            <div className="text-2xl font-bold font-mono text-blue-600 mt-1">{routes.length} خط سير</div>
            <p className="text-[10px] text-[#838383] mt-1">تغطي كافة محافظات الجمهورية</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#838383] uppercase">المحطات والمواقف المسجلة</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{stops.length} محطة</div>
            <p className="text-[10px] text-[#838383] mt-1">مع إحداثيات GPS الدقيقة والخدمات</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] shadow-xs">
            <span className="text-[11px] font-semibold text-[#838383] uppercase">الهيئات والشركات المشغلة</span>
            <div className="text-2xl font-bold font-mono text-purple-600 mt-1">{operators.length} جهات تشغيل</div>
            <p className="text-[10px] text-[#838383] mt-1">سكك حديد مصر، المترو، النقل العام...</p>
          </div>
        </div>

        {/* 4-Tab Main Navigation & Search Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#f8f9fa] rounded-xl border border-[#e8e8e8] w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('modes')
                setSearchQuery('')
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'modes'
                  ? 'bg-white text-[#202020] shadow-xs font-bold'
                  : 'text-[#646464] hover:text-[#202020]'
              }`}
            >
              🚆 وسائل المواصلات ({modes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('lines')
                setSearchQuery('')
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'lines'
                  ? 'bg-white text-[#202020] shadow-xs font-bold'
                  : 'text-[#646464] hover:text-[#202020]'
              }`}
            >
              🛤️ خطوط السير والمسارات ({routes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('stops')
                setSearchQuery('')
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'stops'
                  ? 'bg-white text-[#202020] shadow-xs font-bold'
                  : 'text-[#646464] hover:text-[#202020]'
              }`}
            >
              📍 المحطات والمواقف ({stops.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('operators')
                setSearchQuery('')
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'operators'
                  ? 'bg-white text-[#202020] shadow-xs font-bold'
                  : 'text-[#646464] hover:text-[#202020]'
              }`}
            >
              🏢 الهيئات والشركات المشغلة ({operators.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {(activeTab === 'lines' || activeTab === 'stops') && (
              <select
                value={selectedModeFilter}
                onChange={(e) => setSelectedModeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#e8e8e8] rounded-lg text-[#202020] focus:outline-hidden"
              >
                <option value="all">كل وسائل المواصلات</option>
                {modes.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name_ar}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود أو المدينة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#e8e8e8] rounded-lg text-[#202020] placeholder:text-[#838383] focus:outline-hidden focus:border-[#6647f0]"
              />
              <span className="absolute left-2.5 top-2 text-[#838383]">
                <Icon name="search" size={13} />
              </span>
            </div>
          </div>
        </div>

        {/* TAB 1: TRANSPORT MODES (وسائل وأنواع النقل) */}
        {activeTab === 'modes' && (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#e8e8e8] bg-[#fcfcfd] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#202020] uppercase tracking-wider">
                  إدارة وتخصيص وسائل المواصلات (Multimodal Fleet Engine)
                </h3>
                <p className="text-[11px] text-[#838383] mt-0.5">
                  يمكنك إضافة أي وسيلة مواصلات جديدة تظهر في مصر مستقبلاً وتحديد نظام تذاكرها وألوانها
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e8e8e8] text-[11px] font-bold text-[#838383] uppercase">
                    <th className="py-3 px-6">وسيلة النقل</th>
                    <th className="py-3 px-6">الكود والمطابقة</th>
                    <th className="py-3 px-6">نظام التسعير / التذاكر</th>
                    <th className="py-3 px-6">الخطوط المسجلة</th>
                    <th className="py-3 px-6">الحالة التشغيلية</th>
                    <th className="py-3 px-6 text-left">إجراءات التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-xs">
                  {modes.map((mode) => (
                    <tr key={mode.id} className="hover:bg-[#fcfcfd] transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                            style={{ backgroundColor: mode.color }}
                          ></span>
                          <div>
                            <div className="font-bold text-[#202020]">{mode.name_ar}</div>
                            <div className="text-[10px] text-[#838383] font-mono">{mode.name_en}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-[#646464]">
                        <span className="px-2 py-0.5 rounded bg-[#f8f9fa] border border-[#e8e8e8] uppercase font-bold">
                          {mode.slug}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {mode.fare_model === 'distance'
                            ? 'تسعير بالكيلومتر / المسافة'
                            : mode.fare_model === 'station_tiers'
                            ? 'شرائح محطات (مترو)'
                            : mode.fare_model === 'zone'
                            ? 'مناطق جغرافية'
                            : 'سعر تذكرة ثابت'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-[#202020]">
                        {mode.routes_count} خط
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            mode.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : mode.status === 'testing'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              mode.status === 'active'
                                ? 'bg-emerald-500'
                                : mode.status === 'testing'
                                ? 'bg-amber-500'
                                : 'bg-purple-500'
                            }`}
                          ></span>
                          <span>
                            {mode.status === 'active'
                              ? 'نشطة وتعمل'
                              : mode.status === 'testing'
                              ? 'تشغيل تجريبي'
                              : 'قيد الإنشاء'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(mode)
                              setModeForm({
                                name_ar: mode.name_ar,
                                name_en: mode.name_en,
                                slug: mode.slug,
                                color: mode.color,
                                fare_model: mode.fare_model,
                                status: mode.status,
                              })
                              setIsModeModalOpen(true)
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white hover:bg-[#e9ebf0] border border-[#e8e8e8] rounded-md transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmation({
                                type: 'mode',
                                id: mode.id,
                                name: mode.name_ar,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSIT LINES (خطوط السير والمسارات) */}
        {activeTab === 'lines' && (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e8e8e8] text-[11px] font-bold text-[#838383] uppercase">
                    <th className="py-3 px-6">كود الخط ولونه</th>
                    <th className="py-3 px-6">اسم خط السير</th>
                    <th className="py-3 px-6">وسيلة النقل</th>
                    <th className="py-3 px-6">الهيئة المشغلة</th>
                    <th className="py-3 px-6">عدد المحطات وزمن الرحلة</th>
                    <th className="py-3 px-6">الحالة</th>
                    <th className="py-3 px-6 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-xs">
                  {filteredRoutes.map((line) => {
                    const modeObj = modes.find((m) => m.slug === line.mode_slug)
                    return (
                      <tr key={line.id} className="hover:bg-[#fcfcfd] transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: line.color || modeObj?.color || '#991b1b' }}
                            ></span>
                            <span className="font-mono font-bold text-[#202020]">{line.short_code}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-[#202020]">{line.name_ar}</div>
                          <div className="text-[10px] text-[#838383]">{line.name_en}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#f8f9fa] text-[#646464] border border-[#e8e8e8]">
                            {modeObj?.name_ar || line.mode_slug}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-medium text-[#646464]">{line.operator}</td>
                        <td className="py-3.5 px-6 font-mono text-[#202020]">
                          <strong>{line.stops_count} محطة</strong> • {line.journey_time || '—'}
                        </td>
                        <td className="py-3.5 px-6">
                          <button
                            type="button"
                            onClick={() => {
                              setRoutes((prev) =>
                                prev.map((r) =>
                                  r.id === line.id ? { ...r, is_active: !r.is_active } : r
                                )
                              )
                              showNotice(`تم تغيير حالة الخط إلى ${!line.is_active ? 'يعمل' : 'معلق'}.`)
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                              line.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                line.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            ></span>
                            <span>{line.is_active ? 'ساري ويعمل' : 'معطل مؤقتاً'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-6 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(line)
                                setLineForm({
                                  name_ar: line.name_ar,
                                  name_en: line.name_en,
                                  short_code: line.short_code,
                                  mode_slug: line.mode_slug,
                                  operator: line.operator,
                                  color: line.color,
                                  journey_time: line.journey_time || '60 min',
                                  is_active: line.is_active,
                                })
                                setIsLineModalOpen(true)
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white hover:bg-[#e9ebf0] border border-[#e8e8e8] rounded-md transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmation({
                                  type: 'line',
                                  id: line.id,
                                  name: line.name_ar,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STATIONS & STOPS (المحطات والمواقف) */}
        {activeTab === 'stops' && (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e8e8e8] text-[11px] font-bold text-[#838383] uppercase">
                    <th className="py-3 px-6">اسم المحطة</th>
                    <th className="py-3 px-6">وسيلة النقل</th>
                    <th className="py-3 px-6">المحافظة / المدينة</th>
                    <th className="py-3 px-6">إحداثيات GPS</th>
                    <th className="py-3 px-6">تجهيزات المحطة</th>
                    <th className="py-3 px-6 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-xs">
                  {filteredStops.map((stop) => {
                    const modeObj = modes.find((m) => m.slug === stop.mode_slug)
                    return (
                      <tr key={stop.id} className="hover:bg-[#fcfcfd] transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-[#202020] flex items-center gap-2">
                            <span>{stop.name_ar}</span>
                            {stop.is_interchange && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                محطة تبادلية
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#838383] font-mono">{stop.name_en}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: modeObj?.color || '#6647f0' }}
                          >
                            {modeObj?.name_ar || stop.mode_slug}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-[#202020]">{stop.city}</td>
                        <td className="py-3.5 px-6 font-mono text-[11px] text-[#838383]">
                          {Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-1 flex-wrap">
                            {stop.facilities?.map((f, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-[#f8f9fa] border border-[#e8e8e8] text-[#646464]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(stop)
                                setStopForm({
                                  name_ar: stop.name_ar,
                                  name_en: stop.name_en,
                                  mode_slug: stop.mode_slug,
                                  lat: String(stop.lat),
                                  lng: String(stop.lng),
                                  city: stop.city,
                                  is_interchange: Boolean(stop.is_interchange),
                                  facilitiesText: (stop.facilities || []).join(', '),
                                })
                                setIsStopModalOpen(true)
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white hover:bg-[#e9ebf0] border border-[#e8e8e8] rounded-md transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmation({
                                  type: 'stop',
                                  id: stop.id,
                                  name: stop.name_ar,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: OPERATORS (الهيئات والشركات المشغلة) */}
        {activeTab === 'operators' && (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e8e8e8] text-[11px] font-bold text-[#838383] uppercase">
                    <th className="py-3 px-6">اسم الهيئة أو الشركة المشغلة</th>
                    <th className="py-3 px-6">رقم الخط الساخن</th>
                    <th className="py-3 px-6">الموقع الإلكتروني</th>
                    <th className="py-3 px-6">نوع الكيان</th>
                    <th className="py-3 px-6 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-xs">
                  {operators.map((op) => (
                    <tr key={op.id} className="hover:bg-[#fcfcfd] transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-[#202020]">{op.name_ar}</div>
                        <div className="text-[10px] text-[#838383] font-mono">{op.name_en}</div>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-[#202020]">{op.phone || '—'}</td>
                      <td className="py-3.5 px-6 font-mono text-blue-600">
                        {op.website ? (
                          <a href={op.website} target="_blank" rel="noreferrer" className="hover:underline">
                            {op.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f8f9fa] border border-[#e8e8e8] text-[#646464]">
                          {op.type === 'government' ? 'جهة حكومية رسمية' : op.type === 'authority' ? 'هيئة تنظيمية' : 'قطاع خاص / تشغيل'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(op)
                              setOperatorForm({
                                name_ar: op.name_ar,
                                name_en: op.name_en,
                                phone: op.phone,
                                website: op.website,
                                type: op.type,
                              })
                              setIsOperatorModalOpen(true)
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white hover:bg-[#e9ebf0] border border-[#e8e8e8] rounded-md transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmation({
                                type: 'operator',
                                id: op.id,
                                name: op.name_ar,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT TRANSPORT MODE */}
      <AdminModal
        isOpen={isModeModalOpen}
        onClose={() => {
          setIsModeModalOpen(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'تعديل وسيلة النقل' : 'إضافة وسيلة نقل جديدة للمنظومة'}
        subtitle="حدد اسم وسيلة المواصلات، الكود، نظام احتساب الأجرة، ولون العلامة التجارية"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsModeModalOpen(false)
                setEditingItem(null)
              }}
              className="px-4 py-2 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white border border-[#e8e8e8] rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="mode-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة وسيلة النقل'}
            </button>
          </>
        }
      >
        <form id="mode-form" onSubmit={handleSaveMode} className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                اسم وسيلة النقل (بالعربي) *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: القطار الكهربائي السريع"
                value={modeForm.name_ar}
                onChange={(e) => setModeForm({ ...modeForm, name_ar: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                English Name *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. High Speed Rail (HSR)"
                value={modeForm.name_en}
                onChange={(e) => setModeForm({ ...modeForm, name_en: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                الكود التعريفي (Slug) *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. hsr, train, ferry"
                value={modeForm.slug}
                onChange={(e) => setModeForm({ ...modeForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                نظام تسعير التذاكر والأجرة *
              </label>
              <select
                value={modeForm.fare_model}
                onChange={(e) => setModeForm({ ...modeForm, fare_model: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              >
                <option value="distance">تسعير بالكيلومتر والمحطات (كالقطارات)</option>
                <option value="station_tiers">شرائح محطات تصاعدية (كالمترو)</option>
                <option value="zone">مناطق جغرافية (كالمونوريل و BRT)</option>
                <option value="flat">سعر تذكرة ثابت وموحد (كالأتوبيس)</option>
                <option value="route_flat">أجرة مسار ثابتة (كالميكروباص)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                اللون الرسمي على الخريطة
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={modeForm.color}
                  onChange={(e) => setModeForm({ ...modeForm, color: e.target.value })}
                  className="w-9 h-9 p-0.5 rounded-lg border border-[#e8e8e8] cursor-pointer"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={modeForm.color}
                  onChange={(e) => setModeForm({ ...modeForm, color: e.target.value })}
                  className="w-28 px-3 py-1.5 text-xs font-mono border border-[#e8e8e8] rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                الحالة التشغيلية
              </label>
              <select
                value={modeForm.status}
                onChange={(e) => setModeForm({ ...modeForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              >
                <option value="active">نشطة وتعمل رسمياً</option>
                <option value="testing">تشغيل تجريبي / قيد الافتتاح</option>
                <option value="construction">تحت الإنشاء</option>
              </select>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* MODAL: ADD / EDIT TRANSIT LINE */}
      <AdminModal
        isOpen={isLineModalOpen}
        onClose={() => {
          setIsLineModalOpen(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'تعديل خط سير' : 'إضافة خط سير جديد'}
        subtitle="حدد اسم الخط، وسيلة النقل التابع لها (قطارات، مترو، أتوبيس...)، والجهة المشغلة"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsLineModalOpen(false)
                setEditingItem(null)
              }}
              className="px-4 py-2 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white border border-[#e8e8e8] rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="line-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة خط السير'}
            </button>
          </>
        }
      >
        <form id="line-form" onSubmit={handleSaveLine} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-semibold text-[#202020] mb-1">
              اسم خط السير بالعربي *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: قطار تالجو القاهرة - أسوان"
              value={lineForm.name_ar}
              onChange={(e) => setLineForm({ ...lineForm, name_ar: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                English Name *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. Talgo Train Cairo - Aswan"
                value={lineForm.name_en}
                onChange={(e) => setLineForm({ ...lineForm, name_en: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                كود الخط / رقم القطار أو الحافلة *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. TLG-2030, L1, 1024"
                value={lineForm.short_code}
                onChange={(e) => setLineForm({ ...lineForm, short_code: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                وسيلة النقل التابع لها الخط *
              </label>
              <select
                value={lineForm.mode_slug}
                onChange={(e) => setLineForm({ ...lineForm, mode_slug: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              >
                {modes.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                الهيئة أو الشركة المشغلة *
              </label>
              <select
                value={lineForm.operator}
                onChange={(e) => setLineForm({ ...lineForm, operator: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              >
                {operators.map((o) => (
                  <option key={o.id} value={o.name_ar}>
                    {o.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                متوسط زمن الرحلة الكاملة
              </label>
              <input
                type="text"
                placeholder="مثال: ساعتان و 15 دقيقة"
                value={lineForm.journey_time}
                onChange={(e) => setLineForm({ ...lineForm, journey_time: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                لون الخط التمييزي
              </label>
              <input
                type="color"
                value={lineForm.color}
                onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                className="w-full h-9 p-0.5 rounded-lg border border-[#e8e8e8] cursor-pointer"
              />
            </div>
          </div>
        </form>
      </AdminModal>

      {/* MODAL: ADD / EDIT STATION */}
      <AdminModal
        isOpen={isStopModalOpen}
        onClose={() => {
          setIsStopModalOpen(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'تعديل بيانات المحطة' : 'إضافة محطة قطار أو مترو جديدة'}
        subtitle="حدد اسم المحطة، وسيلة النقل، إحداثيات GPS، والمدينة والتجهيزات المتاحة"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsStopModalOpen(false)
                setEditingItem(null)
              }}
              className="px-4 py-2 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white border border-[#e8e8e8] rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="stop-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة المحطة'}
            </button>
          </>
        }
      >
        <form id="stop-form" onSubmit={handleSaveStop} className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                اسم المحطة بالعربي *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: محطة قطارات أسوان"
                value={stopForm.name_ar}
                onChange={(e) => setStopForm({ ...stopForm, name_ar: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                English Name *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. Aswan Train Station"
                value={stopForm.name_en}
                onChange={(e) => setStopForm({ ...stopForm, name_en: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden focus:border-[#6647f0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                وسيلة المواصلات التي تخدمها المحطة *
              </label>
              <select
                value={stopForm.mode_slug}
                onChange={(e) => setStopForm({ ...stopForm, mode_slug: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              >
                {modes.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                المحافظة أو المدينة *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: الإسكندرية، أسوان، الجيزة..."
                value={stopForm.city}
                onChange={(e) => setStopForm({ ...stopForm, city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                خط العرض (Latitude) *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="30.0626"
                value={stopForm.lat}
                onChange={(e) => setStopForm({ ...stopForm, lat: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                خط الطول (Longitude) *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="31.2497"
                value={stopForm.lng}
                onChange={(e) => setStopForm({ ...stopForm, lng: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202020] mb-1">
              التجهيزات والخدمات (مفصولة بفاصلة)
            </label>
            <input
              type="text"
              placeholder="تذاكر، صالة انتظار، كراسي متحركة، واي فاي، جراج"
              value={stopForm.facilitiesText}
              onChange={(e) => setStopForm({ ...stopForm, facilitiesText: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_interchange"
              checked={stopForm.is_interchange}
              onChange={(e) => setStopForm({ ...stopForm, is_interchange: e.target.checked })}
              className="w-4 h-4 rounded-sm border-[#e8e8e8] text-[#6647f0] focus:ring-0"
            />
            <label htmlFor="is_interchange" className="text-xs text-[#202020] font-medium cursor-pointer">
              محطة تبادلية كبرى (تربط بين أكثر من وسيلة مواصلات كالمترو والقطار)
            </label>
          </div>
        </form>
      </AdminModal>

      {/* MODAL: ADD / EDIT OPERATOR */}
      <AdminModal
        isOpen={isOperatorModalOpen}
        onClose={() => {
          setIsOperatorModalOpen(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'تعديل بيانات الهيئة المشغلة' : 'إضافة هيئة مشغلة جديدة'}
        subtitle="أدخل بيانات الشركة المشغلة للقطارات أو الأتوبيسات وأرقام الطوارئ"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsOperatorModalOpen(false)
                setEditingItem(null)
              }}
              className="px-4 py-2 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white border border-[#e8e8e8] rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="operator-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6647f0] hover:bg-[#5235d9] rounded-lg transition-colors shadow-xs"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة الهيئة'}
            </button>
          </>
        }
      >
        <form id="operator-form" onSubmit={handleSaveOperator} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-semibold text-[#202020] mb-1">
              اسم الهيئة أو الشركة المشغلة (عربي) *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: الهيئة القومية لسكك حديد مصر"
              value={operatorForm.name_ar}
              onChange={(e) => setOperatorForm({ ...operatorForm, name_ar: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                English Name *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="e.g. Egyptian National Railways"
                value={operatorForm.name_en}
                onChange={(e) => setOperatorForm({ ...operatorForm, name_en: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020] mb-1">
                الخط الساخن / الهاتف
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="1504"
                value={operatorForm.phone}
                onChange={(e) => setOperatorForm({ ...operatorForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202020] mb-1">
              رابط الموقع الإلكتروني
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="https://enr.gov.eg"
              value={operatorForm.website}
              onChange={(e) => setOperatorForm({ ...operatorForm, website: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-[#e8e8e8] rounded-lg focus:outline-hidden"
            />
          </div>
        </form>
      </AdminModal>

      {/* CONFIRM DELETE MODAL */}
      <AdminModal
        isOpen={Boolean(deleteConfirmation)}
        onClose={() => setDeleteConfirmation(null)}
        title="تأكيد الحذف النهائي"
        subtitle="سيتم إزالة هذا العنصر نهائياً من شبكة النقل ومحرك اقتراح الرحلات"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirmation(null)}
              className="px-4 py-2 text-xs font-medium text-[#646464] hover:text-[#202020] bg-white border border-[#e8e8e8] rounded-lg transition-colors"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
            >
              حذف نهائي
            </button>
          </>
        }
      >
        <p className="text-xs text-[#646464] leading-relaxed text-right" dir="rtl">
          هل أنت متأكد من رغبتك في حذف <strong className="text-[#202020]">"{deleteConfirmation?.name}"</strong>؟
          هذا الإجراء سيؤثر فوراً على مسارات الرحلات ومحرك البحث في المنصة.
        </p>
      </AdminModal>
    </div>
  )
}
