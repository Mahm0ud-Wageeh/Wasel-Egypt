import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Lang } from '../../App'
import { searchPlaces, PlaceSearchStop, PlaceSearchPlace } from '../../api/places'
import { EGYPT_STATIONS, TRANSIT_LINES, Station } from '../../data/egyptTransitData'
import { ModeIcon } from '../icons'
import { Search, X, MapPin, TrainFront, Star, ArrowLeftRight } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (selection: { name: string; lat?: number; lng?: number; stopId?: number | string }) => void
  title?: string
  lang: Lang
  t: (ar: string, en: string) => string
  initialQuery?: string
}

export default function StationSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title,
  lang,
  t,
  initialQuery = '',
}: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'modes'>('search')
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string>('metro_1')
  const [lineSearch, setLineSearch] = useState('')

  // Autocomplete results from live backend API
  const [apiStops, setApiStops] = useState<PlaceSearchStop[]>([])
  const [apiPlaces, setApiPlaces] = useState<PlaceSearchPlace[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, initialQuery])

  // Debounced search against /api/v1/places/search
  useEffect(() => {
    const q = query.trim()
    if (!q || q.length < 2) {
      setApiStops([])
      setApiPlaces([])
      setLoading(false)
      return
    }

    setLoading(true)
    const abortController = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const res = await searchPlaces(q, undefined, { signal: abortController.signal })
        setApiStops(res.stops || [])
        setApiPlaces(res.places || [])
      } catch (err: any) {
        if (!err?.aborted) {
          setApiStops([])
          setApiPlaces([])
        }
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [query])

  // Matching stations from local verified Egypt Transit dataset
  const localStationMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return EGYPT_STATIONS.filter(s =>
      s.name_ar.toLowerCase().includes(q) ||
      s.name_en.toLowerCase().includes(q) ||
      s.zone_ar.toLowerCase().includes(q) ||
      s.zone_en.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [query])

  // Currently selected transit line for browsing
  const selectedLine = useMemo(() => {
    return TRANSIT_LINES.find(l => l.id === selectedLineId) || TRANSIT_LINES[0]
  }, [selectedLineId])

  // Filtered stations within the selected line
  const filteredLineStations = useMemo(() => {
    const q = lineSearch.trim().toLowerCase()
    if (!q) return selectedLine.stations
    return selectedLine.stations.filter(s =>
      s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)
    )
  }, [selectedLine, lineSearch])

  // Popular major hubs
  const majorHubs = useMemo(() => {
    return EGYPT_STATIONS.filter(s => s.isInterchange).slice(0, 8)
  }, [])

  if (!isOpen) return null

  const handleChoose = (item: { name: string; lat?: number; lng?: number; stopId?: number | string }) => {
    onSelect(item)
    onClose()
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('تحديد الموقع غير مدعوم في متصفحك', 'Geolocation is not supported by your browser.'))
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLoading(false)
        handleChoose({
          name: t('موقعي الحالي', 'My Current Location'),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        setLoading(false)
        alert(t('تعذر الوصول إلى موقعك الحالي، يرجى تفعيل الـ GPS', 'Could not access GPS location.'))
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              {title || t('تحديد المحطة أو الوجهة', 'Select Station or Location')}
            </h3>
            <p className="text-xs text-neutral-500">
              {t('ابحث بالاسم أو تصفح خطوط المترو والمونوريل والقطارات', 'Search by name or browse metro, monorail, and train lines')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Search size={14} />
            <span>{t('بحث ذكي بالاسم', 'Smart Search')}</span>
          </button>

          <button
            onClick={() => setActiveTab('modes')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'modes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <MapPin size={14} />
            <span>{t('تصفح حسب خطوط النقل والمحطات', 'Browse by Transit Lines')}</span>
          </button>
        </div>

        {/* Tab 1: Search Autocomplete */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Input Bar */}
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="relative flex items-center">
                <Search size={13} className="absolute start-3 text-neutral-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('اكتب اسم المحطة، الشارع، أو المنطقة (مثل: رمسيس، السادات، العاصمة...)', 'Type station, street, or area...')}
                  className="w-full ps-9 pe-20 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl text-xs outline-none border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute end-12 text-neutral-400 hover:text-neutral-600 text-xs px-1.5 py-1"
                  >
                    <X size={12} />
                  </button>
                )}
                {loading && (
                  <span className="absolute end-4 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Use My Location Quick Action */}
              <button
                onClick={handleUseCurrentLocation}
                className="mt-2.5 w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition-colors"
              >
                <MapPin size={14} className="text-blue-600" />
                <span>{t('استخدم موقعي الحالي (GPS)', 'Use My Current Location (GPS)')}</span>
              </button>
            </div>

            {/* Results Scroll List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {query.trim().length >= 2 ? (
                <>
                  {/* Real Transit Stops from Backend & DB */}
                  {(apiStops.length > 0 || localStationMatches.length > 0) && (
                    <div>
                      <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                        <TrainFront size={13} className="text-red-500" /> {t('محطات النقل الرسمية', 'Official Transit Stops')}
                      </h4>
                      <div className="space-y-1">
                        {/* Verified Local Matches */}
                        {localStationMatches.map(s => (
                          <button
                            key={s.id}
                            onClick={() =>
                              handleChoose({
                                name: lang === 'ar' ? s.name_ar : s.name_en,
                                lat: s.lat,
                                lng: s.lng,
                                stopId: s.id,
                              })
                            }
                            className="w-full text-start p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-neutral-800 border border-transparent hover:border-blue-200 dark:hover:border-neutral-700 flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                                <TrainFront size={15} />
                              </span>
                              <div>
                                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">
                                  {lang === 'ar' ? s.name_ar : s.name_en}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  {lang === 'ar' ? s.zone_ar : s.zone_en} • {s.lines.join(', ')}
                                </p>
                              </div>
                            </div>
                            {s.isInterchange && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md">
                                {t('محطة تبادلية', 'Interchange')}
                              </span>
                            )}
                          </button>
                        ))}

                        {/* Backend API Stops */}
                        {apiStops.map(s => (
                          <button
                            key={s.id}
                            onClick={() =>
                              handleChoose({
                                name: s.name,
                                lat: s.lat,
                                lng: s.lng,
                                stopId: s.stop_id || s.id,
                              })
                            }
                            className="w-full text-start p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-neutral-800 border border-transparent hover:border-blue-200 dark:hover:border-neutral-700 flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                                <MapPin size={15} />
                              </span>
                              <div>
                                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">
                                  {s.name}
                                </p>
                                <p className="text-[10px] text-neutral-400">{s.detail || t('محطة معتمدة', 'Verified stop')}</p>
                              </div>
                            </div>
                            <span className="text-xs text-neutral-400">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Places & Landmarks */}
                  {apiPlaces.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                        <MapPin size={13} className="text-neutral-500" /> {t('أماكن ومعالم على الخريطة', 'Places & Landmarks')}
                      </h4>
                      <div className="space-y-1">
                        {apiPlaces.map(p => (
                          <button
                            key={p.id}
                            onClick={() =>
                              handleChoose({
                                name: p.name,
                                lat: p.lat,
                                lng: p.lng,
                              })
                            }
                            className="w-full text-start p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                                <MapPin size={15} />
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{p.name}</p>
                                <p className="text-[10px] text-neutral-400 truncate max-w-xs">{p.detail}</p>
                              </div>
                            </div>
                            <span className="text-xs text-neutral-400">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {apiStops.length === 0 && localStationMatches.length === 0 && apiPlaces.length === 0 && !loading && (
                    <div className="text-center py-8 text-neutral-400">
                      <Search size={26} className="mx-auto mb-1 text-neutral-300" />
                      <p className="text-xs font-bold">{t('لم يتم العثور على محطات مطابقة', 'No matching stations found')}</p>
                      <p className="text-[11px]">{t('جرب البحث بكلمة أخرى أو تصفح خطوط النقل', 'Try another search keyword or browse transit lines')}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Quick Major Hubs when empty query */
                <div>
                  <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-1">
                    <Star size={13} className="text-amber-500 fill-amber-400" /> {t('أبرز المحطات المركزية الكبرى', 'Major Transit Hubs')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {majorHubs.map(h => (
                      <button
                        key={h.id}
                        onClick={() =>
                          handleChoose({
                            name: lang === 'ar' ? h.name_ar : h.name_en,
                            lat: h.lat,
                            lng: h.lng,
                            stopId: h.id,
                          })
                        }
                        className="text-start p-3 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50 dark:hover:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <TrainFront size={15} className="text-red-500" />
                          <span className="text-xs font-black text-neutral-800 dark:text-white group-hover:text-blue-600 transition-colors">
                            {lang === 'ar' ? h.name_ar : h.name_en}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {lang === 'ar' ? h.zone_ar : h.zone_en} • {t('محطة مركزية', 'Central Hub')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Browse by Transit Lines & Modes */}
        {activeTab === 'modes' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mode selection horizontal chips */}
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max">
                {TRANSIT_LINES.map(line => (
                  <button
                    key={line.id}
                    onClick={() => {
                      setSelectedLineId(line.id)
                      setLineSearch('')
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedLineId === line.id
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                    <span>{lang === 'ar' ? line.name_ar : line.name_en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-search within this line */}
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute start-3 text-neutral-400" />
                <input
                  type="text"
                  value={lineSearch}
                  onChange={e => setLineSearch(e.target.value)}
                  placeholder={t(`بحث في محطات ${lang === 'ar' ? selectedLine.name_ar : selectedLine.name_en}...`, `Filter stations...`)}
                  className="w-full ps-8 pe-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl text-xs outline-none border border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <span className="text-[11px] font-bold text-neutral-400 min-w-max">
                {filteredLineStations.length} {t('محطة', 'stations')}
              </span>
            </div>

            {/* Line Stations List in Order */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredLineStations.map((st, idx) => (
                <button
                  key={st.id}
                  onClick={() =>
                    handleChoose({
                      name: lang === 'ar' ? st.name_ar : st.name_en,
                      lat: st.lat,
                      lng: st.lng,
                      stopId: st.id,
                    })
                  }
                  className="w-full text-start p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-neutral-800 border border-transparent hover:border-blue-200 dark:hover:border-neutral-700 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ backgroundColor: selectedLine.color }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-white group-hover:text-blue-600 transition-colors">
                        {lang === 'ar' ? st.name_ar : st.name_en}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {lang === 'ar' ? st.zone_ar : st.zone_en}
                      </p>
                    </div>
                  </div>

                  {st.isInterchange ? (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ArrowLeftRight size={12} />
                      <span>{t('محطة تبادلية', 'Interchange')}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
