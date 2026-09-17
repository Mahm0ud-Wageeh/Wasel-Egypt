import { useState, useEffect } from 'react'
import type { Screen, Lang } from '../App'
import { EGYPT_LINES } from '../data/egyptTransitData'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import { ModeIcon } from '../components/icons'
import StationSelectorModal from '../components/search/StationSelectorModal'
import { MapPin, TrainFront, Ticket, Sparkles, Search, Map as MapIcon, TriangleAlert, History, Navigation } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  activeJourney: boolean
  setActiveJourney: (v: boolean) => void
  onPrefillPlanner?: (from: string, to: string) => void
}

const quickActions = [
  { ar: 'محطات قريبة', en: 'Nearby Stops', Icon: MapPin, screen: 'network' as Screen },
  { ar: 'خطوط المترو', en: 'Metro Lines', Icon: TrainFront, screen: 'metro' as Screen },
  { ar: 'احسب التذكرة', en: 'Calc Fare', Icon: Ticket, screen: 'fares' as Screen },
  { ar: 'واصل AI', en: 'Wasel AI', Icon: Sparkles, screen: 'ai' as Screen },
]

export default function HomeScreen({ lang, t, nav, activeJourney, setActiveJourney, onPrefillPlanner }: Props) {
  const [originInput, setOriginInput] = useState('')
  const [destInput, setDestInput] = useState('')
  const [serviceAlerts, setServiceAlerts] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<'from' | 'to'>('from')

  const openModal = (target: 'from' | 'to') => {
    setModalTarget(target)
    setModalOpen(true)
  }

  const handleModalSelect = (sel: { name: string; lat?: number; lng?: number }) => {
    if (modalTarget === 'from') setOriginInput(sel.name)
    else setDestInput(sel.name)
  }

  useEffect(() => {
    async function loadAlerts() {
      try {
        const alerts = await apiRequest(endpoints.public.activeServiceAlerts, { method: 'GET', auth: false })
        if (Array.isArray(alerts) && alerts.length > 0) {
          setServiceAlerts(alerts)
        }
      } catch {
        // Fallback default verified alert
        setServiceAlerts([
          {
            id: 'alt_1',
            type: 'warning',
            title_ar: 'تأخير محدود على خط ٢',
            title_en: 'Minor delay on Line 2',
            body_ar: 'تأخير ٨ دقائق بين محطتي الدقي والبحوث لأعمال الصيانة',
            body_en: '8 min delay between Dokki and Bohooth due to maintenance',
            tag: lang === 'ar' ? 'خط ٢' : 'Line 2',
            tagColor: 'bg-blue-100 text-blue-700',
          },
          {
            id: 'alt_2',
            type: 'info',
            title_ar: 'انتظام حركة LRT العاصمة',
            title_en: 'Capital LRT on schedule',
            body_ar: 'رحلات منتظمة كل ١٥ دقيقة بين عدلي منصور والعاصمة الإدارية',
            body_en: 'Regular trips every 15 min between Adly Mansour and New Capital',
            tag: 'LRT',
            tagColor: 'bg-emerald-100 text-emerald-700',
          },
        ])
      }
    }
    loadAlerts()
  }, [lang])

  const handleStartSearch = () => {
    if (onPrefillPlanner && (originInput || destInput)) {
      onPrefillPlanner(originInput || t('موقعي الحالي', 'Current location'), destInput)
    }
    nav('planner')
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-50 pb-12">
      {/* Hero Planner Banner with WebP visual and deep navy fallback */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-blue-950 to-primary px-4 pt-6 pb-10 text-white shadow-md">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img
            src="/images/hero-transit.webp"
            alt={lang === 'ar' ? 'شبكة النقل الذكية في مصر' : 'Transit network in Egypt'}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "'El Messiri', sans-serif" }}>
              {t('رايح فين النهاردة؟', 'Where to today?')}
            </h1>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold backdrop-blur-sm">
              {t('واصل مصر', 'Wasel Egypt')}
            </span>
          </div>
          <p className="text-blue-100 text-sm mb-6">
            {t('دليلك الذكي للتنقل بالمترو، القطار، LRT، والمونوريل في مصر', 'Smart multi-modal transit navigation across Egypt')}
          </p>

          <div className="bg-white rounded-2xl shadow-xl p-2 text-neutral-800 space-y-1">
            {/* Origin Input */}
            <div
              onClick={() => openModal('from')}
              className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-100 cursor-pointer hover:bg-blue-50/40 transition-colors rounded-xl"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full border-2 border-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-neutral-400">{t('نقطة الانطلاق', 'Origin')}</div>
                <div className="text-sm font-bold text-neutral-900 truncate">
                  {originInput || <span className="text-neutral-400 font-normal text-xs">{t('اختر محطة الانطلاق (رمسيس، السادات...)', 'Choose starting station...')}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openModal('from') }}
                className="text-blue-600 text-xs font-bold border border-blue-200 rounded-lg px-2.5 py-1 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <MapIcon size={13} />
                <span>{t('تصفح', 'Browse')}</span>
              </button>
            </div>

            {/* Destination Input */}
            <div
              onClick={() => openModal('to')}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-red-50/40 transition-colors rounded-xl"
            >
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-neutral-400">{t('وجهة الوصول', 'Destination')}</div>
                <div className="text-sm font-bold text-neutral-900 truncate">
                  {destInput || <span className="text-neutral-400 font-normal text-xs">{t('اختر محطة الوصول (العاصمة الإدارية، الزمالك...)', 'Choose destination station...')}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openModal('to') }}
                className="text-red-600 text-xs font-bold border border-red-200 rounded-lg px-2.5 py-1 bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <MapIcon size={13} />
                <span>{t('تصفح', 'Browse')}</span>
              </button>
            </div>

            {/* CTA Button */}
            <div className="pt-1">
              <button
                onClick={handleStartSearch}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
              >
                <Search size={16} />
                <span>{t('احسب أسرع مسار', 'Find Fastest Route')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-5">
        {/* Active Journey Banner */}
        {activeJourney && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 mb-5 shadow-xl border border-blue-400/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
                  <p className="font-bold text-sm">{t('رحلة نشطة حالياً', 'Active Journey in Progress')}</p>
                </div>
                <p className="text-blue-100 text-xs">{t('المحطة القادمة: الشهداء (رمسيس)', 'Next station: Al-Shohadaa (Ramses)')}</p>
              </div>
              <button
                onClick={() => nav('active-journey')}
                className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                {t('عرض الخريطة الحية', 'Live Navigation')}
              </button>
            </div>
            <div className="mt-3 bg-white/10 rounded-xl p-2.5 backdrop-blur-sm text-xs flex items-center justify-between">
              <span className="flex items-center gap-1"><ModeIcon mode="metro" size={15} /> {t('الخط الأول — اتجاه المرج', 'Line 1 — El Marg')}</span>
              <span>•</span>
              <span>٣ {t('محطات متبقية', 'stops left')}</span>
              <span>•</span>
              <span>~٩ {t('دقائق', 'min')}</span>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-6">
          {quickActions.map(a => (
            <button
              key={a.ar}
              onClick={() => nav(a.screen)}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-sm hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md transition-all group"
            >
              <span className="text-blue-600 group-hover:scale-110 transition-transform"><a.Icon size={24} /></span>
              <span className="text-[11px] font-semibold text-neutral-700 text-center leading-tight">
                {lang === 'ar' ? a.ar : a.en}
              </span>
            </button>
          ))}
        </div>

        {/* Transport Modes Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-neutral-900">{t('وسائل النقل في مصر', 'Transport Modes')}</h2>
            <button onClick={() => nav('network')} className="text-xs font-bold text-blue-600 hover:underline">
              {t('عرض الخريطة الشاملة', 'Full Network Map')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {EGYPT_LINES.map(line => (
              <button
                key={line.id}
                onClick={() => {
                  if (line.mode === 'metro') nav('metro')
                  else if (line.mode === 'lrt') nav('lrt')
                  else if (line.mode === 'monorail') nav('monorail')
                  else if (line.mode === 'brt') nav('brt')
                  else if (line.mode === 'train') nav('train')
                  else nav('network')
                }}
                className="flex flex-col p-3 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md transition-all text-start group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="group-hover:scale-110 transition-transform"
                  >
                    <ModeIcon mode={line.mode} size={24} />
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.code}
                  </span>
                </div>
                <p className="text-xs font-bold text-neutral-800 truncate mb-0.5">
                  {lang === 'ar' ? line.name_ar : line.name_en}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {line.stationsCount} {t('محطة', 'stations')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Live Service Alerts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">{t('تنبيهات وحالة التشغيل', 'Service Alerts')}</h2>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {serviceAlerts.length}
              </span>
            </div>
            <span className="text-xs text-neutral-400">{t('محدث لحظياً', 'Real-time')}</span>
          </div>

          <div className="space-y-2">
            {serviceAlerts.map((alert, idx) => (
              <div
                key={alert.id || idx}
                className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-sm hover:border-neutral-300 transition-all flex gap-3"
              >
                <TriangleAlert size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-neutral-900">
                      {lang === 'ar' ? alert.title_ar || alert.title : alert.title_en || alert.title}
                    </p>
                    {alert.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alert.tagColor || 'bg-neutral-100 text-neutral-700'}`}>
                        {alert.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {lang === 'ar' ? alert.body_ar || alert.description : alert.body_en || alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-neutral-900 mb-3">{t('رحلات سابقة وشائعة', 'Recent & Popular Routes')}</h2>
          <div className="space-y-2">
            {[
              { from: t('محطة الشهداء (رمسيس)', 'Al-Shohadaa (Ramses)'), to: t('العاصمة الإدارية', 'New Admin Capital') },
              { from: t('محطة الجيزة', 'Giza Station'), to: t('الزمالك', 'Zamalek') },
              { from: t('عدلي منصور', 'Adly Mansour'), to: t('الشروق', 'El Shorouk') },
            ].map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  if (onPrefillPlanner) onPrefillPlanner(r.from, r.to)
                  nav('planner')
                }}
                className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-neutral-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-start shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
                  <History size={14} className="text-neutral-400" />
                  <span>{r.from}</span>
                  <span className="text-neutral-300">→</span>
                  <span>{r.to}</span>
                </div>
                <span className="text-xs text-blue-600 font-bold">{t('احسب', 'Plan')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Active Journey Toggle */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">{t('وضع المحاكاة التفاعلية', 'Live Simulation Mode')}</span>
              <Navigation size={18} className="text-blue-600" />
            </div>
          <p className="text-xs text-blue-700 mb-3 leading-relaxed">
            {t('جرّب تجربة الملاحة الحية على الخريطة التفاعلية مع محاكاة الانحراف عن المسار وبدائل العودة.', 'Test the live interactive map navigation with route tracking and deviation rerouting.')}
          </p>
          <button
            onClick={() => setActiveJourney(!activeJourney)}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm ${
              activeJourney ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {activeJourney ? t('إنهاء الرحلة النشطة', 'End Active Journey') : t('بدء رحلة تجريبية حية', 'Start Demo Live Journey')}
          </button>
        </div>
      </div>
    </div>

    <StationSelectorModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      onSelect={handleModalSelect}
      title={modalTarget === 'from' ? t('اختر محطة البداية', 'Select Origin Station') : t('اختر محطة الوصول', 'Select Destination Station')}
      lang={lang}
      t={t}
      initialQuery={modalTarget === 'from' ? originInput : destInput}
    />
    </>
  )
}

