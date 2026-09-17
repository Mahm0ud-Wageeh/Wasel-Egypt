import { useState, useEffect, useRef, useCallback } from 'react'
import type { Screen, Lang } from '../App'
import InteractiveMap from '../components/map/InteractiveMap'
import { ModeIcon } from '../components/icons'
import { useGeolocation } from '../hooks/useGeolocation'
import { useVoiceGuidance } from '../hooks/useVoiceGuidance'
import { getCrowdConsent, setCrowdConsent } from '../api/crowd'
import {
  fetchActiveJourney, fetchJourneyProgress, postJourneyLocation,
  fetchDeviations, fetchRecoveryOptions, generateRecoveryOptions,
  acceptRecoveryOption, completeActiveJourney, cancelActiveJourney,
} from '../api/activeJourneys'
import type { JourneySearchContext } from './PlannerScreen'
import { useJourneyPolyline } from '../hooks/useJourneyPolyline'
import { Volume2, VolumeX, TriangleAlert, CircleCheck, Flag, Radio, RefreshCw, Navigation } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  active: boolean
  activeJourneyId?: number | null
  lastSearch?: JourneySearchContext | null
  onEndJourney?: () => void
  darkMode?: boolean
}

function num(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

export default function JourneyScreen({ lang, t, nav, active, activeJourneyId, lastSearch, onEndJourney, darkMode = false }: Props) {
  if (!active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Navigation size={40} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('لا توجد رحلة قيد التنفيذ حالياً', 'No Active Journey')}</h2>
        <p className="text-sm text-neutral-500 mb-6 max-w-sm">
          {t('خطط رحلتك أولاً ثم ابدأ الملاحة الحية لتتبع مسارك خطوة بخطوة', 'Plan a journey first, then start live navigation to follow your route step-by-step.')}
        </p>
        <button
          onClick={() => nav('planner')}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all text-sm"
        >
          {t('تخطيط رحلة جديدة', 'Plan a New Journey')}
        </button>
      </div>
    )
  }

  if (activeJourneyId != null) {
    return (
      <LiveJourney
        lang={lang} t={t} nav={nav}
        activeJourneyId={activeJourneyId}
        lastSearch={lastSearch ?? null}
        onEndJourney={onEndJourney}
        darkMode={darkMode}
      />
    )
  }

  return <DemoJourney lang={lang} t={t} nav={nav} onEndJourney={onEndJourney} darkMode={darkMode} lastSearch={lastSearch ?? null} />
}

