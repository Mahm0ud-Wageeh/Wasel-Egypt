import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useJourneyContext } from '../contexts/JourneyContext'
import { useI18n } from '../i18n/LanguageContext'
import { saveJourney, startSavedJourney } from '../api/journeys'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ModeDot, Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'

function formatDuration(sec) {
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${m} m`
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const MODE_LABEL_KEYS = {
  walking: 'journey.walk',
  metro: 'landing.metro',
  bus: 'landing.bus',
  rail: 'landing.rail',
  minibus: 'landing.minibus',
  microbus: 'landing.microbus',
}

/** Product-meaning lucide icon per transit mode. */
const MODE_ICONS = {
  walking: 'modeWalking',
  metro: 'modeMetro',
  bus: 'modeBus',
  rail: 'modeRail',
  minibus: 'modeMinibus',
  microbus: 'modeMicrobus',
}

const legColor = (leg) => (leg.type === 'walking' ? 'var(--mode-walking)' : `var(--mode-${leg.mode})` ?? 'var(--p600)')

/**
 * Compact horizontal route strip: Origin → walk → transit → transfer →
 * … → Destination, using semantic SVG icons (spec: no emoji iconography).
 */
function RouteStrip({ option }) {
  const { t } = useI18n()
  // Resolve the mode label through i18n; fall back to the raw mode id
  // when no dictionary entry exists (never render a raw key).
  const modeLabel = (mode) => {
    const key = MODE_LABEL_KEYS[mode]
    if (!key) return mode ?? ''
    const translated = t(key)
    return translated === key ? (mode ?? '') : translated
  }
  const nodes = []

  nodes.push({ key: 'origin', icon: 'pin', color: 'var(--p600)', label: t('results.origin') });
  (option.legs ?? []).forEach((leg, idx) => {
    const prev = option.legs[idx - 1]
    if (prev && prev.to_stop?.id !== leg.from_stop?.id) {
      nodes.push({ key: `xfer-${idx}`, icon: 'recover', color: 'var(--ink500)', label: t('results.transfer_walk') })
    }
    nodes.push({
      key: `leg-${idx}`,
      icon: leg.type === 'walking' ? 'modeWalking' : (MODE_ICONS[leg.mode] ?? 'navigate'),
      color: legColor(leg),
      label: leg.type === 'walking' ? `${t('journey.walk')} ${formatDistance(leg.distance_meters)}` : `${modeLabel(leg.mode)} · ${leg.route?.short_name ?? leg.route?.long_name ?? ''}`,
    })
  })
  nodes.push({ key: 'dest', icon: 'navigate', color: 'var(--a600)', label: t('results.destination') })

  return (
    <div className="routestrip" role="img" aria-label={`Route: ${nodes.map((n) => n.label).join(' → ')}`}>
      {nodes.map((n, i) => (
        <span key={n.key} className="routestrip__cell">
          {i > 0 && <span className="routestrip__line" aria-hidden="true" />}
          <span className="routestrip__node" title={n.label} style={{ color: n.color }}>
            <Icon name={n.icon} size={14} aria-hidden="true" />
          </span>
        </span>
      ))}
    </div>
  )
}

/** Use API metadata only; unknown dates never inherit a date from the source ID. */
function FareAttribution({ fare }) {
  const { t, language } = useI18n()
  if (fare?.amount == null || typeof fare.source !== 'string'
    || !/^tfc_metro_fares(?:_\d{4})?$/.test(fare.source)) return null

  const hasDate = typeof fare.as_of === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(fare.as_of)
  // Only the identified Mobility Database source receives that specific credit.
  const key = fare.source === 'tfc_metro_fares_2024'
    ? (hasDate ? 'journey.fare_attribution_metro' : 'journey.fare_attribution_metro_undated')
    : (hasDate ? 'journey.fare_attribution_tfc_dated' : 'journey.fare_attribution_tfc')
  const date = hasDate ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${fare.as_of}-01T00:00:00Z`)) : null

  return (
    <small className="t-caption" style={{ display: 'block', marginBlockStart: 4, color: 'var(--ink500)', textAlign: 'start', overflowWrap: 'anywhere' }}>
      {hasDate ? t(key).replace('{date}', date) : t(key)}
    </small>
  )
}

