import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import { useGeolocation } from '../hooks/useGeolocation'
import { emitMapCommand } from '../map/basemaps'
import { useI18n } from '../i18n/LanguageContext'

/**
 * AI transport assistant — product-level integration.
 *
 * The assistant is a first-class app surface, not a detached chatbot:
 * every reply may carry server-validated UI actions (set_origin,
 * open_route, show_alerts...) which this context executes against the
 * real application. Stop selections flow through the /search page's
 * prefill contract (location.state.prefillStop) so the AI writes into
 * the same planner every other product surface uses. Actions arrive
 * ONLY from the backend whitelist; the client executor additionally
 * guards types/params so no future backend change can drive arbitrary
 * behavior.
 */

export const AiAssistantContext = createContext(null)

// Client-side mirror of the backend whitelist (AiActionValidator).
const CLIENT_ACTIONS = {
  navigate_home: ['home'],
  open_planner: ['home'],
  plan_journey: ['origin', 'destination', 'origin_id', 'destination_id', 'auto_search'],
  set_origin: ['stop_id', 'name', 'latitude', 'longitude'],
  set_destination: ['stop_id', 'name', 'latitude', 'longitude'],
  set_departure_time: ['iso'],
  search_routes: ['query'],
  open_route: ['route_id'],
  open_stop: ['stop_id'],
  open_fare: [],
  show_nearby_transit: [],
  show_alerts: [],
  open_active_journey: [],
  show_saved_journeys: [],
  open_notifications: [],
  open_profile: [],
  switch_map_layer: ['layer'],
  focus_map_location: ['latitude', 'longitude', 'zoom'],
  get_live_eta: [],
  get_next_stop: [],
}

const HISTORY_KEY = 'wasel.ai.history'
const HISTORY_LIMIT = 30

// Shared device position for "stops near me" queries; the geolocation
// hook is mount-safe (no permission prompt until locate() is called).
let devicePosition = null

