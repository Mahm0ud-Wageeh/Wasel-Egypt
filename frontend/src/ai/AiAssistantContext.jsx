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

const AiAssistantContext = createContext(null)

// Client-side mirror of the backend whitelist (AiActionValidator).
const CLIENT_ACTIONS = {
  navigate_home: ['home'],
  open_planner: ['home'],
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

  const [open, setOpen] = useState(false)
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

  // "Near me" questions need a position: request it lazily once the
  // assistant panel is first opened (browser-gated, never forced).
  useEffect(() => {
    if (open && geo.status === 'idle' && !devicePosition) {
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
  }, [open, geo.status, geo.position, geo.locate])

  // Provider status (honest "unavailable" state) — checked on first open.
  useEffect(() => {
    if (status !== null || !open) return
    let active = true
    apiRequest(endpoints.ai.status, { auth: false })
      .then((res) => active && setStatus(res))
      .catch(() => active && setStatus({ available: false, provider: { id: 'unreachable' } }))
    return () => {
      active = false
    }
  }, [open, status])

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

    try {
      const res = await apiRequest(endpoints.ai.chat, {
        method: 'POST',
        body: {
          messages: window,
          language,
          lat: devicePosition?.lat ?? null,
          lng: devicePosition?.lng ?? null,
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
    } catch {
      const error = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: t('ai.error_body'),
        isError: true,
      }
      setMessages((prev) => [...prev, error])
      return null
    } finally {
      setSending(false)
    }
  }, [messages, sending, language, navigate, t])

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
      open,
      setOpen,
      messages,
      sending,
      status,
      send,
      clear,
      isRtl,
    }),
    [open, messages, sending, status, send, clear, isRtl],
  )

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
}

/** Shape a stop for the /search prefill contract ({lat,lng,name,id}). */
function toPrefillStop(params) {
  const lat = Number(params.latitude)
  const lng = Number(params.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    id: Number.isFinite(Number(params.stop_id)) ? Number(params.stop_id) : undefined,
    name: params.name ?? '',
    lat,
    lng,
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
    navigate('/search', {
      state: {
        prefillStop: primaryIsDestination ? destinationStop : originStop,
        prefillTarget: primaryIsDestination ? 'destination' : 'origin',
        secondPrefillStop: primaryIsDestination ? originStop : destinationStop,
      },
    })
  }

  return applied
}

export function useAiAssistant() {
  const ctx = useContext(AiAssistantContext)
  if (!ctx) throw new Error('useAiAssistant must be used inside AiAssistantProvider')
  return ctx
}

