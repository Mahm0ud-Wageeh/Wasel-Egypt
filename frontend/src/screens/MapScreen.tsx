import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Screen, Lang } from '../App'
import { EGYPT_STATIONS, Station } from '../data/egyptTransitData'
import { ModeIcon, MODE_COLORS } from '../components/icons'
import InteractiveMap, { NetworkShape } from '../components/map/InteractiveMap'
import { Map as MapIcon, List, Route as RouteIcon, Search, X, ChevronRight, Clock3, RefreshCw, Layers } from 'lucide-react'
import {
  fetchTransitModes, fetchPublicRoutes, fetchRouteDetail, fetchRouteStops, fetchVariantGeometry,
  BackendRoute, BackendTransitMode, BackendVariant, BackendRouteStop,
} from '../api/network'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  onPrefillPlanner?: (from: string, to: string) => void
  darkMode?: boolean
}

type TabType = 'explore' | 'routes' | 'stations'
type ModeFilter = 'all' | 'metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus'

const modeFilters = [
  { id: 'all', ar: 'جميع المحطات', en: 'All Stations' },
  { id: 'metro', ar: 'مترو الأنفاق', en: 'Metro', color: MODE_COLORS.metro },
  { id: 'lrt', ar: 'قطار LRT', en: 'LRT', color: MODE_COLORS.lrt },
  { id: 'monorail', ar: 'المونوريل', en: 'Monorail', color: MODE_COLORS.monorail },
  { id: 'train', ar: 'سكك حديد مصر', en: 'Rail (ENR)', color: MODE_COLORS.train },
  { id: 'brt', ar: 'حافلات BRT', en: 'BRT Express', color: MODE_COLORS.brt },
]