export function AiAssistantProvider({ children }) {
  const navigate = useNavigate()
  const { language, isRtl, t } = useI18n()
  const geo = useGeolocation()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.slice(-HISTORY_LIMIT) : []
    } catch {
      return []
    }
  })
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // {available, provider}
  const [journeyContext, setJourneyContext] = useState(null)

  // "Near me" questions need a position: request it lazily once the
  // assistant panel is first opened (browser-gated, never forced).
  useEffect(() => {
    if (isOpen && geo.status === 'idle' && !devicePosition) {
      // No-op prompt guard: only auto-locate when the browser already
      // granted permission for this origin (permission query API).
      navigator.permissions?.query?.({ name: 'geolocation' })
        .then((p) => {
          if (p.state === 'granted') geo.locate()
        })
        .catch(() => {})
    }
    if (geo.status === 'granted' && geo.position) {
      devicePosition = geo.position
    }
  }, [isOpen, geo.status, geo.position, geo.locate])

  // Provider status (honest "unavailable" state) — checked on first open.
  useEffect(() => {
    if (status !== null || !isOpen) return
    let active = true
    apiRequest(endpoints.ai.status, { auth: false })
      .then((res) => active && setStatus(res))
      .catch(() => active && setStatus({ available: false, provider: { id: 'unreachable' } }))
    return () => {
      active = false
    }
  }, [isOpen, status])

  useEffect(() => {
    try {
      if (messages.length === 0) {
        localStorage.removeItem(HISTORY_KEY)
      } else {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_LIMIT)))
      }
    } catch {
      /* storage full/private mode — conversation just isn't persisted */
    }
  }, [messages])

  const send = useCallback(async (text) => {
    const trimmed = (text ?? '').trim()
    if (!trimmed || sending) return null
    if (trimmed.length > 2000) return null

    const userMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
    // Window sent to the backend: recent turns + the new message.
    const window = [...messages, userMessage]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, userMessage])
    setSending(true)

    // Direct active navigation telemetry grounding:
    // If navigation is running and the user asks about live telemetry (next stop, ETA, off-route),
    // ground directly from client telemetry state with zero delay or network dependency.
    if (journeyContext) {
      const isAr = language === 'ar' || /[\u0600-\u06FF]/.test(trimmed)
      const isNextStopQuery = /next stop|where.*stop|station|المحطة.*(التالية|القادمة|الجاية)|محطت/i.test(trimmed)
      const isEtaQuery = /eta|time.*left|remaining|how long|arrive|فاضل.*(قد|إيه|ايه)|الوقت.*المتبقي|كم.*(باقي|متبقي|وقت)|متى.*أصل/i.test(trimmed)
      const isDeviationQuery = /off route|deviat|lost|wrong|on track|توهت|تايه|خارج.*المسار|المسار.*الصحيح/i.test(trimmed)

      if (isNextStopQuery) {
        const stopName = journeyContext.nextStop || journeyContext.toStop || 'destination'
        const reply = isAr
          ? `محطتك القادمة هي "${stopName}". أنت في المرحلة ${(journeyContext.currentLegIndex ?? 0) + 1} (${journeyContext.currentLegMode || 'مواصلة'}).`
          : `Your next stop is "${stopName}". You are on leg ${(journeyContext.currentLegIndex ?? 0) + 1} (${journeyContext.currentLegMode || 'transit'}).`
        const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', content: reply, provider: { label: 'Active Navigation Telemetry' } }
        setMessages((prev) => [...prev, assistantMsg])
        setSending(false)
        return { message: assistantMsg, applied: [] }
      }

      if (isEtaQuery) {
        const mins = journeyContext.remainingMinutes ?? '—'
        const pct = journeyContext.progressPercent ?? 0
        const reply = isAr
          ? `الوقت المقدر المتبقي لرحلتك هو حوالي ${mins} دقيقة (${pct}% مكتملة).`
          : `Estimated time remaining for your journey is about ${mins} minutes (${pct}% completed).`
        const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', content: reply, provider: { label: 'Active Navigation Telemetry' } }
        setMessages((prev) => [...prev, assistantMsg])
        setSending(false)
        return { message: assistantMsg, applied: [] }
      }

      if (isDeviationQuery) {
        const reply = journeyContext.isOffRoute || journeyContext.isDeviated
          ? (isAr
              ? 'تنبيه: أنت خارج المسار المحدد حالياً. يمكنك استخدام زر إعادة التوجيه في لوحة الملاحة لتحديث خطتك.'
              : 'Alert: You are currently detected off-route. You can tap Reroute in the navigation HUD to recalculate.')
          : (isAr
              ? 'أنت على المسار الصحيح تماماً وتتبع خطة الرحلة بسلاسة.'
              : 'You are on track and following the planned route smoothly.')
        const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', content: reply, provider: { label: 'Active Navigation Telemetry' } }
        setMessages((prev) => [...prev, assistantMsg])
        setSending(false)
        return { message: assistantMsg, applied: [] }
      }
    }

    try {
      const res = await apiRequest(endpoints.ai.chat, {
        method: 'POST',
        body: {
          messages: window,
          language,
          lat: devicePosition?.lat ?? null,
          lng: devicePosition?.lng ?? null,
          active_journey_id: journeyContext?.journeyId ?? null,
        },
      })

      if (res?.available === false) {
        const unavailable = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: t('ai.unavailable_body'),
          unavailable: true,
        }
        setMessages((prev) => [...prev, unavailable])
        return null
      }

      const assistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res?.reply ?? '',
        provider: res?.provider,
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Execute validated actions immediately after the reply lands.
      const applied = executeActions(res?.actions ?? [], { navigate, t })
      return { message: assistantMessage, applied }
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429')
      const error = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: is429
          ? (language === 'ar' ? 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار دقيقة والمحاولة مجدداً.' : 'Rate limit exceeded. Please wait a minute before sending another request.')
          : t('ai.error_body'),
        isError: true,
      }
      setMessages((prev) => [...prev, error])
      return null
    } finally {
      setSending(false)
    }
  }, [messages, sending, language, navigate, t, journeyContext])

  const clear = useCallback(() => {
    setMessages([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      open: isOpen,
      setOpen: setIsOpen,
      isOpen,
      setIsOpen,
      messages,
      sending,
      status,
      send,
      clear,
      isRtl,
      journeyContext,
      setJourneyContext,
    }),
    [isOpen, messages, sending, status, send, clear, isRtl, journeyContext],
  )

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
}

/** Shape a stop for the /search prefill contract ({lat,lng,name,id}). */
function toPrefillStop(params) {
  if (!params) return null
  const lat = Number(params.latitude ?? params.lat)
  const lng = Number(params.longitude ?? params.lng)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const name = params.name ?? params.query ?? ''
  const id = Number.isFinite(Number(params.stop_id ?? params.id)) ? Number(params.stop_id ?? params.id) : undefined

  if (!hasCoords && !name && !id) return null

  return {
    id,
    name,
    latitude: hasCoords ? lat : undefined,
    longitude: hasCoords ? lng : undefined,
    lat: hasCoords ? lat : undefined,
    lng: hasCoords ? lng : undefined,
  }
}