/** One journey option card. */
function JourneyOptionCard({ option, isSelected, isBest, isFastest, isFewestTransfers, onSelect, saved }) {
  const { t } = useI18n()
  const firstLeg = option.legs?.[0]
  const lastLeg = option.legs?.[option.legs.length - 1]
  const reliabilityPct = option.reliability != null ? Math.round(option.reliability * 100) : null

  return (
    <li>
      <Card
        interactive
        className={`journey-option${isSelected ? ' journey-option--selected' : ''}${isBest ? ' journey-option--best' : ''}`}
        onClick={() => onSelect(option)}
        aria-pressed={isSelected}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(option)
          }
        }}
      >
        <div className="row-between">
          <div className="row" style={{ gap: 6 }}>
            {isBest && (
              <span className="badge b-verified" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="shield" size={12} aria-hidden="true" /> {t('results.recommended')}
              </span>
            )}
            {isFastest && !isBest && (
              <span className="badge b-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="track" size={12} aria-hidden="true" /> {t('results.fastest')}
              </span>
            )}
            {isFewestTransfers && !isBest && !isFastest && (
              <span className="badge b-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="recover" size={12} aria-hidden="true" /> {t('results.fewest_transfers')}
              </span>
            )}
            {isSelected && !isBest && !isFastest && !isFewestTransfers && (
              <span className="badge b-active">{t('results.selected')}</span>
            )}
            <span className="t-num" style={{ fontSize: 20, fontWeight: 700 }}>
              {formatDuration(option.total_duration_sec)}
            </span>
          </div>
          <span className={`badge ${option.total_transfers === 0 ? 'b-active' : 'b-rerouted'}`}>
            {option.total_transfers === 0
              ? t('results.direct')
              : option.total_transfers === 1
                ? t('results.one_transfer')
                : t('results.transfers').replace('{count}', option.total_transfers)}
          </span>
        </div>

        <div className="row" style={{ marginTop: 6, gap: 10 }}>
          <span className="t-num" style={{ fontSize: 13, color: 'var(--ink900)' }}>
            {formatTime(firstLeg?.departure_time)} → {formatTime(lastLeg?.arrival_time)}
          </span>
          {reliabilityPct != null && (
            <span className="t-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="shield" size={12} aria-hidden="true" style={{ color: reliabilityPct >= 70 ? 'var(--s800)' : 'var(--w800)' }} />
              {t('results.reliability').replace('{pct}', reliabilityPct)}
            </span>
          )}
        </div>

        <RouteStrip option={option} />

        <div className="t-caption" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span>{formatDistance(option.walk_distance_meters)} {t('results.metric_walking').toLowerCase()}</span>
          {option.fare && <span> · {option.fare.amount} {option.fare.currency}</span>}
          {option.score !== undefined && <span> · score {option.score.toFixed(2)}</span>}
        </div>
        <FareAttribution fare={option.fare} />

        {option.disrupted && (
          <div className="alert alert--error" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }} role="status">
            <Icon name="detect" size={16} aria-hidden="true" />
            <div>
              <div style={{ fontWeight: 600 }}>{t('results.alert_on_route')}</div>
              <div className="t-caption">
                {(option.alerts ?? []).map((a) => a.header_text).join(' · ') || 'Disruption reported.'}
              </div>
            </div>
          </div>
        )}
      </Card>
    </li>
  )
}

/**
 * Explainable scoring: the normalized components behind the ranking
 * (weights from JourneyScoringService: time .40, walk .20, transfers .20,
 * fare .10, reliability .10).
 */