// ── Live tracked journey (real backend) ──────────────────────────────
function LiveJourney({ lang, t, nav, activeJourneyId, lastSearch, onEndJourney, darkMode }: {
  lang: Lang; t: (ar: string, en: string) => string; nav: (s: Screen) => void
  activeJourneyId: number; lastSearch: JourneySearchContext | null
  onEndJourney?: () => void; darkMode?: boolean
}) {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [deviations, setDeviations] = useState<any[]>([])
  const [recoveries, setRecoveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [fallenBack, setFallenBack] = useState(false)
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(getCrowdConsent())
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const geo = useGeolocation(true)

  const refresh = useCallback(async () => {
    try {
      const [snap, prog, devs] = await Promise.all([
        fetchActiveJourney(activeJourneyId),
        fetchJourneyProgress(activeJourneyId).catch(() => null),
        fetchDeviations(activeJourneyId).catch(() => []),
      ])
      setSnapshot(snap)
      setProgress(prog)
      setDeviations(Array.isArray(devs) ? devs : [])
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [activeJourneyId])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  // Crowdsourced ping contribution (explicit consent only)
  const pingRef = useRef(0)
  useEffect(() => {
    if (getCrowdConsent() !== 'granted') return
    const id = setInterval(async () => {
      if (geo.lat == null || geo.lng == null) return
      try {
        pingRef.current += 1
        await postJourneyLocation(activeJourneyId, {
          latitude: geo.lat,
          longitude: geo.lng,
          speed_mps: geo.speed,
          bearing: geo.heading,
          accuracy: geo.accuracy,
        })
      } catch { /* offline queue handles retry server-side via client_seq */ }
    }, 12000)
    return () => clearInterval(id)
  }, [activeJourneyId, geo.lat, geo.lng, geo.speed, geo.heading, geo.accuracy, consent])

  const { muted, toggleMute } = useVoiceGuidance({
    enabled: true,
    language: lang,
    maneuver: null,
    isOffRoute: deviations.length > 0,
  })

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-neutral-50">
        <RefreshCw size={28} className="animate-spin text-blue-600" />
        <p className="text-xs font-bold text-neutral-500">{t('جاري الاتصال بالتتبع الحي…', 'Connecting to live tracking…')}</p>
      </div>
    )
  }

  if (fallenBack || (loadError && !snapshot)) {
    return <DemoJourney lang={lang} t={t} nav={nav} onEndJourney={onEndJourney} darkMode={darkMode} notice={t('تعذر الاتصال بالتتبع الحي — وضع تجريبي على الجهاز.', 'Live tracking unreachable — on-device demo mode.')} />
  }

  const tracking = snapshot?.tracking ?? snapshot?.progress ?? {}
  const legs: any[] = snapshot?.journey?.journeyLegs ?? snapshot?.journey?.legs ?? snapshot?.legs ?? []
  const progressPct = num(pick(progress, ['progress_percent', 'percent', 'progress'])) ?? num(pick(tracking, ['progress_percent', 'percent'])) ?? 0
  const currentLegIdx = num(pick(progress, ['current_leg_index'])) ?? num(pick(tracking, ['current_leg_index']))
  const nextStop = pick(progress, ['next_stop']) ?? pick(tracking, ['next_stop'])
  const nextStopName = typeof nextStop === 'string' ? nextStop : (nextStop?.name ?? '')
  const eta = pick(progress, ['eta', 'estimated_arrival', 'arrival_time']) ?? pick(tracking, ['eta'])
  const status = String(snapshot?.status ?? 'active')

  const polylineResult = useJourneyPolyline(snapshot, lastSearch)
  const routePoints = polylineResult.polyline

  const currentLeg = currentLegIdx != null ? legs[currentLegIdx] : legs[0]
  const currentMode = String(currentLeg?.mode ?? currentLeg?.type ?? 'bus')
  const currentDesc = currentLeg
    ? `${currentLeg?.route?.short_name ?? currentLeg?.route?.long_name ?? ''} ${currentLeg?.from_stop?.name ?? ''} → ${currentLeg?.to_stop?.name ?? ''}`.trim() || currentMode
    : t('على المسار', 'On route')

  const handleComplete = async () => {
    setBusy(true)
    try { await completeActiveJourney(activeJourneyId) } catch { /* still exit locally */ }
    finally { setBusy(false); onEndJourney?.() }
  }
  const handleCancel = async () => {
    setBusy(true)
    try { await cancelActiveJourney(activeJourneyId) } catch { /* ignore */ }
    finally { setBusy(false); nav('home') }
  }
  const handleGenerateRecovery = async () => {
    setBusy(true)
    try {
      const opts = await generateRecoveryOptions(activeJourneyId)
      setRecoveries(opts)
      if (opts.length === 0) {
        const existing = await fetchRecoveryOptions(activeJourneyId)
        setRecoveries(existing)
      }
    } finally { setBusy(false) }
  }
  const handleAcceptRecovery = async (id: number | string) => {
    setBusy(true)
    try {
      await acceptRecoveryOption(activeJourneyId, id)
      await refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden bg-neutral-900">
      <InteractiveMap
        darkMode={darkMode}
        center={[geo.lng || lastSearch?.origin_lng || 31.3023, geo.lat || lastSearch?.origin_lat || 30.0718]}
        zoom={13}
        userLocation={geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy ?? undefined } : null}
        userHeading={geo.heading}
        userSpeed={geo.speed ?? 0}
        activeRoutePoints={routePoints}
        navigationMode
        follow
        lang={lang}
        t={t}
        className="w-full h-full"
      />

      {polylineResult.isEmpty && (
        <div className="absolute top-16 start-4 end-4 z-30 bg-amber-600/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold">
          <span>{t('تعذر رسم خط المسار للرحلة — ما زال بإمكانك متابعة الخطوات أدناه.', 'Unable to draw route polyline — step guidance still active below.')}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                refresh()
                polylineResult.retry()
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('إعادة المحاولة', 'Retry')}
            </button>
            <button
              onClick={() => nav('planner')}
              className="bg-white text-neutral-900 px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('تخطيط جديد', 'New Plan')}
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 start-4 end-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-neutral-800">
              {t('تتبع حي — رحلة حقيقية', 'Live tracking — real journey')}
            </span>
          </div>
          <button
            onClick={toggleMute}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${muted ? 'bg-white/90 text-neutral-500' : 'bg-blue-600 text-white'}`}
            title={muted ? t('تشغيل التوجيه الصوتي', 'Unmute Voice') : t('كتم الصوت', 'Mute Voice')}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <button
          onClick={() => nav('community')}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 pointer-events-auto"
        >
          <Flag size={13} />
          <span>{t('إبلاغ عن عطل', 'Report Alert')}</span>
        </button>
      </div>

      {consent === 'undecided' && (
        <div className="absolute top-16 inset-x-4 z-30">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Radio size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-black text-sm text-neutral-900 mb-0.5">{t('ساهم في المواعيد الحية؟', 'Contribute to live ETAs?')}</h3>
                <p className="text-neutral-500 text-xs mb-3 leading-relaxed">
                  {t('مشاركة موقعك المجهول تساعد الركاب الآخرين بمواعيد حية. تُحفظ كنقاط مجهولة فقط — بدون هوية أو مسار كامل. يمكنك إيقافها anytime.', 'Sharing your anonymous location helps others with live ETAs. Stored as anonymous pings only — no identity or full trace. You can stop anytime.')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCrowdConsent('granted'); setConsent('granted') }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-xl"
                  >
                    {t('أوافق — شارك موقعي', 'Agree — share')}
                  </button>
                  <button
                    onClick={() => { setCrowdConsent('denied'); setConsent('denied') }}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs py-2 rounded-xl"
                  >
                    {t('لا، شكراً', 'No thanks')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deviations.length > 0 && (
        <div className="absolute top-16 inset-x-4 z-30">
          <div className="bg-red-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-white/20">
            <div className="flex items-start gap-3">
              <TriangleAlert size={24} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-black text-sm mb-0.5">{t('انحراف حقيقي عن المسار!', 'Real off-route deviation!')}</h3>
                <p className="text-red-100 text-xs mb-3">
                  {String(deviations[0]?.message ?? deviations[0]?.description ?? t('خرجت عن المسار المخطط.', 'You left the planned route.'))}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateRecovery}
                    disabled={busy}
                    className="flex-1 bg-white text-red-600 hover:bg-red-50 font-bold text-xs py-2 rounded-xl disabled:opacity-60"
                  >
                    {busy ? t('جاري الحساب...', 'Calculating...') : t('بدائل التعافي', 'Recovery options')}
                  </button>
                </div>
                {recoveries.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {recoveries.slice(0, 3).map((r: any, i: number) => (
                      <button
                        key={r.id ?? i}
                        onClick={() => handleAcceptRecovery(r.id)}
                        disabled={busy}
                        className="w-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-2 rounded-xl"
                      >
                        {t('اقبل البديل', 'Accept option')} {r.duration_min != null ? `· ${r.duration_min} ${t('د', 'min')}` : ''} {r.fare_egp != null ? `· ${r.fare_egp} ${t('ج', 'EGP')}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl z-20 transition-all duration-300 ${sheetExpanded ? 'max-h-[85vh] overflow-y-auto' : 'max-h-[38vh]'}`}>
        <button onClick={() => setSheetExpanded(!sheetExpanded)} className="w-full flex justify-center pt-3 pb-1 cursor-pointer">
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </button>

        <div className="px-4 pb-6 pt-1 space-y-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{t('الآن — تتبع حي', 'NOW — LIVE')}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold capitalize">{status}</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <ModeIcon mode={currentMode} size={30} color="white" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-base truncate">{currentDesc}</p>
                {nextStopName && <p className="text-blue-100 text-xs">{t('المحطة القادمة:', 'Next stop:')} {nextStopName}</p>}
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span>{t('التقدم', 'Progress')}</span>
                <span className="font-bold text-sm">{Math.round(progressPct)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
              </div>
              {eta && <p className="text-[11px] mt-1.5 text-blue-100">{t('الوصول المتوقع:', 'ETA:')} {String(eta)}</p>}
            </div>
          </div>

          {sheetExpanded && legs.length > 0 && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <p className="text-xs font-bold text-neutral-400 uppercase">{t('خطوات الرحلة', 'Journey steps')}</p>
              {legs.map((leg: any, i: number) => (
                <div key={i} className={`rounded-xl p-3 flex items-center gap-3 border ${i === currentLegIdx ? 'bg-blue-50 border-blue-200' : 'bg-neutral-50 border-neutral-100'}`}>
                  <ModeIcon mode={String(leg.mode ?? leg.type ?? 'bus')} size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-800 truncate">
                      {leg?.route?.short_name ?? leg?.route?.long_name ?? String(leg.mode ?? leg.type ?? '')}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {leg?.from_stop?.name ?? ''} → {leg?.to_stop?.name ?? ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleComplete}
              disabled={busy}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 active:scale-95 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <CircleCheck size={15} />
              <span>{t('وصلت (إنهاء الرحلة)', 'Arrived (Complete)')}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="border border-neutral-200 hover:bg-neutral-100 disabled:opacity-60 text-neutral-600 font-bold px-3 py-2.5 rounded-xl text-xs"
            >
              {t('إلغاء', 'Cancel')}
            </button>
          </div>

          {loadError && (
            <p className="text-[11px] text-amber-600 text-center">{t('تعذر تحديث البيانات — تُعرض آخر نسخة محفوظة.', 'Could not refresh — showing last saved snapshot.')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── On-device demo fallback (honest simulation, clearly contextual) ──
function DemoJourney({ lang, t, nav, onEndJourney, darkMode = false, notice, lastSearch }: {
  lang: Lang; t: (ar: string, en: string) => string; nav: (s: Screen) => void
  onEndJourney?: () => void; darkMode?: boolean; notice?: string; lastSearch?: JourneySearchContext | null
}) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [deviationAlert, setDeviationAlert] = useState(false)
  const [rerouting, setRerouting] = useState(false)
  const [progressPercent] = useState(42)

  const geo = useGeolocation(true)

  const { muted, toggleMute } = useVoiceGuidance({
    enabled: true,
    language: lang,
    maneuver: {
      instruction_ar: 'استمر في ركوب مترو الخط الثالث حتى محطة عدلي منصور التبادلية',
      instruction_en: 'Continue on Metro Line 3 towards Adly Mansour Interchange',
      distanceMeters: 140,
    },
    isOffRoute: deviationAlert,
  })

  const polylineResult = useJourneyPolyline(null, lastSearch ?? null)
  const routePoints = polylineResult.polyline.length >= 2
    ? polylineResult.polyline
    : [
        { lng: 31.2497, lat: 30.0617 },
        { lng: 31.2825, lat: 30.0712 },
        { lng: 31.3023, lat: 30.0718 },
        { lng: 31.4214, lat: 30.1467 },
        { lng: 31.6025, lat: 30.1342 },
        { lng: 31.7333, lat: 30.0167 },
      ]

  const handleSimulateDeviation = () => {
    geo.setSimulatedLocation(30.0912, 31.2915)
    setDeviationAlert(true)
  }

  const handleReroute = () => {
    setRerouting(true)
    setTimeout(() => {
      setRerouting(false)
      setDeviationAlert(false)
    }, 1200)
  }

  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden bg-neutral-900">
      <InteractiveMap
        darkMode={darkMode}
        center={[lastSearch?.origin_lng || geo.lng || 31.3023, lastSearch?.origin_lat || geo.lat || 30.0718]}
        zoom={13}
        userLocation={geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy ?? undefined } : null}
        userHeading={geo.heading}
        userSpeed={geo.speed ?? 0}
        activeRoutePoints={routePoints}
        navigationMode
        follow
        lang={lang}
        t={t}
        className="w-full h-full"
      />

      <div className="absolute top-4 start-4 end-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-neutral-800">
              {t('وضع تجريبي — سجّل الدخول للتتبع الحي', 'Demo mode — sign in for live tracking')}
            </span>
          </div>
          <button
            onClick={toggleMute}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${muted ? 'bg-white/90 text-neutral-500 hover:bg-white' : 'bg-blue-600 text-white animate-pulse'}`}
            title={muted ? t('تشغيل التوجيه الصوتي', 'Unmute Voice') : t('كتم الصوت', 'Mute Voice')}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        <button
          onClick={() => nav('community')}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 pointer-events-auto transition-all"
        >
          <Flag size={13} />
          <span>{t('إبلاغ عن عطل', 'Report Alert')}</span>
        </button>
      </div>

      {notice && (
        <div className="absolute top-16 inset-x-4 z-20">
          <div className="bg-amber-500/95 text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-md text-center">
            {notice}
          </div>
        </div>
      )}

      {deviationAlert && (
        <div className="absolute top-16 inset-x-4 z-30 animate-bounce" style={notice ? { top: '6.5rem' } : undefined}>
          <div className="bg-red-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-white/20">
            <div className="flex items-start gap-3">
              <TriangleAlert size={24} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-black text-sm mb-0.5">{t('خرجت عن المسار المخطط! (محاكاة)', 'Off Route Detected! (simulated)')}</h3>
                <p className="text-red-100 text-xs mb-3">
                  {t('هذه محاكاة على الجهاز لعرض تجربة التنبيه.', 'This is an on-device simulation of the alert experience.')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReroute}
                    disabled={rerouting}
                    className="flex-1 bg-white text-red-600 hover:bg-red-50 font-bold text-xs py-2 rounded-xl transition-colors shadow-sm"
                  >
                    {rerouting ? t('جاري الحساب...', 'Rerouting...') : t('إعادة التوجيه الآن', 'Reroute Now')}
                  </button>
                  <button
                    onClick={() => setDeviationAlert(false)}
                    className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold text-xs py-2 rounded-xl transition-colors"
                  >
                    {t('تجاهل التنبيه', 'Dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl z-20 transition-all duration-300 ${sheetExpanded ? 'max-h-[85vh] overflow-y-auto' : 'max-h-[38vh]'}`}>
        <button onClick={() => setSheetExpanded(!sheetExpanded)} className="w-full flex justify-center pt-3 pb-1 cursor-pointer">
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </button>

        <div className="px-4 pb-6 pt-1 space-y-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{t('الآن — على المسار (تجريبي)', 'NOW ON BOARD (demo)')}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">٣ {t('محطات متبقية', 'stops left')}</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <ModeIcon mode="metro" size={30} color="white" />
              <div>
                <p className="font-black text-base">{t('الخط ٣ الأخضر — اتجاه عدلي منصور', 'Line 3 Green — Dir. Adly Mansour')}</p>
                <p className="text-blue-100 text-xs">{t('المحطة القادمة: جمال عبد الناصر', 'Next station: Gamal Abdel Nasser')}</p>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span>{t('الوصول المتوقع (ETA)', 'Estimated Arrival')}</span>
                <span className="font-bold text-sm">10:14 AM</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-neutral-100 rounded-2xl p-3.5 flex items-center gap-3 border border-neutral-200">
            <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <ModeIcon mode="transfer" size={19} color="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-neutral-400 uppercase">{t('الخطوة التالية', 'NEXT STEP')}</p>
              <p className="text-xs font-bold text-neutral-800 truncate">{t('تحويلة بمحطة عدلي منصور المركزية', 'Transfer at Adly Mansour Hub')}</p>
              <p className="text-[11px] text-neutral-500">{t('ركوب قطار العاصمة LRT إلى الفنون والثقافة', 'Board Capital LRT to Arts & Culture')}</p>
            </div>
            <span className="text-xs font-bold text-blue-600">+١٤ {t('د', 'm')}</span>
          </div>

          {sheetExpanded && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <p className="text-xs font-bold text-neutral-400 uppercase">{t('بقية خطوات الرحلة', 'Remaining Steps')}</p>
              <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-3 border border-neutral-100">
                <ModeIcon mode="lrt" size={22} />
                <div>
                  <p className="text-xs font-bold text-neutral-800">{t('قطار العاصمة LRT', 'Capital LRT Transit')}</p>
                  <p className="text-[10px] text-neutral-400">{t('١٨ دقيقة • ٤ محطات', '18 minutes • 4 stations')}</p>
                </div>
              </div>
              <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-3 border border-neutral-100">
                <ModeIcon mode="walking" size={22} />
                <div>
                  <p className="text-xs font-bold text-neutral-800">{t('مشي لوجهتك في العاصمة', 'Walk to final destination')}</p>
                  <p className="text-[10px] text-neutral-400">{t('٣ دقائق مشي', '3 minutes walk')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => nav('journey-completed')}
              className="flex-1 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <CircleCheck size={15} />
              <span>{t('وصلت (إنهاء الرحلة)', 'Arrived (Complete)')}</span>
            </button>

            <button
              onClick={handleSimulateDeviation}
              className="flex-1 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              {t('محاكاة انحراف مسار', 'Test Deviation')}
            </button>

            <button
              onClick={() => {
                if (onEndJourney) onEndJourney()
                nav('home')
              }}
              className="border border-neutral-200 hover:bg-neutral-100 text-neutral-600 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors"
            >
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
