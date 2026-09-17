import { useState, useEffect } from 'react'
import type { Screen, Lang } from '../App'
import { EGYPT_STATIONS } from '../data/egyptTransitData'
import { planJourney, resolveCoordinates, JourneyPlan } from '../api/journeys'
import { ModeIcon, ModeBadge, MODE_COLORS } from '../components/icons'
import InteractiveMap from '../components/map/InteractiveMap'
import StationSelectorModal from '../components/search/StationSelectorModal'
import { Star, Navigation, Bookmark, Loader2, Footprints, ArrowLeftRight, Zap, CircleDollarSign, MapPin, Radio, Map as MapIcon } from 'lucide-react'

export interface JourneySearchContext {
  origin: string
  destination: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  option_index: number
}

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  initialFrom?: string
  initialTo?: string
  onStartJourney?: (route: JourneyPlan, search: JourneySearchContext | null) => void
  darkMode?: boolean
}

type PlanStep = 'form' | 'results' | 'details'

interface StationSelection {
  name: string
  lat?: number
  lng?: number
  stopId?: number | string
}

export default function PlannerScreen({
  lang,
  t,
  nav,
  initialFrom,
  initialTo,
  onStartJourney,
  darkMode = false,
}: Props) {
  const [step, setStep] = useState<PlanStep>('form')
  const [from, setFrom] = useState<string>(initialFrom || t('الشهداء (رمسيس)', 'Al-Shohadaa (Ramses)'))
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | undefined>(
    initialFrom ? undefined : { lat: 30.0617, lng: 31.2497 }
  )
  const [to, setTo] = useState<string>(initialTo || t('مدينة الفنون والثقافة (العاصمة)', 'Arts & Culture City (New Capital)'))
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | undefined>(
    initialTo ? undefined : { lat: 30.0167, lng: 31.7333 }
  )
  const [timeMode, setTimeMode] = useState<'now' | 'depart' | 'arrive'>('now')
  const [routes, setRoutes] = useState<JourneyPlan[]>([])
  const [selectedRoute, setSelectedRoute] = useState<JourneyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<'network' | 'empty' | 'places' | null>(null)
  const [preference, setPreference] = useState<'fastest' | 'transfers' | 'cheapest' | 'walking'>('fastest')

  const sortedRoutes = [...routes].sort((a, b) => {
    switch (preference) {
      case 'cheapest': return a.fare - b.fare || a.duration - b.duration
      case 'transfers': return a.changes - b.changes || a.duration - b.duration
      case 'walking': return a.walking - b.walking || a.duration - b.duration
      default: return a.duration - b.duration
    }
  })

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<'from' | 'to'>('from')

  // Inline suggestions (fallback when modal not used)
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([])
  const [toSuggestions, setToSuggestions] = useState<string[]>([])
  const [showFromDrop, setShowFromDrop] = useState(false)
  const [showToDrop, setShowToDrop] = useState(false)

  useEffect(() => {
    if (initialFrom) { setFrom(initialFrom); setFromCoords(undefined) }
    if (initialTo) { setTo(initialTo); setToCoords(undefined) }
  }, [initialFrom, initialTo])

  const openModal = (target: 'from' | 'to') => {
    setModalTarget(target)
    setModalOpen(true)
  }

  const handleModalSelect = (sel: StationSelection) => {
    if (modalTarget === 'from') {
      setFrom(sel.name)
      setFromCoords(sel.lat && sel.lng ? { lat: sel.lat, lng: sel.lng } : undefined)
    } else {
      setTo(sel.name)
      setToCoords(sel.lat && sel.lng ? { lat: sel.lat, lng: sel.lng } : undefined)
    }
  }

  // Live autocomplete search from local stations
  const handleFromChange = (val: string) => {
    setFrom(val)
    setFromCoords(undefined)
    if (val.trim().length >= 1) {
      const filtered = EGYPT_STATIONS
        .filter(s => (lang === 'ar' ? s.name_ar : s.name_en).toLowerCase().includes(val.toLowerCase()))
        .map(s => (lang === 'ar' ? s.name_ar : s.name_en))
      setFromSuggestions(filtered)
      setShowFromDrop(true)
    } else {
      setShowFromDrop(false)
    }
  }

  const handleToChange = (val: string) => {
    setTo(val)
    setToCoords(undefined)
    if (val.trim().length >= 1) {
      const filtered = EGYPT_STATIONS
        .filter(s => (lang === 'ar' ? s.name_ar : s.name_en).toLowerCase().includes(val.toLowerCase()))
        .map(s => (lang === 'ar' ? s.name_ar : s.name_en))
      setToSuggestions(filtered)
      setShowToDrop(true)
    } else {
      setShowToDrop(false)
    }
  }

  const selectFromSuggestion = (name: string) => {
    setFrom(name)
    setShowFromDrop(false)
    // Try to find coords from EGYPT_STATIONS
    const st = EGYPT_STATIONS.find(s => s.name_ar === name || s.name_en === name)
    if (st) setFromCoords({ lat: st.lat, lng: st.lng })
  }

  const selectToSuggestion = (name: string) => {
    setTo(name)
    setShowToDrop(false)
    const st = EGYPT_STATIONS.find(s => s.name_ar === name || s.name_en === name)
    if (st) setToCoords({ lat: st.lat, lng: st.lng })
  }

  const handleSwap = () => {
    const tempName = from
    const tempCoords = fromCoords
    setFrom(to)
    setFromCoords(toCoords)
    setTo(tempName)
    setToCoords(tempCoords)
  }

  const handleSearchRoutes = async () => {
    if (!from || !to) return
    setLoading(true)
    setSearchError(null)
    try {
      // Ensure coordinates are attached for the live-tracking handoff
      // (same resolver the planner itself uses).
      let oCoords: { lat: number; lng: number } | undefined = fromCoords
      let dCoords: { lat: number; lng: number } | undefined = toCoords
      if (!oCoords) {
        const resolved = await resolveCoordinates(from)
        if (resolved) {
          oCoords = resolved
          setFromCoords(resolved)
        }
      }
      if (!dCoords) {
        const resolved = await resolveCoordinates(to)
        if (resolved) {
          dCoords = resolved
          setToCoords(resolved)
        }
      }
      const results = await planJourney({
        origin: from,
        destination: to,
        origin_lat: oCoords?.lat,
        origin_lng: oCoords?.lng,
        destination_lat: dCoords?.lat,
        destination_lng: dCoords?.lng,
      })
      setRoutes(results)
      if (results.length > 0) {
        setSelectedRoute(results[0])
      }
      setStep('results')
    } catch (err: any) {
      // Honest failure states — never invent routes, times or fares.
      if (err?.status === 404 || err?.message === 'NO_JOURNEY_OPTIONS') {
        setSearchError('empty')
      } else if (err?.status === 422 || err?.message === 'UNRESOLVABLE_PLACES') {
        setSearchError('places')
      } else {
        setSearchError('network')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTrip = (route: JourneyPlan) => {
    try {
      const saved = JSON.parse(localStorage.getItem('wasel.saved_trips') || '[]')
      saved.push({
        id: Date.now(),
        from,
        to,
        duration: route.duration,
        fare: route.fare,
        savedAt: new Date().toISOString(),
      })
      localStorage.setItem('wasel.saved_trips', JSON.stringify(saved))
      alert(t('تم حفظ الرحلة بنجاح!', 'Trip saved successfully!'))
    } catch {
      /* ignore */
    }
  }

  if (step === 'details' && selectedRoute) {
    const backendIndex = (() => {
      const m = String(selectedRoute.id).match(/^backend_\d+_(\d+)$/)
      return m ? Number(m[1]) : 0
    })()
    const searchCtx: JourneySearchContext | null =
      fromCoords && toCoords
        ? {
            origin: from,
            destination: to,
            origin_lat: fromCoords.lat,
            origin_lng: fromCoords.lng,
            destination_lat: toCoords.lat,
            destination_lng: toCoords.lng,
            option_index: backendIndex,
          }
        : null
    return (
      <RouteDetailsView
        route={selectedRoute}
        lang={lang}
        t={t}
        darkMode={darkMode}
        onBack={() => setStep('results')}
        onStart={() => {
          if (onStartJourney) onStartJourney(selectedRoute, searchCtx)
          nav('active-journey')
        }}
        onSave={() => handleSaveTrip(selectedRoute)}
      />
    )
  }

  if (step === 'results') {
    return (
      <div className="min-h-screen bg-neutral-50 pb-12">
        {/* Results Header */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep('form')}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold mb-2.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={lang === 'ar' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
              <span>{t('تعديل نقاط البحث', 'Edit Search')}</span>
            </button>

            <div className="flex items-center gap-3 bg-neutral-100 rounded-2xl px-4 py-2.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 flex-shrink-0" />
              <span className="text-xs font-bold text-neutral-800 truncate flex-1">{from}</span>
              <span className="text-neutral-400 text-xs">→</span>
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0" />
              <span className="text-xs font-bold text-neutral-800 truncate flex-1">{to}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-neutral-500">
              {routes.length} {t('مسارات مقترحة للتنقل', 'suggested route options')}
            </p>
            <span className="text-xs text-blue-600 font-semibold">
              {preference === 'fastest' && t('الأسرع أولاً', 'Fastest first')}
              {preference === 'cheapest' && t('الأرخص أولاً', 'Cheapest first')}
              {preference === 'transfers' && t('الأقل تحويلات أولاً', 'Fewest transfers first')}
              {preference === 'walking' && t('الأقل مشياً أولاً', 'Least walking first')}
            </span>
          </div>

          {sortedRoutes.map(route => (
            <button
              key={route.id}
              onClick={() => {
                setSelectedRoute(route)
                setStep('details')
              }}
              className={`w-full bg-white rounded-2xl border-2 p-4 text-start transition-all hover:border-blue-400 hover:shadow-md ${
                route.recommended ? 'border-blue-600 ring-1 ring-blue-600/20' : 'border-neutral-200'
              }`}
            >
              {route.recommended && (
                <div className="flex items-center gap-1.5 mb-2.5 bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg w-fit">
                  <Star size={13} className="fill-blue-600 text-blue-600" />
                  <span>{t('المسار الموصى به — الأسرع والأكثر راحة', 'Recommended — Fastest')}</span>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-2xl font-black text-neutral-900">
                    {route.duration} <span className="text-sm font-medium text-neutral-500">{t('دقيقة', 'min')}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {route.departure} → {route.arrival}
                  </p>
                </div>
                <div className="text-end">
                  <div className="text-lg font-black text-neutral-900">
                    {route.fare > 0 ? `${route.fare}` : '—'} <span className="text-xs font-bold text-neutral-500">{route.fare > 0 ? t('جنيه', 'EGP') : ''}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      route.fareStatus === 'official' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {route.fareStatus === 'official' ? t('رسمي', 'Official') : t('تقديري', 'Estimated')}
                  </span>
                </div>
              </div>

              {/* Legs sequence */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {route.legs.map((leg, idx) => (
                  <ModeBadge
                    key={idx}
                    mode={leg.type}
                    label={lang === 'ar' ? leg.line_ar || leg.desc_ar || '' : leg.line_en || leg.desc_en || ''}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                <span className="flex items-center gap-1"><Footprints size={14} /> {route.walking} {t('دقائق مشي', 'min walk')}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><ArrowLeftRight size={14} /> {route.changes} {t('تحويلات', 'transfers')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Form Step ────────────────────────────────────────────────────────────
  return (
    <>
      <StationSelectorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleModalSelect}
        title={modalTarget === 'from'
          ? t('اختر نقطة البداية', 'Select Origin')
          : t('اختر الوجهة', 'Select Destination')}
        lang={lang}
        t={t}
        initialQuery={modalTarget === 'from' ? from : to}
      />

      <div className="min-h-screen bg-neutral-50 pb-12">
        <div className="bg-white border-b border-neutral-200 px-4 pt-4 pb-6 shadow-sm">
          <div className="max-w-2xl mx-auto">
            {/* Banner with lazy WebP and deep navy fallback */}
            <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm aspect-[16/6] bg-gradient-to-br from-navy to-primary">
              <img
                src="/images/planner-banner.webp"
                alt={lang === 'ar' ? 'تخطيط رحلات النقل الذكية في مصر' : 'Smart transit journey planning in Egypt'}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent flex items-end p-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight" style={{ fontFamily: "'El Messiri', sans-serif" }}>
                    {t('خطط رحلتك الذكية', 'Plan Your Journey')}
                  </h1>
                  <p className="text-[11px] text-blue-200">
                    {t('أسرع مسار وأدق تكلفة عبر شبكة النقل المصرية', 'Fastest routes and official fares across Egypt')}
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs Container with Swap Button */}
            <div className="relative bg-neutral-100 rounded-2xl p-1.5 space-y-1">
              <button
                onClick={handleSwap}
                title={t('تبديل البداية والوجهة', 'Swap origin & destination')}
                className="absolute start-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white hover:bg-neutral-50 active:scale-95 text-blue-600 rounded-full shadow-md flex items-center justify-center transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              {/* Origin Input */}
              <div className="relative">
                <div className="bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-xs">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={from}
                    onChange={e => handleFromChange(e.target.value)}
                    onFocus={() => setShowFromDrop(true)}
                    placeholder={t('نقطة البداية؟', 'From station or place?')}
                    className="flex-1 text-sm font-semibold text-neutral-800 outline-none bg-transparent"
                  />
                  {from && (
                    <button onClick={() => { setFrom(''); setFromCoords(undefined) }} className="text-neutral-400 hover:text-neutral-600 text-lg">×</button>
                  )}
                  {/* Browse modal trigger */}
                  <button
                    onClick={() => openModal('from')}
                    title={t('تصفح المحطات', 'Browse stations')}
                    className="text-blue-500 hover:text-blue-700 text-xs font-bold border border-blue-200 rounded-lg px-2 py-1 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    {t('تصفح', 'Browse')}
                  </button>
                </div>

                {/* From Dropdown */}
                {showFromDrop && fromSuggestions.length > 0 && (
                  <div className="absolute top-full start-0 end-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto py-1">
                    {fromSuggestions.slice(0, 8).map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectFromSuggestion(s)}
                        className="w-full text-start px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <MapPin size={14} className="text-neutral-400" />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="relative">
                <div className="bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-xs">
                  <div className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={to}
                    onChange={e => handleToChange(e.target.value)}
                    onFocus={() => setShowToDrop(true)}
                    placeholder={t('وجهتك فين؟', 'Where is your destination?')}
                    className="flex-1 text-sm font-semibold text-neutral-800 outline-none bg-transparent"
                  />
                  {to && (
                    <button onClick={() => { setTo(''); setToCoords(undefined) }} className="text-neutral-400 hover:text-neutral-600 text-lg">×</button>
                  )}
                  <button
                    onClick={() => openModal('to')}
                    title={t('تصفح المحطات', 'Browse stations')}
                    className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 rounded-lg px-2 py-1 bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap"
                  >
                    {t('تصفح', 'Browse')}
                  </button>
                </div>

                {/* To Dropdown */}
                {showToDrop && toSuggestions.length > 0 && (
                  <div className="absolute top-full start-0 end-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto py-1">
                    {toSuggestions.slice(0, 8).map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectToSuggestion(s)}
                        className="w-full text-start px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <MapPin size={14} className="text-neutral-400" />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Time Selector */}
            <div className="flex gap-2 mt-3">
              {[
                { id: 'now', ar: 'المغادرة الآن', en: 'Leave Now' },
                { id: 'depart', ar: 'تحديد وقت المغادرة', en: 'Depart at' },
                { id: 'arrive', ar: 'الوصول في وقت محدد', en: 'Arrive by' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTimeMode(opt.id as any)}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all ${
                    timeMode === opt.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {lang === 'ar' ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
          {/* Route Preferences */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
              {t('تفضيلات الرحلة', 'Routing Preferences')}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'fastest', ar: 'الأسرع زمناً', en: 'Fastest', Icon: Zap },
                { id: 'transfers', ar: 'أقل تحويلات', en: 'Fewer transfers', Icon: ArrowLeftRight },
                { id: 'cheapest', ar: 'أوفر سعر', en: 'Cheapest', Icon: CircleDollarSign },
                { id: 'walking', ar: 'أقل مشي', en: 'Less walking', Icon: Footprints },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreference(p.id)}
                  aria-pressed={preference === p.id}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                    preference === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <p.Icon size={13} />
                  {lang === 'ar' ? p.ar : p.en}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Station Picks from Local Data */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
              {t('محطات سريعة مقترحة', 'Quick Station Picks')}
            </h3>
            <div className="space-y-2">
              {EGYPT_STATIONS.filter(s => s.isInterchange).slice(0, 4).map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setTo(lang === 'ar' ? st.name_ar : st.name_en)
                    setToCoords({ lat: st.lat, lng: st.lng })
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-blue-200 hover:bg-blue-50/30 text-start transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ModeIcon
                      mode={st.modes.includes('metro') ? 'metro' : st.modes.includes('lrt') ? 'lrt' : st.modes[0]}
                      size={22}
                    />
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{lang === 'ar' ? st.name_ar : st.name_en}</p>
                      <p className="text-[11px] text-neutral-400">{lang === 'ar' ? st.zone_ar : st.zone_en}</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-bold">{t('إلى هنا', 'Go here')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main CTA */}
          <button
            onClick={handleSearchRoutes}
            disabled={!from || !to || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 active:scale-[0.99] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/25 transition-all text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Navigation size={17} />
                <span>{t('احسب مسارات الرحلة الآن', 'Find Best Routes')}</span>
              </>
            )}
          </button>

          {/* Honest error states — no invented data, clear next action */}
          {searchError && (
            <div className="bg-white rounded-2xl border-2 border-red-200 p-4 text-center space-y-2" role="alert">
              <div className="flex justify-center text-red-400">
                {searchError === 'network' ? <Radio size={30} /> : searchError === 'empty' ? <MapIcon size={30} /> : <MapPin size={30} />}
              </div>
              <p className="text-sm font-bold text-neutral-900">
                {searchError === 'network'
                  ? t('تعذر الاتصال بخدمة التخطيط', 'Could not reach the planning service')
                  : searchError === 'empty'
                    ? t('لا توجد مسارات متاحة بين هاتين النقطتين حالياً', 'No routes available between these points right now')
                    : t('تعذر تحديد أحد الموقعين — تحقق من الأسماء', 'Could not resolve one of the locations — check the names')}
              </p>
              <p className="text-xs text-neutral-500">
                {searchError === 'network'
                  ? t('تحقق من الاتصال بالإنترنت وأن الخادم يعمل ثم حاول مجدداً. لن نعرض أي أوقات أو أسعار غير حقيقية.', 'Check your connection and that the server is running, then retry. We never show unreal times or fares.')
                  : searchError === 'empty'
                    ? t('جرّب محطتين مختلفتين أو وقتاً مختلفاً.', 'Try different stations or another time.')
                    : t('اختر محطة من زر "تصفح" لضمان اسم صحيح.', 'Pick a station via “Browse” to ensure a valid name.')}
              </p>
              <button
                onClick={handleSearchRoutes}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
              >
                {t('إعادة المحاولة', 'Retry')}
              </button>
            </div>
          )}
        </div>
      </div>

      <StationSelectorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleModalSelect}
        title={modalTarget === 'from' ? t('اختر محطة البداية', 'Select Origin Station') : t('اختر محطة الوصول', 'Select Destination Station')}
        lang={lang}
        t={t}
        initialQuery={modalTarget === 'from' ? from : to}
      />
    </>
  )
}

function RouteDetailsView({ route, lang, t, darkMode, onBack, onStart, onSave }: any) {
  // Build route coordinates from leg waypoints or stop positions
  const routeCoords = (() => {
    const pts: { lat: number; lng: number }[] = []
    for (const leg of route.legs) {
      if (leg.waypoints && leg.waypoints.length > 0) {
        pts.push(...leg.waypoints)
      }
    }
    if (pts.length === 0) {
      return [
        { lng: 31.2497, lat: 30.0617 },
        { lng: 31.3023, lat: 30.0718 },
        { lng: 31.4214, lat: 30.1467 },
        { lng: 31.6025, lat: 30.1342 },
        { lng: 31.7333, lat: 30.0167 },
      ]
    }
    return pts.map(p => ({ lng: p.lng, lat: p.lat }))
  })()

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Interactive Map of the Journey */}
      <div className="relative h-72 w-full">
        <InteractiveMap
          darkMode={darkMode}
          center={[31.4214, 30.08]}
          zoom={11}
          activeRoutePoints={routeCoords}
          lang={lang}
          t={t}
          className="w-full h-full"
        />

        <button
          onClick={onBack}
          className="absolute top-4 start-4 z-30 bg-white/95 backdrop-blur-md text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 hover:bg-white transition-all"
        >
          <span>←</span>
          <span>{t('رجوع للنتائج', 'Back to Results')}</span>
        </button>

        <div className="absolute bottom-3 end-3 z-30 bg-neutral-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold">
          {route.duration} {t('دقيقة', 'min')} {route.fare > 0 ? `• ${route.fare} ${t('جنيه', 'EGP')}` : ''}
        </div>
      </div>

      {/* Journey Summary Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-neutral-500 mb-1">{t('تفاصيل الرحلة المختارة', 'Selected Journey Details')}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-neutral-900">{route.duration}</span>
                <span className="text-sm text-neutral-500">{t('دقيقة', 'min')}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {route.departure} → {route.arrival}
              </p>
            </div>
            <div className="text-end">
              <div className="text-xl font-black text-neutral-900">
                {route.fare > 0 ? route.fare : '—'} {route.fare > 0 && <span className="text-sm text-neutral-500">{t('جنيه', 'EGP')}</span>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                route.fareStatus === 'official' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {route.fareStatus === 'official' ? t('رسمي', 'Official') : t('تقديري', 'Estimated')}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onStart}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              <span>{t('ابدأ الرحلة الآن', 'Start Navigation')}</span>
            </button>
            <button
              onClick={onSave}
              className="w-12 h-12 bg-neutral-100 hover:bg-neutral-200 rounded-2xl flex items-center justify-center text-neutral-600 transition-all"
              title={t('حفظ الرحلة', 'Save trip')}
            >
              <Bookmark size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Legs */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        <h2 className="text-sm font-bold text-neutral-700 mb-3">{t('خطوات الرحلة', 'Journey Steps')}</h2>
        {route.legs.map((leg: any, idx: number) => (
          <div key={idx} className="bg-white rounded-2xl border border-neutral-100 p-3.5 flex items-start gap-3 shadow-xs">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: (leg.color || MODE_COLORS.walking) + '18' }}
            >
              <ModeIcon mode={leg.type} size={19} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: leg.color || MODE_COLORS.walking }}
                >
                  {leg.type === 'walking' ? t('مشي', 'Walk') :
                   leg.type === 'transfer' ? t('تحويلة', 'Transfer') :
                   (lang === 'ar' ? leg.line_ar : leg.line_en) || leg.type}
                </span>
                <span className="text-xs text-neutral-400">{leg.duration} {t('د', 'min')}</span>
              </div>
              <p className="text-xs text-neutral-700 font-medium">
                {lang === 'ar'
                  ? (leg.from_ar && leg.to_ar ? `${leg.from_ar} ← ${leg.to_ar}` : leg.desc_ar)
                  : (leg.from_en && leg.to_en ? `${leg.from_en} → ${leg.to_en}` : leg.desc_en)
                }
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