export default function MapScreen({ lang, t, nav, onPrefillPlanner, darkMode = false }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: TabType = rawTab === 'routes' ? 'routes' : rawTab === 'stations' ? 'stations' : 'explore'

  const setTab = useCallback((tab: TabType) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'explore') next.delete('tab')
      else next.set('tab', tab)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const [filter, setFilter] = useState<ModeFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const { shapes: realShapes, loading: loadingShapes } = useRealShapes(activeTab === 'explore' ? filter : null)

  const filteredStations = useMemo(() => {
    return EGYPT_STATIONS.filter(s => {
      const matchesFilter = filter === 'all' || s.modes.includes(filter as any)
      const name = lang === 'ar' ? s.name_ar : s.name_en
      const matchesSearch = search === '' || name.toLowerCase().includes(search.toLowerCase()) || s.zone_ar.includes(search)
      return matchesFilter && matchesSearch
    })
  }, [filter, search, lang])

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-bg-dark text-white' : 'bg-bg-light text-neutral-900'} pb-16`}>
      {/* Top Header & Tabs Bar */}
      <div className={`sticky top-0 z-30 px-4 py-3 border-b shadow-xs transition-colors ${
        darkMode ? 'bg-surface-dark/95 border-border-dark backdrop-blur-md' : 'bg-white/95 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: "'El Messiri', sans-serif" }}>
                {t('خريطة وشبكة النقل الذكية', 'Smart Transit Map & Network')}
              </h1>
              <p className="text-xs text-neutral-500">
                {activeTab === 'routes'
                  ? t('خطوط حقيقية من قاعدة بيانات الشبكة الرسمية', 'Live routes from official transit network database')
                  : activeTab === 'stations'
                  ? `${filteredStations.length} ${t('محطة مسجلة في الدليل', 'stations in directory')}`
                  : `${filteredStations.length} ${t('محطة متاحة على الخريطة التفاعلية', 'stations on interactive map')}`}
              </p>
            </div>

            {/* Segmented Top Tabs */}
            <div className={`flex p-1 rounded-2xl border ${darkMode ? 'bg-bg-dark border-border-dark' : 'bg-neutral-100 border-neutral-200'}`}>
              <button
                onClick={() => setTab('explore')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'explore'
                    ? 'bg-primary text-white shadow-sm'
                    : darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <MapIcon size={14} />
                <span>{t('استكشاف', 'Explore')}</span>
              </button>

              <button
                onClick={() => setTab('routes')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'routes'
                    ? 'bg-primary text-white shadow-sm'
                    : darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <RouteIcon size={14} />
                <span>{t('خطوط حقيقية', 'Real Routes')}</span>
              </button>

              <button
                onClick={() => setTab('stations')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'stations'
                    ? 'bg-primary text-white shadow-sm'
                    : darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <List size={14} />
                <span>{t('محطات', 'Stations')}</span>
              </button>
            </div>
          </div>

          {/* Search bar & mode pills for explore and stations views */}
          {activeTab !== 'routes' && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute start-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('ابحث باسم المحطة: رمسيس، السادات، العاصمة، عدلي منصور...', 'Search station name: Ramses, Sadat, New Capital...')}
                  className={`w-full rounded-2xl ps-9 pe-9 py-2 text-xs font-medium outline-none border transition-all ${
                    darkMode
                      ? 'bg-bg-dark border-border-dark text-white placeholder:text-neutral-500 focus:border-primary'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:bg-white'
                  }`}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute end-3 top-2 text-neutral-400 hover:text-neutral-600" aria-label={t('مسح', 'Clear')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {modeFilters.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setFilter(m.id as ModeFilter)}
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      filter === m.id
                        ? 'bg-navy text-white border-navy shadow-xs'
                        : darkMode
                        ? 'bg-surface-dark text-neutral-300 border-border-dark hover:bg-slate-800'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {m.id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ background: (m as any).color }} />}
                    <span>{lang === 'ar' ? m.ar : m.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {activeTab === 'routes' ? (
          <RoutesExplorer lang={lang} t={t} nav={nav} onPrefillPlanner={onPrefillPlanner} darkMode={darkMode} />
        ) : activeTab === 'explore' ? (
          <div className="space-y-4">
            <div className={`rounded-3xl overflow-hidden border shadow-md h-[60vh] sm:h-[65vh] relative ${
              darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-neutral-200'
            }`}>
              <InteractiveMap
                darkMode={darkMode}
                center={[31.2497, 30.0617]}
                zoom={12}
                lang={lang}
                t={t}
                networkShapes={realShapes}
                hideSchematic={realShapes.length > 0}
                onStationSelect={st => setSelectedStation(st)}
                onPlanFrom={st => {
                  if (onPrefillPlanner) onPrefillPlanner(lang === 'ar' ? st.name_ar : st.name_en, '')
                  nav('planner')
                }}
                onPlanTo={st => {
                  if (onPrefillPlanner) onPrefillPlanner('', lang === 'ar' ? st.name_ar : st.name_en)
                  nav('planner')
                }}
                className="w-full h-full"
              />
              {loadingShapes && (
                <div className="absolute bottom-3 start-3 z-20 bg-navy/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>{t('جاري تحميل المسارات الحقيقية…', 'Loading real route shapes…')}</span>
                </div>
              )}
              {realShapes.length > 0 && !loadingShapes && (
                <div className="absolute bottom-3 start-3 z-20 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md">
                  {realShapes.length} {t('مسار حقيقي مرسوم', 'real drawn routes')}
                </div>
              )}
            </div>

            {selectedStation && (
              <div className={`rounded-2xl p-4 border shadow-md flex items-center justify-between animate-fadeIn ${
                darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-neutral-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">
                      {lang === 'ar' ? selectedStation.name_ar : selectedStation.name_en}
                    </h3>
                    {selectedStation.isInterchange && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded-full">
                        {t('محطة تبادلية', 'Interchange Hub')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">{selectedStation.zone_ar} • {selectedStation.zone_en}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onPrefillPlanner) onPrefillPlanner(lang === 'ar' ? selectedStation.name_ar : selectedStation.name_en, '')
                      nav('planner')
                    }}
                    className="bg-primary hover:bg-primary-hover text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    {t('من هنا', 'From')}
                  </button>
                  <button
                    onClick={() => {
                      if (onPrefillPlanner) onPrefillPlanner('', lang === 'ar' ? selectedStation.name_ar : selectedStation.name_en)
                      nav('planner')
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    {t('إلى هنا', 'To')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStations.map(st => (
              <div
                key={st.id}
                onClick={() => {
                  setSelectedStation(st)
                  setTab('explore')
                }}
                className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:border-primary ${
                  darkMode ? 'bg-surface-dark border-border-dark hover:bg-slate-800' : 'bg-white border-neutral-200 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {lang === 'ar' ? st.name_ar : st.name_en}
                    </span>
                    {st.isInterchange && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded-full">
                        {t('تبادلية', 'Hub')}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-neutral-400" />
                </div>

                <p className="text-xs text-neutral-400 mb-2.5">{st.zone_ar} · {st.zone_en}</p>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex gap-1.5">
                    {st.modes.map((m: any) => (
                      <ModeIcon key={m} mode={m} size={15} />
                    ))}
                  </div>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (onPrefillPlanner) onPrefillPlanner(lang === 'ar' ? st.name_ar : st.name_en, '')
                        nav('planner')
                      }}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {t('من هنا', 'From')}
                    </button>
                    <span className="text-neutral-300">·</span>
                    <button
                      onClick={() => {
                        if (onPrefillPlanner) onPrefillPlanner('', lang === 'ar' ? st.name_ar : st.name_en)
                        nav('planner')
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      {t('إلى هنا', 'To')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function useRealShapes(filter: ModeFilter | null) {
  const [shapes, setShapes] = useState<NetworkShape[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filter) return
    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const res = await fetchPublicRoutes({ per_page: 15 })
        if (cancelled) return
        const routes = res.routes

        const fetchedShapes: NetworkShape[] = []
        for (const r of routes.slice(0, 15)) {
          const detail = await fetchRouteDetail(r.id).catch(() => null)
          if (!detail || !Array.isArray(detail.variants)) continue

          for (const v of detail.variants.slice(0, 1)) {
            const pts = await fetchVariantGeometry(v.id).catch(() => [])
            if (Array.isArray(pts) && pts.length >= 2) {
              const coords: Array<[number, number]> = pts
                .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                .map((p) => [p.lng, p.lat]) // [lng, lat]

              if (coords.length >= 2) {
                const modeStr = r.transit_mode?.code || 'bus'
                fetchedShapes.push({
                  coords,
                  color: r.transit_mode?.color || (MODE_COLORS[modeStr] ?? MODE_COLORS.bus),
                  mode: modeStr,
                  name: r.short_name || r.long_name,
                })
              }
            }
          }
        }
        if (!cancelled) setShapes(fetchedShapes)
      } catch {
        /* fail gracefully */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [filter])

  return { shapes, loading }
}

function RoutesExplorer({ lang, t, nav, onPrefillPlanner, darkMode }: {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  onPrefillPlanner?: (from: string, to: string) => void
  darkMode: boolean
}) {
  const [modes, setModes] = useState<BackendTransitMode[]>([])
  const [selectedModeId, setSelectedModeId] = useState<number | 'all'>('all')
  const [routes, setRoutes] = useState<BackendRoute[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<BackendRoute | null>(null)
  const [_selectedVariant, setSelectedVariant] = useState<BackendVariant | null>(null)
  const [stops, setStops] = useState<BackendRouteStop[]>([])
  const [loadingStops, setLoadingStops] = useState(false)

  useEffect(() => {
    fetchTransitModes().then(setModes).catch(() => {})
  }, [])

  useEffect(() => {
    setLoadingRoutes(true)
    fetchPublicRoutes({
      transit_mode_id: selectedModeId === 'all' ? undefined : selectedModeId,
      per_page: 30,
    })
      .then((res) => setRoutes(res.routes))
      .catch(() => setRoutes([]))
      .finally(() => setLoadingRoutes(false))
  }, [selectedModeId])

  const handleSelectRoute = async (r: BackendRoute) => {
    setSelectedRoute(r)
    setSelectedVariant(null)
    setStops([])
    try {
      const detail = await fetchRouteDetail(r.id)
      if (detail?.variants?.length) {
        setSelectedVariant(detail.variants[0])
        setLoadingStops(true)
        const vStops = await fetchRouteStops(detail.variants[0].id)
        setStops(vStops)
        setLoadingStops(false)
      }
    } catch {
      setLoadingStops(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedModeId('all')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all border ${
            selectedModeId === 'all'
              ? 'bg-navy text-white border-navy'
              : darkMode ? 'bg-surface-dark text-neutral-300 border-border-dark' : 'bg-white text-neutral-600 border-neutral-200'
          }`}
        >
          {t('كل الوسائل', 'All Modes')}
        </button>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedModeId(m.id)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              selectedModeId === m.id
                ? 'bg-navy text-white border-navy'
                : darkMode ? 'bg-surface-dark text-neutral-300 border-border-dark' : 'bg-white text-neutral-600 border-neutral-200'
            }`}
          >
            <ModeIcon mode={m.code} size={13} />
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      {loadingRoutes ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
          <RefreshCw size={22} className="animate-spin text-primary" />
          <p className="text-xs font-medium">{t('جاري تحميل خطوط النقل…', 'Loading transit routes…')}</p>
        </div>
      ) : routes.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center ${darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-neutral-200'}`}>
          <p className="text-xs text-neutral-400">{t('لا توجد خطوط مسجلة لهذه الوسيلة حالياً.', 'No routes found for this mode.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {routes.map(r => {
            const routeName = r.long_name || r.short_name || `${t('خط', 'Route')} ${r.id}`
            const routeShort = r.short_name || String(r.id)
            const modeCode = r.transit_mode?.code || 'bus'
            const routeColor = r.transit_mode?.color || MODE_COLORS[modeCode] || MODE_COLORS.bus

            return (
              <div
                key={r.id}
                onClick={() => handleSelectRoute(r)}
                className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:border-primary ${
                  selectedRoute?.id === r.id
                    ? darkMode ? 'bg-slate-800 border-primary' : 'bg-blue-50/60 border-primary'
                    : darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-black text-white px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: routeColor }}
                    >
                      {routeShort}
                    </span>
                    <span className="text-xs font-bold">{routeName}</span>
                  </div>
                  <ModeIcon mode={modeCode} size={15} />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                  <span>{r.transit_operator?.name || t('هيئة النقل', 'Transit Authority')}</span>
                  <span className="text-primary font-bold">{t('عرض المسار', 'View details')} →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selected Route Stops Modal or Panel */}
      {selectedRoute && (
        <div className={`mt-6 p-4 rounded-3xl border shadow-md ${darkMode ? 'bg-surface-dark border-border-dark' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
            <div>
              <h3 className="font-bold text-sm">{selectedRoute.long_name || selectedRoute.short_name}</h3>
              <p className="text-xs text-neutral-400">{t('محطات ومسار الخط', 'Route stations & stops')}</p>
            </div>
            <button
              onClick={() => setSelectedRoute(null)}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 flex items-center gap-1"
            >
              <X size={13} />
              <span>{t('إغلاق', 'Close')}</span>
            </button>
          </div>

          {loadingStops ? (
            <div className="py-6 flex items-center justify-center gap-2 text-neutral-400 text-xs">
              <RefreshCw size={16} className="animate-spin text-primary" />
              <span>{t('جاري جلب المحطات…', 'Loading stops…')}</span>
            </div>
          ) : stops.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">{t('لا توجد محطات مسجلة لهذا الخط.', 'No stops registered for this route.')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
              {stops.map((st, idx) => (
                <div key={st.id} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-50 dark:border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold">{st.stop_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onPrefillPlanner && st.stop_name) onPrefillPlanner(st.stop_name, '')
                        nav('planner')
                      }}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      {t('انطلق من هنا', 'From')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
