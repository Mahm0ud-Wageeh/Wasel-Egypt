import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/MapPanel'
import {
  getActiveJourneys,
  getActiveJourneyById,
  updateJourneyLocation,
  completeJourney,
  cancelJourney,
} from '../api/activeJourneys'

const MODE_GLYPH = {
  metro: 'M',
  bus: 'B',
  minibus: 'mi',
  microbus: 'mci',
  rail: 'R',
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
 * Active journey — the flagship live-tracking screen.
 *
 * Full route map with the live user marker, current leg, next stop, ETA,
 * progress, deviation/rerouted states, GPS simulation for demos, and a
 * responsive timeline of the whole itinerary.
 */
export default function ActiveJourney() {
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

  const handleSendLocation = async (lat, lng) => {
    if (!activeJourney) return
    setGpsSimulating(true)
    setError(null)
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
      setActiveJourney(res.data ?? res)
      setActionSuccess('Journey completed! Great trip.')
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
      setActiveJourney(res.data ?? res)
      setActionSuccess('Journey cancelled.')
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

  const currentLeg = legs[currentLegIndex]
  const nextStop = tracking?.next_stop
  const eta = etaMinutes(tracking)

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

  const userLocation = latestPing?.latitude
    ? { lat: Number(latestPing.latitude), lng: Number(latestPing.longitude) }
    : null

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
            title="No Active Journey"
            message="You don't have any in-progress journeys right now. Plan a trip to start live tracking!"
            action={
              <Link to="/search">
                <Button size="md">Search & Start Journey</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="app-shell__page">
      {/* Header */}
      <div className="row-between">
        <div>
          <span className="t-caption">Live journey</span>
          <h1 className="t-h2" style={{ margin: 0, color: 'var(--p900)' }}>
            Trip #{activeJourney.id}
          </h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {isRerouted && <Badge value="rerouted" />}
          <Badge value={status} />
        </div>
      </div>

      {actionSuccess && <Alert severity="success" title="Success">{actionSuccess}</Alert>}
      {error && <Alert severity="error" title="Tracking Notice">{error}</Alert>}

      {isDeviated && (
        <Alert
          severity="error"
          title="Deviation detected"
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/active-journeys/${activeJourney.id}/deviation`)}
            >
              View recovery options
            </Button>
          }
        >
          You appear to be off-route. Wasel has recovery alternatives ready.
        </Alert>
      )}

      {isRerouted && (
        <Alert severity="warning" title="Following your new route">
          This trip was recovered with a new plan — follow the updated itinerary below.
        </Alert>
      )}

      {/* Live status strip */}
      <Card flat style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: '1 1 150px', minWidth: 130 }}>
          <div className="t-caption">Next stop</div>
          <b style={{ fontSize: 15 }}>
            {nextStop?.name ?? (currentLeg ? 'Approaching destination' : '—')}
          </b>
          {eta != null && (
            <div className="t-caption" style={{ color: 'var(--p600)' }}>
              ≈ {eta} min walk away
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 130px', minWidth: 120 }}>
          <div className="t-caption">Current leg</div>
          <div className="row" style={{ gap: 6 }}>
            <ModeDot mode={currentLeg?.mode ?? 'walking'} />
            <b style={{ fontSize: 14 }}>{currentLeg ? `Leg ${currentLegIndex + 1} / ${legs.length}` : '—'}</b>
          </div>
        </div>
        <div style={{ flex: '2 1 200px' }}>
          <div className="row-between" style={{ marginBottom: 4 }}>
            <span className="t-caption">Progress</span>
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
        </div>
      </Card>

      {/* Live map — the centerpiece */}
      <div className="active-journey-map">
        <MapPanel
          itinerary={itinerary}
          userLocation={userLocation}
          deviation={deviationPin}
          stops={nextStop ? [nextStop] : []}
          height="100%"
          fitTo={userLocation ? 'route' : 'route'}
        />
        {nextStop && (
          <div
            className="next-stop-pill"
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              background: 'var(--surface)',
              borderRadius: 999,
              boxShadow: 'var(--sh-md)',
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Icon name="chevronRight" size={12} aria-hidden="true" />
            Next: {nextStop.name}
            {eta != null && <span className="t-caption" style={{ fontWeight: 600 }}>· {eta} min</span>}
          </div>
        )}
      </div>

      {/* Itinerary timeline */}
      {legs.length > 0 && (
        <Card flat>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>Itinerary</b>
            <span className="t-caption">
              {legs.length} legs · started {formatTime(activeJourney.started_at)}
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
                        {leg.mode === 'walking' ? 'Walk' : leg.mode}
                        {leg.route_variant?.route?.short_name ? ` · ${leg.route_variant.route.short_name}` : ''}
                      </b>
                      <div className="t-caption">
                        {leg.from_stop?.name || 'Origin'} → {leg.to_stop?.name || 'Destination'}
                      </div>
                      {isCurrent && (
                        <span className="badge b-active" style={{ marginTop: 4 }}>In progress</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="t-caption t-num">{Math.round((leg.duration_sec || 0) / 60)} min</div>
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
          <b style={{ fontSize: 13.5, color: 'var(--a600)', display: 'block', marginBottom: 6 }}>
            GPS simulation (demo)
          </b>
          <p className="t-caption" style={{ marginBottom: 10 }}>
            Send a location ping along the route — or off it — to drive live tracking and recovery:
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              loading={gpsSimulating}
              onClick={() =>
                userLocation
                  ? handleSendLocation(userLocation.lat + 0.002, userLocation.lng + 0.002)
                  : handleSendLocation(30.0423, 31.2315)
              }
            >
              Ping on-route GPS
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={gpsSimulating}
              onClick={handleSimulateDeviation}
            >
              Simulate deviation
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          <Button block variant="primary" loading={actionLoading} onClick={handleComplete}>
            Complete journey
          </Button>
          <Button block variant="danger" loading={actionLoading} onClick={handleCancel}>
            Cancel trip
          </Button>
        </div>
      )}
    </div>
  )
}