/**
 * Execute server-validated assistant actions against application state.
 * Double-guarded: unknown types or malformed params are skipped, so the
 * frontend stays safe even if the backend whitelist ever widens.
 */
function executeActions(actions, { navigate }) {
  if (!Array.isArray(actions)) return []

  const applied = []
  // Collect origin/destination so one navigate carries both.
  let originStop = null
  let destinationStop = null
  let autoSubmitFlag = false

  for (const action of actions.slice(0, 4)) {
    const type = action?.type
    const params = action?.params ?? {}
    if (!Object.prototype.hasOwnProperty.call(CLIENT_ACTIONS, type)) continue

    let didApply = false
    switch (type) {
      case 'navigate_home':
        navigate('/home')
        didApply = true
        break
      case 'open_planner':
        didApply = true // handled after the loop (single navigate below)
        break
      case 'plan_journey': {
        const oName = params.origin || ''
        const dName = params.destination || ''
        if (oName) originStop = toPrefillStop({ name: oName, stop_id: params.origin_id })
        if (dName) destinationStop = toPrefillStop({ name: dName, stop_id: params.destination_id })
        autoSubmitFlag = params.auto_search === true || params.auto_search === 'true' || Boolean(originStop && destinationStop)
        didApply = Boolean(originStop || destinationStop)
        break
      }
      case 'set_origin':
        originStop = toPrefillStop(params)
        didApply = originStop !== null
        break
      case 'set_destination':
        destinationStop = toPrefillStop(params)
        didApply = destinationStop !== null
        break
      case 'set_departure_time':
        if (typeof params.iso === 'string' && params.iso) {
          navigate('/search', { state: { aiDeparture: params.iso.slice(0, 16) } })
          didApply = true
        }
        break
      case 'search_routes':
        navigate('/search', { state: { aiQuery: params.query ?? '' } })
        didApply = true
        break
      case 'open_route':
        if (Number.isFinite(Number(params.route_id))) {
          navigate(`/routes/${Number(params.route_id)}`)
          didApply = true
        }
        break
      case 'open_stop':
        if (Number.isFinite(Number(params.stop_id))) {
          navigate('/search', { state: { aiStopId: Number(params.stop_id) } })
          didApply = true
        }
        break
      case 'open_fare':
        navigate('/fares')
        didApply = true
        break
      case 'show_nearby_transit':
        navigate('/search')
        didApply = true
        break
      case 'show_alerts':
        navigate('/home', { state: { scrollTo: 'alerts' } })
        didApply = true
        break
      case 'open_active_journey':
        navigate('/active-journeys')
        didApply = true
        break
      case 'show_saved_journeys':
        navigate('/home', { state: { scrollTo: 'saved' } })
        didApply = true
        break
      case 'open_notifications':
        navigate('/notifications')
        didApply = true
        break
      case 'open_profile':
        navigate('/profile')
        didApply = true
        break
      case 'switch_map_layer':
        if (['satellite', 'streets', 'dark'].includes(params.layer)) {
          emitMapCommand({ type: 'switch_map_layer', layer: params.layer })
          didApply = true
        }
        break
      case 'focus_map_location':
        if (Number.isFinite(Number(params.latitude)) && Number.isFinite(Number(params.longitude))) {
          emitMapCommand({
            type: 'focus_map_location',
            lat: Number(params.latitude),
            lng: Number(params.longitude),
            zoom: Number.isFinite(Number(params.zoom)) ? Number(params.zoom) : undefined,
          })
          didApply = true
        }
        break
      case 'get_live_eta':
      case 'get_next_stop':
        didApply = true
        break
      default:
        break
    }

    if (didApply) applied.push(type)
  }

  // If stop selections were made, land on the planner with them prefilled:
  // prefillStop carries the primary field (destination when both exist) and
  // secondPrefillStop carries the OTHER field, per the /search contract.
  if (originStop || destinationStop) {
    const primaryIsDestination = Boolean(destinationStop)
    const shouldAutoSubmit = autoSubmitFlag || Boolean(originStop && destinationStop)
    navigate('/search', {
      state: {
        prefillStop: primaryIsDestination ? destinationStop : originStop,
        prefillTarget: primaryIsDestination ? 'destination' : 'origin',
        secondPrefillStop: primaryIsDestination ? originStop : destinationStop,
        autoSubmit: shouldAutoSubmit,
      },
    })
  }

  return applied
}

export function useAiAssistant(strict = false) {
  const ctx = useContext(AiAssistantContext)
  if (!ctx && strict) throw new Error('useAiAssistant must be used inside AiAssistantProvider')
  return ctx
}