function ScoreExplanation({ option }) {
  const { t } = useI18n()
  const dur = option.total_duration_sec
  const walk = option.walk_distance_meters
  const transfers = option.total_transfers
  const fare = option.fare?.amount ?? null
  const reliability = option.reliability ?? null

  const rows = [
    { key: 'time', label: t('results.metric_time'), value: `${formatDuration(dur)}`, pct: Math.min(100, (dur / 5400) * 100) },
    { key: 'walking', label: t('results.metric_walking'), value: formatDistance(walk), pct: Math.min(100, (walk / 2500) * 100) },
    { key: 'transfers', label: t('results.metric_transfers'), value: String(transfers), pct: Math.min(100, (transfers / 4) * 100) },
    { key: 'fare', label: t('results.metric_fare'), value: fare != null ? `${fare} EGP` : '—', pct: fare != null ? Math.min(100, (fare / 30) * 100) : 0 },
    { key: 'reliability', label: t('results.metric_reliability'), value: reliability != null ? `${Math.round(reliability * 100)}%` : '—', pct: reliability != null ? reliability * 100 : 0 },
  ]

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="t-label" style={{ fontSize: 12 }}>{t('results.why')}</span>
        <span className="t-caption">score {option.score?.toFixed(2)}</span>
      </div>
      <div className="score-bars">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="score-bar">
              <span>{r.label}</span>
              <span className="score-bar__track" aria-hidden>
                <span className="score-bar__fill" style={{ width: `${Math.max(4, r.pct)}%` }} />
              </span>
              <b className="t-num" style={{ textAlign: 'right' }}>{r.value}</b>
            </div>
            {r.key === 'fare' && <FareAttribution fare={option.fare} />}
          </div>
        ))}
      </div>
      <p className="t-caption" style={{ marginTop: 8, marginBottom: 0 }}>
        {t('results.why_note')}
      </p>
    </div>
  )
}

/**
 * Journey details drawer: full vertical timeline (Origin → legs → transfers
 * → Destination), score explanation, save + start actions.
 */
