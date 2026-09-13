import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { Card } from '../components/ui/Card'
import { ModeDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'
import { formatDistance } from '../utils/format'
import {
  getActiveJourneyById,
  getJourneyDeviations,
  resumeJourney,
  generateRecoveryOptions,
  listRecoveryOptions,
  acceptRecoveryOption,
  cancelJourney,
} from '../api/activeJourneys'

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

/**
 * Deviation & recovery — an incident state of the Journey Cockpit, never a
 * standalone planner. The map stays dominant (current position + original
 * route + the recovery route once selected) while one panel answers:
 * WHAT WENT WRONG? → WHAT SHOULD I DO NOW? Recovery presents a single clear
 * recommendation; rerouting may compute internal alternatives, but the
 * user-facing guidance stays singular and oriented.
 */
export default function Deviation() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [journey, setJourney] = useState(null)
  const [deviations, setDeviations] = useState([])
  const [recoveryOptions, setRecoveryOptions] = useState([])
  const [selectedRecoveryId, setSelectedRecoveryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Route params arrive as strings; normalize to a stable id for API calls.
  const activeId = paramId != null ? Number(paramId) : (journey?.id ?? null)

  const fetchDeviationData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!paramId) {
        setLoading(false)
        return
      }
      const targetId = paramId
      const [jData, devData, recData] = await Promise.all([
        getActiveJourneyById(targetId),
        getJourneyDeviations(targetId).catch(() => []),
        listRecoveryOptions(targetId).catch(() => []),
      ])
      setJourney(jData)
      const devList = Array.isArray(devData) ? devData : (devData?.data ?? [])
      setDeviations(devList)
      const recList = Array.isArray(recData) ? recData : (recData?.data ?? [])
      setRecoveryOptions(recList)
    } catch (err) {
      setError(err.message || 'Failed to load deviation details.')
    } finally {
      setLoading(false)
    }
  }, [paramId])

  useEffect(() => {
    fetchDeviationData()
  }, [fetchDeviationData])

  const latestDeviation = deviations[0] || null
  const canContinue = latestDeviation?.can_continue ?? true
  const isHighSeverity = latestDeviation?.severity === 'high'

  const handleResume = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await resumeJourney(activeId)
      setSuccess(t('deviation.resumed_toast'))
      setTimeout(() => {
        navigate(`/active-journeys/${activeId}`)
      }, 1200)
    } catch (err) {
      setError(err.message || 'Could not resume journey.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateOptions = async () => {
    setLoadingOptions(true)
    setError(null)
    try {
      const res = await generateRecoveryOptions(activeId, 3)
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setRecoveryOptions(list)
      if (list.length === 0) {
        setError(t('deviation.no_alternatives'))
      }
    } catch (err) {
      setError(err.message || 'Failed to generate recovery options.')
    } finally {
      setLoadingOptions(false)
    }
  }

  const handleAcceptRecovery = async (recoveryId) => {
    setActionLoading(true)
    setError(null)
    try {
      await acceptRecoveryOption(activeId, recoveryId)
      setSuccess(t('deviation.accepted_toast'))
      setTimeout(() => {
        navigate(`/active-journeys/${activeId}`)
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to accept recovery option.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelTrip = async () => {
    if (!window.confirm('Cancel this entire journey?')) return
    setActionLoading(true)
    try {
      await cancelJourney(activeId)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Failed to cancel journey.')
    } finally {
      setActionLoading(false)
    }
  }

  // Recommended recovery = the singular primary suggestion: least delay,
  // then shortest duration. Deterministic — the rider never has to compare.
  const sortedRecovery = useMemo(() => {
    const opts = [...recoveryOptions]
    opts.sort((a, b) => [
      a.estimated_delay_sec ?? 0,
      a.alternative_journey?.total_duration_sec ?? a.alternativeJourney?.total_duration_sec ?? 0,
    ] < [
      b.estimated_delay_sec ?? 0,
      b.alternative_journey?.total_duration_sec ?? b.alternativeJourney?.total_duration_sec ?? 0,
    ] ? -1 : 1)
    return opts
  }, [recoveryOptions])

  // Preselect the recommended option once options arrive (map previews it).
  useEffect(() => {
    if (sortedRecovery.length > 0 && selectedRecoveryId == null) {
      setSelectedRecoveryId(sortedRecovery[0].id)
    }
  }, [sortedRecovery, selectedRecoveryId])

  const originalLegs = journey?.journey?.legs ?? journey?.journey?.journey_legs ?? []
  const selectedRecovery = sortedRecovery.find((o) => o.id === selectedRecoveryId) ?? null
  const recoveryLegsRaw = (() => {
    if (!selectedRecovery) return []
    const alt = selectedRecovery.alternative_journey || selectedRecovery.alternativeJourney || {}
    return alt.legs || alt.journey_legs || alt.journeyLegs || []
  })()

  const normalizeLegs = (rawLegs) => rawLegs.map((leg) => ({
    ...leg,
    from_lat: Number(leg.from_lat),
    from_lng: Number(leg.from_lng),
    to_lat: Number(leg.to_lat),
    to_lng: Number(leg.to_lng),
    geometry: Array.isArray(leg.geometry) ? leg.geometry.map((pt) => [Number(pt[0]), Number(pt[1])]) : null,
  }))

  const originalItinerary = useMemo(() => ({ legs: normalizeLegs(originalLegs) }), [originalLegs])
  const recoveryItinerary = useMemo(
    () => ({ legs: normalizeLegs(recoveryLegsRaw) }),
    [recoveryLegsRaw],
  )

  // Map: current position + original route + the selected recovery route.
  // Before a recovery is selected the original route IS the journey; after,
  // it becomes the dimmed context and the recovery route takes full color.
  const recoveryActive = recoveryLegsRaw.length > 0

  const devPoint = latestDeviation?.latitude != null
    ? { lat: Number(latestDeviation.latitude), lng: Number(latestDeviation.longitude) }
    : null
  const deviationPin = latestDeviation
    ? { lat: Number(latestDeviation.latitude), lng: Number(latestDeviation.longitude), severity: latestDeviation.severity }
    : null

  // Structured incident facts (never raw backend English in RTL UIs).
  const offRouteMeters = (() => {
    const m = /([\d][\d.,]*)\s*m\b/.exec(latestDeviation?.description ?? '')
    return m ? m[1] : null
  })()
  const severityLabel = t(
    latestDeviation?.severity === 'high'
      ? 'deviation.severity_high'
      : latestDeviation?.severity === 'low'
        ? 'deviation.severity_low'
        : 'deviation.severity_medium',
  )
  const typeLabel = latestDeviation?.deviation_type === 'missed_stop'
    ? t('deviation.type_missed_stop')
    : t('deviation.type_off_route')
  const detectedTime = latestDeviation?.occurred_at
    ? new Date(latestDeviation.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  if (loading) {
    return (
      <div className="app-shell__page">
        <Skeleton height={140} />
        <Skeleton height={180} />
        <Skeleton height={100} />
      </div>
    )
  }

  if (!activeId || !journey) {
    return (
      <div className="app-shell__page">
        <Card flat>
          <StateBlock
            icon={<Icon name="detect" size={22} aria-hidden="true" />}
            title={t('deviation.incident')}
            message={t('deviation.subtitle')}
            action={
              <Button size="md" onClick={() => navigate('/home')}>{t('nav.home')}</Button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="app-shell__page app-shell__page--cockpit">
      <div className="cockpit cockpit--deviated">
        {/* ── Map: where am I + original route + recovery route ── */}
        <div className="cockpit__map">
          <MapPanel
            itinerary={recoveryActive ? recoveryItinerary : originalItinerary}
            alternatives={recoveryActive ? [originalItinerary] : []}
            userLocation={devPoint}
            deviation={deviationPin}
            height="100%"
            fitTo="route"
          />

          <div className="cockpit__topbar">
            <button
              type="button"
              className="cockpit__back"
              onClick={() => navigate(`/active-journeys/${activeId}`)}
              aria-label={t('deviation.back_to_journey')}
            >
              <Icon name="arrowLeft" size={17} aria-hidden="true" />
            </button>
            <div className="cockpit__title">
              <span className="t-caption" style={{ color: 'var(--e700)', fontWeight: 700 }}>
                {t('deviation.incident')}
              </span>
              <h1 className="t-h2">Trip #{activeId}</h1>
            </div>
            <span
              className="badge"
              style={{
                background: isHighSeverity ? 'var(--e700)' : 'var(--w800)',
                color: '#fff',
              }}
            >
              {severityLabel}
            </span>
          </div>
        </div>

        {/* ── Incident panel ── */}
        <aside className="cockpit__panel is-expanded" aria-label={t('deviation.incident')}>
          <div className="cockpit__scroll">
            {success && <Alert severity="success" title={t('deviation.incident')}>{success}</Alert>}
            {error && <Alert severity="error" title={t('deviation.incident')}>{error}</Alert>}

            {/* WHAT WENT WRONG — compact incident summary */}
            <div className="cockpit__next cockpit__incident">
              <span className="t-caption" style={{ fontWeight: 700, color: 'var(--e700)' }}>
                {t('deviation.subtitle')}
              </span>
              <b className="cockpit__next-main" style={{ color: 'var(--e700)' }}>
                <Icon name="detect" size={16} aria-hidden="true" />
                {typeLabel}
              </b>
              {offRouteMeters && (
                <span className="t-caption" style={{ fontWeight: 700 }}>
                  {t('deviation.off_route_by').replace('{distance}', `${offRouteMeters} m`)}
                </span>
              )}
              {latestDeviation?.expected_stop?.name && (
                <span className="t-caption">
                  {t('deviation.expected_stop').replace('{stop}', latestDeviation.expected_stop.name)}
                </span>
              )}
              {detectedTime && (
                <span className="t-caption">
                  {t('deviation.detected_at').replace('{time}', detectedTime)}
                </span>
              )}
              <span
                className="t-caption"
                style={{ fontWeight: 700, color: canContinue && !isHighSeverity ? 'var(--s800)' : 'var(--e700)' }}
              >
                {canContinue && !isHighSeverity ? t('deviation.resume_ok') : t('deviation.reroute_required')}
              </span>
              <span className="t-caption" style={{ color: 'var(--p700)', fontWeight: 700 }}>
                {t('deviation.suggest_reroute')}
              </span>
            </div>

            {/* WHAT TO DO NOW — primary action first */}
            <Card flat className="deviation-action">
              <b style={{ fontSize: 13.5 }}>{t('deviation.resume_title')}</b>
              <p className="t-caption" style={{ margin: '4px 0 8px' }}>{t('deviation.resume_hint')}</p>
              <Button
                block
                variant="secondary"
                disabled={!canContinue || isHighSeverity || actionLoading}
                onClick={handleResume}
              >
                {!canContinue || isHighSeverity ? t('deviation.resume_blocked') : t('deviation.resume_action')}
              </Button>
            </Card>

            <Card flat className="deviation-action">
              <div className="row-between">
                <b style={{ fontSize: 13.5 }}>{t('deviation.reroute_title')}</b>
                <Button
                  size="sm"
                  variant="primary"
                  loading={loadingOptions}
                  onClick={handleGenerateOptions}
                >
                  <Icon name="recover" size={14} aria-hidden="true" /> {t('deviation.find_routes')}
                </Button>
              </div>
              <p className="t-caption" style={{ margin: '4px 0 0' }}>{t('deviation.reroute_hint')}</p>
            </Card>

            {sortedRecovery.length === 0 ? (
              <Card flat>
                <StateBlock
                  icon={<Icon name="recover" size={22} aria-hidden="true" />}
                  title={t('deviation.no_routes')}
                  message={t('deviation.no_routes_hint')}
                />
              </Card>
            ) : (
              <div className="stack-sm">
                {sortedRecovery.map((opt, idx) => {
                  const alt = opt.alternative_journey || opt.alternativeJourney || {}
                  const altLegs = alt.legs || alt.journey_legs || alt.journeyLegs || []
                  const delayMins = Math.round((opt.estimated_delay_sec || 0) / 60)
                  const totalMin = Math.round((alt.total_duration_sec || alt.total_duration_seconds || 0) / 60)
                  const isSelected = opt.id === selectedRecoveryId
                  const isRecommended = idx === 0
                  return (
                    <Card
                      key={opt.id || idx}
                      flat
                      className={`recovery-card${isSelected ? ' recovery-card--selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRecoveryId(opt.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRecoveryId(opt.id)
                        }
                      }}
                    >
                      <div className="row-between">
                        <div className="row" style={{ gap: 6 }}>
                          <b style={{ fontSize: 13.5 }}>
                            {isRecommended ? t('results.recommended') : t('deviation.option').replace('{n}', idx + 1)}
                          </b>
                          {delayMins > 0 ? (
                            <span className="badge badge--medium">{t('deviation.delay').replace('{min}', delayMins)}</span>
                          ) : (
                            <span className="badge badge--verified">{t('deviation.on_time')}</span>
                          )}
                        </div>
                      </div>

                      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBlockStart: 6 }}>
                        {altLegs.map((leg, legIdx) => (
                          <span key={legIdx} className="row" style={{ gap: 4 }}>
                            <ModeDot mode={leg.mode || 'bus'} />
                            <span style={{ fontSize: 12 }}>
                              {modeLabel(t, leg.mode)}
                              {legIdx < altLegs.length - 1 && (
                                <Icon name="chevronRight" size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} />
                              )}
                            </span>
                          </span>
                        ))}
                      </div>

                      <div className="row-between" style={{ marginBlockStart: 8 }}>
                        <span className="t-caption">
                          {t('deviation.legs_total')
                            .replace('{legs}', altLegs.length)
                            .replace('{min}', totalMin)}
                          {delayMins > 0 ? '' : ` · ${t('deviation.fastest')}`}
                        </span>
                        <Button
                          size="sm"
                          variant={isRecommended ? 'primary' : 'secondary'}
                          loading={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcceptRecovery(opt.id)
                          }}
                        >
                          {t('deviation.use_route')}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            <Button block variant="danger" loading={actionLoading} onClick={handleCancelTrip}>
              {t('deviation.cancel_journey')}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
