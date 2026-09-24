import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { useLiveJourneyTracking } from '../hooks/useLiveJourneyTracking'
import { useNavigationEngine } from '../hooks/useNavigationEngine'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'
import { formatDistance, formatDuration } from '../utils/format'
import {
  getActiveJourneys,
  getActiveJourneyById,
  updateJourneyLocation,
  completeJourney,
  cancelJourney,
} from '../api/activeJourneys'
import { trackEvent } from '../utils/analytics'

const PANEL_STORAGE_KEY = 'wasel.cockpit.panel'

const MODE_GLYPH = {
  metro: 'M',
  bus: 'B',
  minibus: 'mi',
  microbus: 'mci',
  rail: 'R',
}

/** Localized mode labels — raw mode ids never surface in the UI. */
const MODE_LABEL_KEYS = {
  walking: 'journey.walk',
  metro: 'landing.metro',
  bus: 'landing.bus',
  rail: 'landing.rail',
  minibus: 'landing.minibus',
  microbus: 'landing.microbus',
}

function modeLabel(t, mode) {
  const key = MODE_LABEL_KEYS[mode]
  if (!key) return mode ?? ''
  const translated = t(key)
  return translated === key ? (mode ?? '') : translated
}

function LegGlyph({ mode }) {
  const glyph = MODE_GLYPH[mode]
  if (glyph) return <>{glyph}</>
  return <Icon name={mode === 'walking' ? 'modeWalking' : 'circleDot'} size={11} aria-hidden="true" />
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function etaMinutes(tracking) {
  // Nearest-stop distance at a typical walk pace — honest, labeled estimate.
  const d = tracking?.nearest_stop?.distance_meters
  if (d == null) return null
  return Math.max(1, Math.round(d / 80))
}

/**
 * Active journey — the map-first Journey Cockpit.
 *
 * The map is the dominant surface; journey details live in one floating
 * panel integrated with it (fixed side panel on desktop, expandable bottom
 * sheet on mobile). The hierarchy is deliberate:
 *   1. the next action, 2. the next stop, 3. progress, 4. what remains,
 *   5. full itinerary context, 6. controls.
 *
 * Progress styling on the map (completed legs dimmed, current leg at full
 * strength, next stop emphasized) is purely cosmetic — camera behavior is
 * governed by the geometry-based fit contract and never reacts to pings.
 */
export default function ActiveJourney() {
  const { t, language } = useI18n()
  const { id: rawParamId } = useParams()
  // Route params arrive as strings; normalize for API calls.
  const paramId = rawParamId != null ? Number(rawParamId) : null
  const navigate = useNavigate()

  const [activeJourney, setActiveJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [gpsSimulating, setGpsSimulating] = useState(false)
  // Journey Cockpit panel: expanded | collapsed | hidden — persisted for the
  // current session. Desktop defaults to expanded; phones to a compact sheet.
  const [panelMode, setPanelMode] = useState(() => {
    try {
      const saved = sessionStorage.getItem(PANEL_STORAGE_KEY)
      if (saved === 'expanded' || saved === 'collapsed' || saved === 'hidden') return saved
      const isDesktop = typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 900px)').matches
        : true // no matchMedia (tests/old engines): assume the desktop cockpit
      return isDesktop ? 'expanded' : 'collapsed'
    } catch {
      return 'expanded'
    }
  })

  useEffect(() => {
    try { sessionStorage.setItem(PANEL_STORAGE_KEY, panelMode) } catch { /* private mode */ }
  }, [panelMode])

  // Live GPS: consent-based device tracking with throttled honest pings.
  const manualOverrideRef = useRef(false)
  const [liveOn, setLiveOn] = useState(false)
  const [followOn, setFollowOn] = useState(false)

  // Auto-live on start when journey is active or rerouted
  useEffect(() => {
    if (activeJourney && !manualOverrideRef.current) {
      if (activeJourney.status === 'active' || activeJourney.status === 'rerouted') {
        setLiveOn(true)
      }
    }
  }, [activeJourney?.id, activeJourney?.status])

  // ── Phase 2: Tunnel mode (driven by the engine) ──
  const [tunnelMode, setTunnelMode] = useState(false)

  // ── Phase 2: Stale fix age ──
  const [fixAgeMs, setFixAgeMs] = useState(null) // ms since last good fix
  const lastGoodFixAtRef = useRef(null)          // wall-clock timestamp of last accepted fix
  const fixAgeTimerRef = useRef(null)
  const lastKnownLocRef = useRef(null)

  const tr = (key, fallback) => {
    const val = t(key)
    return (!val || val === key) ? fallback : val
  }

  const fetchJourney = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (paramId) {
        const data = await getActiveJourneyById(paramId)
        setActiveJourney(data)
      } else {
        const res = await getActiveJourneys({ per_page: 10 })
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        const current =
          list.find((j) => j.status === 'deviated') ||
          list.find((j) => j.status === 'rerouted') ||
          list.find((j) => j.status === 'active')
        setActiveJourney(current || null)
      }
    } catch (err) {
      setError(err.message || 'Could not load active journey tracking.')
    } finally {
      setLoading(false)
    }
  }, [paramId])

  useEffect(() => {
    fetchJourney()
  }, [fetchJourney])

  const postingRef = useRef(false)

  // ── Phase 1: Offline queue poster ──
  // Passes client_seq through verbatim: the queue stamps every entry, and
  // live attempts stamp below — the server dedupes the pair into one row.
  const offlineQueuePoster = useCallback(
    (payload) => {
      if (!activeJourney?.id) return Promise.reject(new Error('no journey'))
      return updateJourneyLocation(activeJourney.id, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed_mps: Number.isFinite(payload.speed) ? payload.speed : 1.4,
        accuracy: payload.accuracy,
        heading: payload.heading,
        recorded_at: payload.recorded_at, // fix-time timestamp — never re-stamped
        ...(Number.isFinite(payload.client_seq) ? { client_seq: payload.client_seq } : {}),
      })
    },
    [activeJourney?.id]
  )

  const offlineQueue = useOfflineQueue({
    journeyId: activeJourney?.id ?? null,
    poster: offlineQueuePoster,
  })

  // Throttled live fixes -> journey API.
  // On network failure: enqueue; on success: ack + drain queue.
  // The seq is allocated BEFORE the live attempt and reused on retry, so a
  // ping that timed out after being recorded collapses into one server row.
  const postFix = useCallback(async (payload) => {
    if (!activeJourney?.id || postingRef.current) return
    postingRef.current = true
    // Phase 2: mark good fix
    lastGoodFixAtRef.current = Date.now()
    setFixAgeMs(0)
    if (tunnelMode) {
      setTunnelMode(false)
      setFollowOn(true) // auto-resume follow on fix
    }
    const seq = offlineQueue.allocateSeq?.() ?? null
    const body = {
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed_mps: Number.isFinite(payload.speed) ? payload.speed : 1.4,
      accuracy: payload.accuracy,
      heading: payload.heading,
      recorded_at: payload.recorded_at ?? new Date().toISOString(),
      ...(seq != null ? { client_seq: seq } : {}),
    }
    try {
      const updated = await updateJourneyLocation(activeJourney.id, body)
      const resultData = updated.data ?? updated
      setActiveJourney(resultData)
      if (resultData.status === 'deviated') {
        navigate(`/active-journeys/${activeJourney.id}/deviation`)
      }
      offlineQueue.notifySuccess()
    } catch (err) {
      // Network/server error: enqueue verbatim payload (original recorded_at)
      // under the SAME seq as the failed live attempt.
      offlineQueue.enqueue({
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: Number.isFinite(payload.speed) ? payload.speed : 1.4,
        accuracy: payload.accuracy,
        heading: payload.heading,
        recorded_at: payload.recorded_at ?? new Date().toISOString(),
      }, seq)
    } finally {
      postingRef.current = false
    }
  }, [activeJourney?.id, navigate, offlineQueue, tunnelMode])

  const live = useLiveJourneyTracking({ enabled: liveOn, postPosition: postFix })

  // Arms follow-me when live tracking goes live
  useEffect(() => {
    if (live.status === 'live') setFollowOn(true)
  }, [live.status])

  // ── Navigation Engine (high-precision GPS + route matching) ──
  // Derived values for the engine must be declared here (before the hook call)
  // because the hook needs itinerary and currentLegIndex.
  const _legs = activeJourney?.journey?.legs ?? activeJourney?.journey?.journey_legs ?? []
  const _tracking = activeJourney?.tracking ?? {}
  const _currentLegIndex = _tracking.current_leg_index ?? activeJourney?.current_leg_index ?? 0

  const navItinerary = useMemo(
    () => ({
      legs: _legs.map((leg) => ({
        ...leg,
        from_lat: Number(leg.from_lat),
        from_lng: Number(leg.from_lng),
        to_lat: Number(leg.to_lat),
        to_lng: Number(leg.to_lng),
        geometry: Array.isArray(leg.geometry) ? leg.geometry.map((p) => [Number(p[0]), Number(p[1])]) : null,
      })),
    }),
    [_legs]
  )

  const navEngine = useNavigationEngine({
    enabled: liveOn,
    itinerary: navItinerary,
    currentLegIndex: _currentLegIndex,
    onLocationUpdate: postFix,
    onDeviationDetected: null,
  })

  // Arms follow-me when navigation engine goes live
  useEffect(() => {
    if (navEngine.status === 'live') setFollowOn(true)
  }, [navEngine.status])

  // ── Phase 2: Tunnel mode — driven by the engine's consecutive-error
  // counter. Counting status transitions here would stall: the status stays
  // 'error' across repeated GPS failures, so this effect would run once.
  useEffect(() => {
    if (navEngine.tunnelMode && !tunnelMode) {
      setTunnelMode(true)
      setFollowOn(false) // pause follow-zoom in tunnel
    }
  }, [navEngine.tunnelMode, tunnelMode])

  // ── Phase 2: Fix-age ticker — updates fixAgeMs every second while stale ──
  useEffect(() => {
    if (navEngine.isStale && lastGoodFixAtRef.current) {
      clearInterval(fixAgeTimerRef.current)
      fixAgeTimerRef.current = setInterval(() => {
        setFixAgeMs(Date.now() - lastGoodFixAtRef.current)
      }, 1000)
    } else {
      clearInterval(fixAgeTimerRef.current)
      fixAgeTimerRef.current = null
      setFixAgeMs(null)
    }
    return () => clearInterval(fixAgeTimerRef.current)
  }, [navEngine.isStale])

  const handleSendLocation = async (lat, lng) => {
    if (!activeJourney) return
    setGpsSimulating(true)
    setError(null)
    // Feed the simulated position into the navigation engine for visual snapping
    navEngine.simulateLocation(lat, lng)
    try {
      const updated = await updateJourneyLocation(activeJourney.id, {
        latitude: lat,
        longitude: lng,
        speed_mps: 1.4,
        recorded_at: new Date().toISOString(),
      })
      const resultData = updated.data ?? updated
      setActiveJourney(resultData)
      if (resultData.status === 'deviated') {
        navigate(`/active-journeys/${activeJourney.id}/deviation`)
      }
    } catch (err) {
      setError(err.message || 'Location update failed.')
    } finally {
      setGpsSimulating(false)
    }
  }

  /**
   * Deviation demo: detection only runs once the rider has boarded a transit
   * leg (a stop event at the boarding stop), so first ping AT the next stop
   * to simulate boarding, then send the off-route position.
   */
  const handleSimulateDeviation = async () => {
    if (!activeJourney) return
    const boardingStop = activeJourney?.tracking?.next_stop
    if (boardingStop?.latitude != null && boardingStop?.longitude != null) {
      await updateJourneyLocation(activeJourney.id, {
        latitude: Number(boardingStop.latitude),
        longitude: Number(boardingStop.longitude),
        speed_mps: 0.5,
        recorded_at: new Date().toISOString(),
      }).catch(() => {})
    }
    await handleSendLocation(30.09, 31.29)
  }

  const handleComplete = async () => {
    if (!window.confirm('Confirm completing this journey?')) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await completeJourney(activeJourney.id)
      trackEvent('journey_completed', { journey_id: activeJourney.id })
      setActiveJourney(res.data ?? res)
      setActionSuccess(tr('journey.completed_toast', 'Journey completed! Great trip.'))
      setTimeout(() => navigate('/home'), 1800)
    } catch (err) {
      setError(err.message || 'Failed to complete journey.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this journey?')) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await cancelJourney(activeJourney.id)
      trackEvent('journey_cancelled', { journey_id: activeJourney.id })
      setActiveJourney(res.data ?? res)
      setActionSuccess(tr('journey.cancelled_toast', 'Journey cancelled.'))
      setTimeout(() => navigate('/home'), 1400)
    } catch (err) {
      setError(err.message || 'Failed to cancel journey.')
    } finally {
      setActionLoading(false)
    }
  }

  const legs = activeJourney?.journey?.legs ?? activeJourney?.journey?.journey_legs ?? []
  const tracking = activeJourney?.tracking ?? {}
  const currentLegIndex = tracking.current_leg_index ?? activeJourney?.current_leg_index ?? 0
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(tracking.progress_percent ?? activeJourney?.current_progress_percent ?? 0))
  )
  const status = activeJourney?.status
  const isDeviated = status === 'deviated'
  const isRerouted = status === 'rerouted'
  const isDone = status === 'completed' || status === 'cancelled'

  useEffect(() => {
    if (activeJourney?.id) {
      trackEvent('journey_started', {
        journey_id: activeJourney.id,
        legs_count: legs.length,
        status: status,
      })
    }
  }, [activeJourney?.id])

  useEffect(() => {
    if (isDeviated) {
      trackEvent('deviation_detected', {
        journey_id: activeJourney?.id,
        severity: tracking?.deviation?.severity,
      })
    }
  }, [isDeviated, activeJourney?.id])

  const currentLeg = legs[currentLegIndex]
  const nextLeg = legs[currentLegIndex + 1]
  const nextStop = tracking?.next_stop
  const eta = etaMinutes(tracking)

  // Honest plan-based remainder: the duration of everything from the current
  // leg onward, clearly a plan estimate — never fabricated precision.
  const remainingMin = useMemo(() => {
    if (!legs.length || isDone) return null
    const total = legs
      .slice(currentLegIndex)
      .reduce((sum, leg) => sum + (Number(leg.duration_sec) || 0), 0)
    return total > 0 ? Math.max(1, Math.round(total / 60)) : null
  }, [legs, currentLegIndex, isDone])

  const lastLeg = legs[legs.length - 1]

  // The live user position: the latest progress ping (recorded locations).
  // Handles both shapes: a progress array (list responses) or the single
  // latest progress object (location-update responses).
  const latestPing = useMemo(() => {
    const raw = activeJourney?.journey_progress ?? activeJourney?.progress ?? null
    if (Array.isArray(raw)) {
      return raw.length > 0 ? raw[raw.length - 1] : null
    }
    if (raw && raw.latitude != null) {
      return raw
    }
    // tracking.nearest_stop carries coordinates too (fallback position).
    const near = activeJourney?.tracking?.nearest_stop
    return near?.latitude != null ? near : null
  }, [activeJourney])

  // Navigation engine snapped position wins → old live position → recorded pings.
  const userLocation = navEngine.visualPosition
    ?? live.position
    ?? (latestPing?.latitude
      ? { lat: Number(latestPing.latitude), lng: Number(latestPing.longitude) }
      : null)
  const userHeading = liveOn
    ? (navEngine.heading ?? live.heading)
    : null
  const userSpeed = navEngine.speed ?? 0

  // Deviation pin from the tracking payload (deviated journeys only).
  const deviationPin = isDeviated && tracking?.deviation
    ? {
        lat: Number(tracking.deviation.latitude ?? latestPing?.latitude ?? 30.0444),
        lng: Number(tracking.deviation.longitude ?? latestPing?.longitude ?? 31.2357),
        severity: tracking.deviation.severity,
      }
    : null

  // Itinerary for the map: saved legs with persisted geometry.
  const itinerary = useMemo(
    () => ({
      legs: legs.map((leg) => ({
        ...leg,
        from_lat: Number(leg.from_lat),
        from_lng: Number(leg.from_lng),
        to_lat: Number(leg.to_lat),
        to_lng: Number(leg.to_lng),
        // persisted [[lat,lng],...] polylines (null on legacy legs)
        geometry: Array.isArray(leg.geometry) ? leg.geometry.map((p) => [Number(p[0]), Number(p[1])]) : null,
      })),
    }),
    [legs]
  )

  // Next-action copy (single source of truth for the cockpit hero):
  // walking → "Walk {distance} to {stop}"; transit → "Next stop: X" with
  // boarding/alighting and a transfer hint when the next leg changes mode.
  const nextAction = useMemo(() => {
    if (!currentLeg) return null
    const legKind = (leg) => leg?.type ?? (leg?.mode === 'walking' ? 'walking' : 'transit')
    if (legKind(currentLeg) === 'walking') {
      return {
        icon: 'modeWalking',
        main: t('cockpit.walk_to')
          .replace('{distance}', formatDistance(currentLeg.distance_meters ?? 0))
          .replace('{stop}', currentLeg.to_stop?.name ?? t('results.destination')),
        sub: null,
      }
    }
    const modeChanged = nextLeg && (nextLeg.type ?? nextLeg.mode) !== (currentLeg.type ?? currentLeg.mode)
    const alightTo = nextStop?.name ?? currentLeg.to_stop?.name
    const nextStopLabel = tr('journey.next_stop', 'Next stop')
    return {
      icon: 'circleDot',
      main: `${nextStopLabel}: ${alightTo ?? '—'}`,
      sub: {
        line: currentLeg.route_variant?.route?.short_name ?? null,
        board: currentLeg.from_stop?.name ?? null,
        alight: currentLeg.to_stop?.name ?? null,
        transferHint: modeChanged ? t('cockpit.transfer_here') : null,
      },
    }
  }, [currentLeg, nextLeg, nextStop, t])

  if (loading) {
    return (
      <div className="app-shell__page">
        <Skeleton height={280} />
        <Skeleton height={120} />
        <Skeleton height={140} />
      </div>
    )
  }

  if (!activeJourney) {
    return (
      <div className="app-shell__page">
        <Card flat>
          <StateBlock
            icon={<Icon name="plan" size={22} aria-hidden="true" />}
            title={t('journey.none_title')}
            message={t('journey.none_body')}
            action={
              <Link to="/search">
                <Button size="md">{t('journey.search_start')}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  // Navigation engine status
  const navActive = navEngine.status === 'live'
  const liveActive = liveOn && (navActive || live.status === 'live')

  // Phase 2: GPS-lost / stale derived state
  // Use navEngine snapped pos > live pos > latest ping
  const currentLoc = navEngine.visualPosition
    ?? live.position
    ?? (latestPing?.latitude ? { lat: Number(latestPing.latitude), lng: Number(latestPing.longitude) } : null)
  if (currentLoc) lastKnownLocRef.current = currentLoc

  const isGpsLost = liveOn && (navEngine.isStale || ((navEngine.status === 'error' || live.status === 'error') && Boolean(lastKnownLocRef.current)))
  const isGpsDenied = liveOn && (navEngine.status === 'denied' || live.status === 'denied')
  // Fresh GPS-less contexts (no geolocation API, e.g. insecure http on a
  // phone, or an engine that never got a fix): honest banner, not silence.
  // 'error' without a last-known position also lands here (isGpsLost needs one).
  const isGpsUnavailable = liveOn && !isGpsDenied && !isGpsLost && (navEngine.status === 'unavailable' || navEngine.status === 'error' || live.status === 'unavailable')

  const fixAgeSec = fixAgeMs != null ? Math.round(fixAgeMs / 1000) : null
  // Show stale banner when fix is >10 s old
  const showStaleBanner = isGpsLost && fixAgeSec != null && fixAgeSec >= 10

  // Navigation HUD data
  const navManeuver = navEngine.routeMatch?.nextManeuver ?? null
  const navOffRoute = navEngine.isOffRoute

  return (
    <div className="app-shell__page app-shell__page--cockpit">
      <div className={`cockpit cockpit--panel-${panelMode}${isDeviated ? ' cockpit--deviated' : ''}${isRerouted ? ' cockpit--rerouted' : ''}`}>
        {/* ── The map is the cockpit ── */}
        <div className="cockpit__map">
          <MapPanel
            itinerary={itinerary}
            userLocation={userLocation}
            deviation={deviationPin}
            stops={nextStop ? [nextStop] : []}
            highlightStop={nextStop?.latitude != null && nextStop?.longitude != null
              ? { lat: Number(nextStop.latitude), lng: Number(nextStop.longitude) }
              : null}
            currentLegIndex={isDone ? null : currentLegIndex}
            userHeading={userHeading}
            userSpeed={userSpeed}
            navigationMode={liveActive && !isDone}
            follow={followOn}
            onFollowInterrupt={() => setFollowOn(false)}
            onRecenter={() => setFollowOn(true)}
            height="100%"
            fitTo="route"
          />

          {/* ── Navigation HUD overlay (maneuver card + off-route) ── */}
          {liveActive && !isDone && (navManeuver || navOffRoute) && (
            <div className="cockpit__nav-overlay">
              {navManeuver && (
                <div className="nav-hud-card" role="status" aria-live="polite">
                  <div className="nav-hud-card__icon">
                    <Icon
                      name={navManeuver.type === 'walking' ? 'modeWalking' : 'circleDot'}
                      size={22}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="nav-hud-card__content">
                    <span className="nav-hud-card__dist">
                      {formatDistance(navManeuver.distanceMeters)}
                    </span>
                    <p className="nav-hud-card__instruction">
                      {navManeuver.instruction}
                    </p>
                    {navManeuver.targetStop && (
                      <span className="nav-hud-card__sub">
                        → {navManeuver.targetStop}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {navOffRoute && (
                <div className="nav-offroute-alert" role="alert">
                  <span>
                    <Icon name="detect" size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                    {t('deviation.off_route_alert')}
                  </span>
                  <button
                    type="button"
                    className="chip on"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => navigate(`/active-journeys/${activeJourney.id}/deviation`)}
                  >
                    {t('deviation.recalculate')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Floating header over the map */}
          <div className="cockpit__topbar">
            <button
              type="button"
              className="cockpit__back"
              onClick={() => navigate('/home')}
              aria-label={t('action.back')}
            >
              <Icon name="arrowLeft" size={17} aria-hidden="true" />
            </button>
            <div className="cockpit__title">
              <span className="t-caption">{t('journey.live')}</span>
              <h1 className="t-h2">Trip #{activeJourney.id}</h1>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {/* one status badge: rerouted state replaces the raw status */}
              <Badge value={isRerouted ? 'rerouted' : status} />
            </div>
          </div>

          {/* Live navigation controls: GPS toggle + follow-me + sync chip */}
          <div className="cockpit__chips">
            <button
              type="button"
              className={`chip${liveActive ? ' on' : ''}`}
              aria-pressed={liveOn}
              disabled={live.status === 'starting' || navEngine.status === 'starting'}
              onClick={() => {
                manualOverrideRef.current = true
                setLiveOn((v) => !v)
              }}
            >
              <Icon name={liveActive ? 'track' : 'locate'} size={13} aria-hidden="true" />
              {liveActive ? t('cockpit.live_on') : t('cockpit.live_tracking')}
            </button>
            {liveActive && (
              <button
                type="button"
                className={`chip${followOn ? ' on' : ''}`}
                aria-pressed={followOn}
                onClick={() => setFollowOn((v) => !v)}
              >
                <Icon name="crosshair" size={13} aria-hidden="true" />
                {followOn ? t('cockpit.follow_me') : t('cockpit.resume_following')}
              </button>
            )}
            {/* Phase 1: Offline sync chip — visible only when relevant */}
            {(offlineQueue.queuedCount > 0 || offlineQueue.syncedCount > 0) && (
              <span
                className="chip"
                aria-live="polite"
                aria-label={
                  language === 'ar'
                    ? `${offlineQueue.syncedCount} متزامن · ${offlineQueue.queuedCount} في الطابور`
                    : `${offlineQueue.syncedCount} synced · ${offlineQueue.queuedCount} queued`
                }
                style={{ fontSize: 11, opacity: 0.85, cursor: 'default' }}
              >
                {language === 'ar'
                  ? `${offlineQueue.syncedCount} متزامن · ${offlineQueue.queuedCount} في الطابور`
                  : `${offlineQueue.syncedCount} synced · ${offlineQueue.queuedCount} queued`}
              </span>
            )}
          </div>

          {/* Deviation: keep the rider oriented, one tap from recovery */}
          {isDeviated && (
            <button
              type="button"
              className="cockpit__deviation-chip"
              onClick={() => navigate(`/active-journeys/${activeJourney.id}/deviation`)}
            >
              <Icon name="detect" size={14} aria-hidden="true" />
              {t('journey.resolve')}
            </button>
          )}
        </div>

        {/* ── Integrated journey panel (side panel / bottom sheet) ── */}
        <aside
          className={`cockpit__panel cockpit__panel--${panelMode}`}
          aria-label={t('results.details')}
        >
          <div className="cockpit__sheet-toggle" role="group">
            <button
              type="button"
              className="cockpit__sheet-toggle__main"
              onClick={() => setPanelMode((m) => (m === 'expanded' ? 'collapsed' : 'expanded'))}
              aria-expanded={panelMode === 'expanded'}
            >
              <span className="cockpit__sheet-bar" aria-hidden="true" />
              <span className="t-caption" style={{ fontWeight: 700 }}>
                {panelMode === 'collapsed' ? t('cockpit.show_details') : t('cockpit.hide_details')}
              </span>
              <Icon
                name="chevronDown"
                size={15}
                aria-hidden="true"
                style={{ transform: panelMode === 'collapsed' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>
            {panelMode === 'expanded' && (
              <button
                type="button"
                className="cockpit__panel-close"
                onClick={() => setPanelMode('hidden')}
                aria-label={t('cockpit.panel_hide')}
              >
                <Icon name="close" size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="cockpit__scroll">
            {actionSuccess && <Alert severity="success" title="Success">{actionSuccess}</Alert>}
            {error && <Alert severity="error" title="Tracking Notice">{error}</Alert>}

            {/* Phase 2: GPS denied banner */}
            {isGpsDenied && (
              <Alert severity="warning" title={language === 'ar' ? 'تم رفض إذن الموقع' : 'Location permission was denied'}>
                {language === 'ar'
                  ? 'يرجى السماح بالوصول من إعدادات المتصفح ثم اضغط إعادة محاولة'
                  : 'Allow location access in your browser settings, then tap Retry.'}
                <button
                  type="button"
                  className="chip on"
                  style={{ marginInlineStart: 8, fontSize: 11, padding: '3px 8px' }}
                  onClick={() => navEngine.retry?.()}
                  aria-label={language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                >
                  {language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                </button>
              </Alert>
            )}

            {/* GPS unavailable banner (no geolocation API / never got a fix) */}
            {isGpsUnavailable && (
              <Alert severity="warning" title={t('cockpit.gps_denied_title')}>
                {t('cockpit.gps_unavailable')}
                <button
                  type="button"
                  className="chip on"
                  style={{ marginInlineStart: 8, fontSize: 11, padding: '3px 8px' }}
                  onClick={() => navEngine.retry?.()}
                  aria-label={language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                >
                  {language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                </button>
              </Alert>
            )}

            {/* Phase 2: GPS lost / stale banner (>10 s since last fix) */}
            {isGpsLost && !isGpsDenied && (
              <Alert severity="warning" title={language === 'ar' ? 'إشارة GPS ضعيفة' : 'GPS signal lost · Last known position retained'}>
                {showStaleBanner
                  ? (language === 'ar'
                    ? `آخر إشارة منذ ${fixAgeSec} ثانية — تثبيت الموقع الأخير`
                    : `Last fix ${fixAgeSec}s ago — holding position`)
                  : (language === 'ar' ? 'تثبيت آخر موقع معروف' : 'Holding last known position')}
                <button
                  type="button"
                  className="chip on"
                  style={{ marginInlineStart: 8, fontSize: 11, padding: '3px 8px' }}
                  onClick={() => navEngine.retry?.()}
                  aria-label={language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                >
                  {language === 'ar' ? 'إعادة محاولة' : 'Retry'}
                </button>
              </Alert>
            )}

            {/* Phase 2: Tunnel mode toast */}
            {tunnelMode && liveOn && (
              <Alert severity="warning" title={language === 'ar' ? 'وضع النفق' : 'Tunnel mode — GPS paused'}>
                {language === 'ar'
                  ? 'فقدنا إشارة GPS بسبب النفق. تتابع الخريطة معطّل — سيستأنف تلقائياً عند استعادة الإشارة.'
                  : 'Lost GPS signal in tunnel. Map follow paused — will resume automatically on signal.'}
              </Alert>
            )}

            {isDeviated && (
              <Alert
                severity="error"
                title={tr('journey.deviated_title', 'Deviation Detected')}
              >
                <div>
                  <p>{tracking?.deviation?.description || tr('journey.deviated_body', 'Off-route deviation detected.')}</p>
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/active-journeys/${activeJourney.id}/deviation`)}
                    >
                      Reroute now
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {}}
                    >
                      Keep plan
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            {isRerouted && (
              <Alert severity="warning" title={t('journey.rerouted_title')}>
                {t('journey.rerouted_body')}
              </Alert>
            )}

            {/* 1 — NOW / NEXT / LATER (THEN) Navigation Hierarchy */}
            <div className="cockpit__hierarchy" aria-live="polite">
              {/* NOW: What am I doing right now? */}
              <div className="cockpit__step cockpit__step--now" style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--rad-sm)', border: '1.5px solid var(--p600)', marginBottom: 8 }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="badge b-active" style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {t('cockpit.now')}
                  </span>
                  <span className="t-caption" style={{ fontWeight: 700, color: 'var(--p700)' }}>
                    {currentLeg ? `${currentLegIndex + 1}/${legs.length}` : '—'}
                  </span>
                </div>
                {nextAction ? (
                  <>
                    <b className="cockpit__next-main" style={{ fontSize: 14 }}>
                      <Icon name={nextAction.icon} size={16} aria-hidden="true" />
                      {nextAction.main}
                    </b>
                    {nextAction.sub && (
                      <div className="cockpit__next-sub" style={{ marginTop: 4 }}>
                        <span className="row" style={{ gap: 6 }}>
                          <ModeDot mode={currentLeg?.mode ?? 'walking'} />
                          <b style={{ fontSize: 12.5 }}>
                            {currentLeg?.route_variant?.route?.short_name
                              ? `Line ${currentLeg.route_variant.route.short_name}`
                              : modeLabel(t, currentLeg?.mode)}
                          </b>
                        </span>
                        {nextAction.sub.board && (
                          <span className="t-caption" style={{ fontSize: 11.5 }}>
                            {t('cockpit.board_at').replace('{stop}', nextAction.sub.board)}
                            {' → '}
                            {t('cockpit.alight_at').replace('{stop}', nextAction.sub.alight ?? '—')}
                          </span>
                        )}
                        {nextAction.sub.transferHint && (
                          <span className="badge b-rerouted" style={{ marginTop: 3 }}>
                            <Icon name="recover" size={11} aria-hidden="true" /> {nextAction.sub.transferHint}
                            {nextLeg?.route_variant?.route?.short_name
                              ? ` · ${nextLeg.route_variant.route.short_name}`
                              : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <b className="cockpit__next-main">—</b>
                )}
                {eta != null && (
                  <span className="chip on" style={{ marginTop: 6, display: 'inline-flex', fontSize: 11 }}>
                    ≈ {eta} {t('journey.min_walk')}
                  </span>
                )}
              </div>

              {/* NEXT: What happens next? */}
              {nextLeg && (
                <div className="cockpit__step cockpit__step--next" style={{ padding: '8px 12px', background: 'var(--sand)', borderRadius: 'var(--rad-sm)', border: '1px solid var(--line)', marginBottom: 6 }}>
                  <div className="row-between" style={{ marginBottom: 2 }}>
                    <span className="badge b-rerouted" style={{ fontSize: 10 }}>
                      {t('cockpit.next')}
                    </span>
                    <span className="t-caption" style={{ fontSize: 11, color: 'var(--ink700)' }}>
                      Leg {currentLegIndex + 2}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                    <Icon name={nextLeg.type === 'walking' ? 'modeWalking' : 'navigate'} size={14} aria-hidden="true" />
                    <b style={{ fontSize: 12.5 }}>
                      {nextLeg.type === 'walking'
                        ? `${t('journey.walk')} ${formatDistance(nextLeg.distance_meters)} → ${nextLeg.to_stop?.name ?? t('results.destination')}`
                        : `${t('cockpit.board_at').replace('{stop}', nextLeg.from_stop?.name ?? '—')} (${nextLeg.route_variant?.route?.short_name ? `Line ${nextLeg.route_variant.route.short_name}` : modeLabel(t, nextLeg.mode)})`}
                    </b>
                  </div>
                </div>
              )}

              {/* THEN / LATER: What remains? */}
              {legs.length > currentLegIndex + 2 && (
                <div className="cockpit__step cockpit__step--later" style={{ padding: '6px 12px', background: 'var(--bg)', borderRadius: 'var(--rad-sm)', border: '1px dashed var(--line)' }}>
                  <div className="row-between">
                    <span className="badge" style={{ fontSize: 9.5 }}>{t('cockpit.later')}</span>
                    <span className="t-caption" style={{ fontSize: 11.5, color: 'var(--ink700)' }}>
                      {lastLeg?.to_stop?.name ? `${t('results.arrive')} ${lastLeg.to_stop.name}` : t('results.destination')}
                      {remainingMin != null ? ` · ≈ ${remainingMin} min` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2 — progress: where am I, how much is left */}
            <div className="cockpit__progress">
              <div className="row-between" style={{ marginBottom: 4 }}>
                <span className="t-caption">{t('journey.progress')}</span>
                <b className="t-num" style={{ fontSize: 15, color: isDeviated ? 'var(--e700)' : 'var(--p600)' }}>
                  {progressPercent}%
                </b>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Journey progress"
                style={{ height: 8, background: 'var(--p100)', borderRadius: 4, overflow: 'hidden' }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isDeviated ? 'var(--e700)' : 'var(--p600)',
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div className="cockpit__stats">
                <span className="t-caption" style={{ fontWeight: 700 }}>
                  {currentLeg ? `Leg ${currentLegIndex + 1} / ${legs.length}` : '—'}
                </span>
                {remainingMin != null && (
                  <span className="t-caption">{t('cockpit.remaining_min').replace('{min}', remainingMin)}</span>
                )}
                {lastLeg?.arrival_time && (
                  <span className="t-caption">
                    {t('cockpit.arrive_at').replace('{time}', formatTime(lastLeg.arrival_time))}
                  </span>
                )}
                <span className="t-caption">
                  {formatTime(activeJourney.started_at ? activeJourney.started_at : null)}
                  {activeJourney.started_at ? ` · ${t('journey.live')}` : ''}
                </span>
              </div>
            </div>

            {/* 3 — full itinerary context + controls (collapsible on phones) */}
            <div className="cockpit__extra">
              {legs.length > 0 && (
                <Card flat>
                  <div className="row-between" style={{ marginBottom: 10 }}>
                    <b style={{ fontSize: 14 }}>{tr('journey.itinerary', 'Itinerary')}</b>
                    <span className="t-caption">
                      {legs.length} legs{activeJourney.started_at ? ` · ${t('journey.started_at').replace('{time}', formatTime(activeJourney.started_at))}` : ''}
                    </span>
                  </div>
                  <div className="route-timeline">
                    {legs.map((leg, index) => {
                      const isCurrent = index === currentLegIndex && !isDone
                      const isPast = index < currentLegIndex
                      return (
                        <div
                          key={leg.id || index}
                          className={`tl-leg tl-leg--${leg.mode}${isCurrent ? ' tl-leg--current' : ''}${isPast ? ' tl-leg--done' : ''}`}
                        >
                          <span className="tl-leg__dot" aria-hidden>
                            <LegGlyph mode={leg.mode} />
                          </span>
                          <div className="row-between">
                            <div>
                              <b style={{ fontSize: 13 }}>
                                {modeLabel(t, leg.mode)}
                                {leg.route_variant?.route?.short_name ? ` · ${leg.route_variant.route.short_name}` : ''}
                              </b>
                              <div className="t-caption">
                                {leg.from_stop?.name || t('results.origin')} → {leg.to_stop?.name || t('results.destination')}
                              </div>
                              {isCurrent && (
                                <span className="badge b-active" style={{ marginTop: 4 }}>{t('journey.in_progress')}</span>
                              )}
                              {!leg.geometry && (
                                <span
                                  className="badge"
                                  title="Route shape not available — straight-line shown for reference"
                                  style={{ marginTop: 3, fontSize: 9.5, opacity: 0.75 }}
                                >
                                  Straight-line estimate
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="t-caption t-num">{formatDuration(leg.duration_sec)}</div>
                              <div className="t-caption">{formatTime(leg.departure_time)} → {formatTime(leg.arrival_time)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* GPS simulation (demo tool) */}
              {!isDone && (
                <Card flat style={{ background: 'var(--sand)', border: '1px solid var(--a100)' }}>
                  <b style={{ fontSize: 13.5, color: 'var(--a800)', display: 'block', marginBottom: 6 }}>
                    {t('journey.gps_demo')}
                  </b>
                  <p className="t-caption" style={{ marginBottom: 10 }}>
                    {t('journey.gps_hint')}
                  </p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={gpsSimulating}
                      aria-label="Ping on-route GPS"
                      onClick={() =>
                        userLocation
                          ? handleSendLocation(userLocation.lat + 0.002, userLocation.lng + 0.002)
                          : handleSendLocation(30.0423, 31.2315)
                      }
                    >
                      {tr('journey.ping_on', 'Ping on-route GPS')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={gpsSimulating}
                      onClick={handleSimulateDeviation}
                    >
                      {t('journey.sim_deviation')}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Actions */}
              {!isDone && (
                <div className="row" style={{ gap: 10 }}>
                  <Button block variant="primary" loading={actionLoading} onClick={handleComplete}>
                    {tr('journey.complete', 'Complete journey')}
                  </Button>
                  <Button block variant="danger" loading={actionLoading} onClick={handleCancel}>
                    {tr('journey.cancel_trip', 'Cancel trip')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Hidden panel -> floating reopen (never resets the camera) */}
        {panelMode === 'hidden' && (
          <button
            type="button"
            className="cockpit__reopen chip on"
            onClick={() => setPanelMode('expanded')}
            aria-label={t('cockpit.panel_show')}
          >
            <Icon name="recover" size={14} aria-hidden="true" />
            {t('cockpit.panel_show')}
          </button>
        )}
      </div>
    </div>
  )
}