function JourneyDetails({ option, onClose, onSave, onStart, saveState, searchParams }) {
  const { t } = useI18n()
  const legs = option.legs ?? []
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]

  return (
    <div className="details-drawer" role="dialog" aria-modal="true" aria-label={t('results.details')}>
      <div className="details-drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div className="details-drawer__panel">
        <div className="details-drawer__handle" aria-hidden="true" />
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <span className="t-caption">{t('results.details')}</span>
            <div className="row" style={{ gap: 8 }}>
              <b className="t-num" style={{ fontSize: 20 }}>{formatDuration(option.total_duration_sec)}</b>
              <span className="t-num" style={{ fontSize: 13, color: 'var(--ink700)' }}>
                {formatTime(firstLeg?.departure_time)} → {formatTime(lastLeg?.arrival_time)}
              </span>
            </div>
          </div>
          <button type="button" className="locpicker__clear" onClick={onClose} aria-label={t('results.close_details')}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Vertical route timeline */}
        <div className="jtl">
          <div className="jtl__row jtl__row--endpoint">
            <span className="jtl__dot" style={{ background: 'var(--p600)' }} aria-hidden="true"><Icon name="pin" size={12} /></span>
            <div>
              <b style={{ fontSize: 13 }}>{t('results.origin')}</b>
              <div className="t-caption">{t('results.depart')} {formatTime(firstLeg?.departure_time)}</div>
            </div>
          </div>

          {legs.map((leg, idx) => {
            const isWalk = leg.type === 'walking'
            const legModeLabel = isWalk
              ? t('journey.walk')
              : (() => {
                  const key = MODE_LABEL_KEYS[leg.mode]
                  if (!key) return leg.mode
                  const translated = t(key)
                  return translated === key ? leg.mode : translated
                })()
            // Inter-leg wait (design QA): the gap between the previous leg's
            // arrival and this leg's departure. Real data — the planner sets
            // distinct departure/arrival times per leg, so a 5-hour overnight
            // gap (metro closed) is shown honestly instead of an unexplained
            // "5h 47m" total.
            const prev = legs[idx - 1]
            const waitSec = prev && leg.departure_time && prev.arrival_time
              ? (new Date(leg.departure_time).getTime() - new Date(prev.arrival_time).getTime()) / 1000
              : 0
            const showWait = idx > 0 && waitSec > 120
            return (
              <>
                {showWait && (
                  <div key={`wait-${idx}`} className="jtl__row jtl__row--transfer" style={{ marginBlock: 2 }}>
                    <span className="jtl__dot jtl__dot--ghost" aria-hidden="true"><Icon name="clock" size={11} /></span>
                    <span className="t-caption" style={{ fontWeight: 600, color: 'var(--w800)' }}>
                      {t('results.wait_minutes').replace('{n}', Math.max(1, Math.round(waitSec / 60)))}
                    </span>
                  </div>
                )}
                <div key={idx} className={`jtl__row${isWalk ? ' jtl__row--walk' : ''}`}>
                  <span className="jtl__dot" style={{ background: legColor(leg) }} aria-hidden="true">
                    <Icon name={isWalk ? 'modeWalking' : (MODE_ICONS[leg.mode] ?? 'navigate')} size={12} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="row-between">
                      <b style={{ fontSize: 13 }}>
                        {legModeLabel}
                        {leg.route?.short_name ? ` · ${leg.route.short_name}` : ''}
                      </b>
                      <span className="t-caption t-num">
                        {formatTime(leg.departure_time)} → {formatTime(leg.arrival_time)} · {Math.round(leg.duration_sec / 60)} min
                      </span>
                    </div>
                    <div className="t-caption" style={{ marginBlockStart: 2 }}>
                      {leg.from_stop?.name ?? t('results.origin')} → {leg.to_stop?.name ?? t('results.destination')}
                      {leg.distance_meters ? ` · ${formatDistance(leg.distance_meters)}` : ''}
                    </div>
                    {!isWalk && leg.route?.long_name && (
                      <div className="t-caption" style={{ fontSize: 11, color: 'var(--ink300)' }}>{leg.route.long_name}</div>
                    )}
                    {isWalk && leg.walk_source === 'estimate' && (
                      <div className="t-caption" style={{ fontSize: 11, color: 'var(--w800)' }}>
                        Walking distance estimated (routing engine unavailable)
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })}

          {(option.transfers ?? []).map((tr, idx) => (
            <div key={`t-${idx}`} className="jtl__row jtl__row--transfer">
              <span className="jtl__dot jtl__dot--ghost" aria-hidden="true"><Icon name="recover" size={11} /></span>
              <div className="t-caption">
                {tr.transfer_type === 'transfer_walk' ? t('results.transfer_walk') : t('results.transfer_wait')} ·{' '}
                {Math.round((tr.transfer_duration_sec ?? 0) / 60)} min
              </div>
            </div>
          ))}

          <div className="jtl__row jtl__row--endpoint">
            <span className="jtl__dot" style={{ background: 'var(--a600)' }} aria-hidden="true"><Icon name="navigate" size={12} /></span>
            <div>
              <b style={{ fontSize: 13 }}>{t('results.destination')}</b>
              <div className="t-caption">{t('results.arrive')} {formatTime(lastLeg?.arrival_time)}</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBlockStart: 12 }}>
          {option.fare && <span className="badge b-active">{option.fare.amount} {option.fare.currency}</span>}
          {option.reliability != null && (
            <span className="badge b-verified">{t('results.reliability').replace('{pct}', Math.round(option.reliability * 100))}</span>
          )}
          <span className="badge b-rerouted">score {option.score?.toFixed(2)}</span>
        </div>

        <FareAttribution fare={option.fare} />

        <ScoreExplanation option={option} />

        <div className="row" style={{ gap: 8, marginBlockStart: 14 }}>
          <Button
            block
            variant={saveState.saved ? 'secondary' : 'primary'}
            loading={saveState.saving}
            disabled={saveState.saved}
            onClick={onSave}
          >
            {saveState.saved ? (
              <><Icon name="success" size={16} aria-hidden="true" /> {t('results.saved')}</>
            ) : t('results.save')}
          </Button>
          <Button
            block
            variant="primary"
            disabled={!saveState.saved || saveState.starting}
            loading={saveState.starting}
            onClick={onStart}
          >
            {t('results.start')}
          </Button>
        </div>
        {!saveState.saved && (
          <p className="t-caption" style={{ marginTop: 6 }}>
            {t('results.save_first')}
          </p>
        )}
      </div>
    </div>
  )
}

/** Results page — ranked options, map sync, details drawer, save + start. */
export function JourneyResultsPage() {
  const { searchParams, searchResults, storeSaved, storeSearch } = useJourneyContext()
  const { t } = useI18n()
  const navigate = useNavigate()

  const options = Array.isArray(searchResults)
    ? searchResults
    : (Array.isArray(searchResults?.options) ? searchResults.options : [])

  const [selected, setSelected] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [savedMap, setSavedMap] = useState({}) // option index -> journey id
  const [saveError, setSaveError] = useState(null)
  const [startError, setStartError] = useState(null)

  // Growing to desktop closes a lingering mobile map sheet.
  useEffect(() => {
    if (!mobileMapOpen || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 900px)')
    const close = (e) => { if (e.matches) setMobileMapOpen(false) }
    mq.addEventListener('change', close)
    return () => mq.removeEventListener('change', close)
  }, [mobileMapOpen])

  // Nothing to show if the user navigated here directly without search parameters.
  useEffect(() => {
    if (!searchParams) {
      navigate('/search', { replace: true })
    }
  }, [searchParams, navigate])

  const selectedOptions = useMemo(() => {
    if (options.length === 0) return { fastestSec: null, fewestTransfers: null }
    return {
      fastestSec: Math.min(...options.map((o) => o.total_duration_sec)),
      fewestTransfers: Math.min(...options.map((o) => o.total_transfers)),
    }
  }, [options])

  const handleSelect = (option) => {
    setSelected(option)
    setDetailsOpen(true)
    setSaveError(null)
    setStartError(null)
  }

  const optionIndex = selected ? Math.max(0, options.indexOf(selected)) : -1
  const savedJourneyId = optionIndex >= 0 ? savedMap[optionIndex] : undefined

  const handleSave = useCallback(async () => {
    if (!selected || !searchParams) return
    if (savedMap[optionIndex] || saving) return // dedup: no duplicate saves

    setSaving(true)
    setSaveError(null)

    const searchPayload = {
      origin_lat: searchParams.origin_lat,
      origin_lng: searchParams.origin_lng,
      destination_lat: searchParams.destination_lat,
      destination_lng: searchParams.destination_lng,
      requested_at: searchParams.requested_at,
      max_transfers: searchParams.max_transfers,
      max_walk_distance_per_leg: searchParams.max_walk_distance_per_leg,
      preferred_modes: searchParams.preferred_modes,
      avoided_modes: searchParams.avoided_modes,
      alternatives: searchParams.alternatives,
    }

    try {
      const saved = await saveJourney({ searchPayload, optionIndex })
      const journey = saved?.data ?? saved
      storeSaved(journey)
      setSavedMap((prev) => ({ ...prev, [optionIndex]: journey?.id ?? journey?.journey?.id ?? true }))
    } catch (error) {
      setSaveError(error.message || 'Could not save your journey.')
    } finally {
      setSaving(false)
    }
  }, [selected, optionIndex, options, searchParams, storeSaved, savedMap, saving])

  const handleStart = useCallback(async () => {
    const journeyId = savedMap[optionIndex]
    if (!journeyId || journeyId === true || starting) return
    setStarting(true)
    setStartError(null)
    try {
      const active = await startSavedJourney(journeyId)
      navigate(`/active-journeys/${active?.id ?? active?.data?.id ?? ''}`)
    } catch (error) {
      setStartError(error.message || 'Could not start the journey.')
    } finally {
      setStarting(false)
    }
  }, [optionIndex, savedMap, starting, navigate])

  if (!searchParams) return null

  const saveStateForDetails = {
    saved: Boolean(savedJourneyId),
    saving,
    starting,
  }

  // Memoized map inputs: fresh array identities every render would tear
  // down and rebuild all map layers on each parent render.
  const activeOption = selected ?? options[0]
  const alternativeOptions = useMemo(
    () => options.filter((o) => o !== activeOption),
    [options, activeOption]
  )
  const routeStops = useMemo(
    () => activeOption?.legs?.flatMap((leg) =>
      [leg.from_stop, leg.to_stop].filter((s) => s && s.lat != null)
    ) ?? [],
    [activeOption]
  )
  const endpointOrigin = searchParams ? { lat: searchParams.origin_lat, lng: searchParams.origin_lng } : null
  const endpointDestination = searchParams ? { lat: searchParams.destination_lat, lng: searchParams.destination_lng } : null

  // Stop-panel action (design v3 §10): store the selected stop as the
  // origin/destination in the real journey context, then return to the
  // planner — the same state bridge the search flow itself uses.
  const handleMapStopSelect = (selection) => {
    const target = selection.target === 'origin' ? 'origin' : 'destination'
    const stop = {
      id: selection.id,
      name: selection.name,
      latitude: selection.latitude ?? selection.lat,
      longitude: selection.longitude ?? selection.lng,
    }
    const next = {
      ...(searchParams ?? {}),
      originStop: target === 'origin' ? stop : (searchParams?.originStop ?? null),
      destinationStop: target === 'destination' ? stop : (searchParams?.destinationStop ?? null),
    }
    storeSearch(next)
    navigate('/search')
  }

  return (
    <>
      <div className="row-between" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="topbar__back"
            onClick={() => navigate('/search')}
            aria-label={t('results.back_to_search')}
            style={{ position: 'static', margin: 0 }}
          >
            <Icon name="arrowLeft" size={18} aria-hidden="true" />
          </button>
          <div>
            <b style={{ fontSize: 17 }}>{t('results.title')}</b>
            <div className="t-caption">{t('results.options').replace('{count}', options.length)}</div>
          </div>
        </div>
      </div>

      {saveError && (
        <Alert severity="error" title={t('error.save_failed')} style={{ marginBottom: 10 }}>
          {saveError}
        </Alert>
      )}
      {startError && (
        <Alert severity="error" title={t('error.start_failed')} style={{ marginBottom: 10 }}>
          {startError}
        </Alert>
      )}

      {options.length === 0 ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="search" size={26} aria-hidden="true" />}
            tone="info"
            title={t('results.empty_title')}
            message={t('results.empty_body')}
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/search', { state: { fresh: true } })}>
                {t('results.adjust')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="results-split">
          {mobileMapOpen ? (
            <div className="results-sheet" role="dialog" aria-label="Route map">
              <div className="results-sheet__handle" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setMobileMapOpen(false)}>{t('results.close_map')}</Button>
              </div>
              <MapPanel
                itinerary={activeOption}
                alternatives={alternativeOptions}
                origin={endpointOrigin}
                destination={endpointDestination}
                height="100%"
              />
            </div>
          ) : (
            <div className="results-split__map">
              <MapPanel
                itinerary={activeOption}
                alternatives={alternativeOptions}
                origin={endpointOrigin}
                destination={endpointDestination}
                stops={routeStops}
                onSelectStop={handleMapStopSelect}
              />
            </div>
          )}

          <div className="results-split__list">
            <button
              type="button"
              className="chip on results-map-toggle"
              style={{ display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 10 }}
              onClick={() => setMobileMapOpen(true)}
            >
              <Icon name="plan" size={15} aria-hidden="true" />
              {t('results.view_map')}
            </button>

            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              {options.map((option, idx) => (
                <JourneyOptionCard
                  key={idx}
                  option={option}
                  isBest={idx === 0}
                  isFastest={option.total_duration_sec === selectedOptions.fastestSec}
                  isFewestTransfers={option.total_transfers === selectedOptions.fewestTransfers && option.total_transfers > 0}
                  isSelected={selected === option}
                  onSelect={handleSelect}
                />
              ))}
            </ul>

            <p className="t-caption" style={{ marginTop: 10, textAlign: 'center' }}>
              {t('results.select_hint')}
            </p>
          </div>
        </div>
      )}

      {selected && detailsOpen && (
        <JourneyDetails
          option={selected}
          onClose={() => setDetailsOpen(false)}
          onSave={handleSave}
          onStart={handleStart}
          saveState={saveStateForDetails}
          searchParams={searchParams}
        />
      )}
    </>
  )
}
