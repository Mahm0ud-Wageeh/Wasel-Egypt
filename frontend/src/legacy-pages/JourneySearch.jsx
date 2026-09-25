import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { useJourneyContext } from '../contexts/JourneyContext'
import { cairoWallTime } from '../api/journeys'
import { trackEvent } from '../utils/analytics'
import { Button } from '../components/ui/Button'
import { SelectInput } from '../components/ui/Input'
import { ModeChip } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'
import { OriginDestinationFields, useJourneyPlanner } from '../components/journey/JourneyPlannerForm'

const MODES = [
  { id: 'walking', label: 'Walking' },
  { id: 'metro', label: 'Metro' },
  { id: 'bus', label: 'Bus' },
  { id: 'minibus', label: 'Minibus' },
  { id: 'microbus', label: 'Microbus' },
  { id: 'rail', label: 'Rail' },
]

/**
 * Journey search — the planner.
 *
 * Desktop (≥1024px): planner panel left, live map right (selected
 * origin/destination visualized). Mobile: stacked, touch-first.
 * Stop autocomplete runs server-side against GET /stops?search=…
 * Shares the same planner state/handlers as the landing hero
 * (JourneyPlannerForm) so the UX is identical across surfaces.
 */
export function JourneySearchPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { searchParams } = useJourneyContext()
  const navigate = useNavigate()
  const location = useLocation()

  // "Plan from <stop>" on the line page / stop panel navigates here with
  // a prefillStop (+ optional prefillTarget). An explicit prefill wins
  // over stale stored params; live user typing afterwards is never
  // overwritten (mount-time initial state only). The AI assistant sends
  // both fields at once via secondPrefillStop (origin+destination).
  const prefill = location.state?.prefillStop ?? null
  const prefillTarget = location.state?.prefillTarget === 'destination' ? 'destination' : 'origin'
  const secondPrefill = location.state?.secondPrefillStop ?? null
  const aiDeparture = location.state?.aiDeparture ?? null

  const planner = useJourneyPlanner({
    initial: {
      originStop: (prefillTarget === 'origin' ? prefill : null)
        ?? (prefillTarget === 'destination' && secondPrefill ? secondPrefill : null)
        ?? searchParams?.originStop ?? null,
      destinationStop: (prefillTarget === 'destination' ? prefill : null)
        ?? (prefillTarget === 'origin' && secondPrefill ? secondPrefill : null)
        ?? searchParams?.destinationStop ?? null,
    },
  })

  // Stored requested_at echoes carry an offset ("...+03:00") which
  // datetime-local rejects (it needs naive wall time); slice keeps the
  // wall clock the backend planned against.
  const [departure, setDeparture] = useState(
    aiDeparture
      ? String(aiDeparture).slice(0, 16)
      : searchParams?.requested_at ? String(searchParams.requested_at).slice(0, 16) : cairoWallTime())
  const [maxTransfers, setMaxTransfers] = useState(searchParams?.max_transfers ?? 1)
  const [maxWalk, setMaxWalk] = useState(searchParams?.max_walk_distance_per_leg ?? 1000)
  const [alternatives, setAlternatives] = useState(searchParams?.alternatives ?? 3)
  const [avoidedModes, setAvoidedModes] = useState(searchParams?.avoided_modes ?? [])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const toggleAvoided = (mode) =>
    setAvoidedModes((prev) => prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode])

  const clearAll = () => {
    planner.setOriginStop(null)
    planner.setDestinationStop(null)
    planner.setSubmitError(null)
  }

  const onSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault()
    trackEvent('planner_search_started', {
      has_origin: Boolean(planner.originStop),
      has_destination: Boolean(planner.destinationStop),
      max_transfers: Number(maxTransfers),
    })
    const result = await planner.submit({
      requested_at: departure,
      max_transfers: Number(maxTransfers),
      max_walk_distance_per_leg: Number(maxWalk),
      alternatives: Number(alternatives),
      avoided_modes: avoidedModes,
    })
    if (result) {
      trackEvent('planner_search_success', {
        routes_count: result?.data?.routes?.length || 0,
      })
      navigate('/journeys/results')
    }
  }, [planner, departure, maxTransfers, maxWalk, alternatives, avoidedModes, navigate])

  const autoSubmit = location.state?.autoSubmit ?? false
  const [autoSubmitted, setAutoSubmitted] = useState(false)

  useEffect(() => {
    if (autoSubmit && !autoSubmitted && planner.originStop && planner.destinationStop) {
      setAutoSubmitted(true)
      const timer = setTimeout(() => {
        onSubmit()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [autoSubmit, autoSubmitted, planner.originStop, planner.destinationStop, onSubmit])

  const hasSelection = Boolean(planner.originStop || planner.destinationStop)
  const {
    originStop, destinationStop,
  } = planner

  return (
    <div className="planner-page">
      {/* ---- Planner panel ---- */}
      <form className="planner-panel card" onSubmit={onSubmit} noValidate aria-label="Journey planner">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <b style={{ fontSize: 16 }}>{t('planner.title')}</b>
          {hasSelection && (
            <button type="button" className="chip" onClick={clearAll}>
              <Icon name="close" size={13} aria-hidden="true" />
              {t('action.clear')}
            </button>
          )}
        </div>

        {planner.searchError && (
          <Alert severity="warning" title="Location search unavailable" style={{ marginBottom: 12 }}>
            {planner.searchError}
          </Alert>
        )}

        <OriginDestinationFields planner={planner} />

        <div className="planner-field">
          <span className="t-label">{t('planner.departure')}</span>
          <div className="planner-departure">
            <SelectInput
              type="datetime-local"
              aria-label={t('planner.departure')}
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              error={planner.fieldErrors.requested_at?.[0]}
            />
            <button
              type="button"
              className="chip"
              onClick={() => setDeparture(cairoWallTime())}
            >
              {t('action.now')}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="planner-advanced-toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <Icon name="chevronRight" size={14} aria-hidden="true" style={advancedOpen ? { transform: 'rotate(-90deg)' } : { transform: 'rotate(90deg)' }} />
          {t('planner.advanced')}
        </button>

        {advancedOpen && (
          <div className="planner-advanced">
            <div className="planner-field">
              <span className="t-label">{t('planner.avoid')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MODES.map((m) => (
                  <ModeChip key={m.id} mode={m.id} on={avoidedModes.includes(m.id)} onToggle={toggleAvoided}>
                    {m.label}
                  </ModeChip>
                ))}
              </div>
            </div>

            <div className="planner-inline-fields">
              <SelectInput
                label={t('planner.max_transfers')}
                type="number"
                value={maxTransfers}
                min={0}
                max={5}
                onChange={(e) => setMaxTransfers(e.target.value)}
                error={planner.fieldErrors.max_transfers?.[0]}
              />
              <SelectInput
                label={t('planner.max_walk')}
                type="number"
                value={maxWalk}
                min={100}
                max={10000}
                step={100}
                onChange={(e) => setMaxWalk(e.target.value)}
                error={planner.fieldErrors.max_walk_distance_per_leg?.[0]}
              />
              <SelectInput
                label={t('planner.alternatives')}
                type="number"
                value={alternatives}
                min={1}
                max={5}
                onChange={(e) => setAlternatives(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button block size="lg" type="submit" loading={planner.submitting} disabled={planner.submitting} style={{ marginTop: 14 }}>
          {planner.submitting ? t('planner.searching') : t('planner.find')}
        </Button>

        {planner.submitting && (
          <p className="t-caption" style={{ textAlign: 'center', marginTop: 8 }} role="status">
            {t('planner.searching_hint')}
          </p>
        )}

        {planner.submitError && (
          <Alert severity="error" title="Search failed" style={{ marginTop: 12 }}>
            {planner.submitError}
          </Alert>
        )}
      </form>

      {/* ---- Live map: selected endpoints visualized ---- */}
      <div className="planner-map" aria-label="Selected locations map">
        <MapPanel
          origin={originStop ? { lat: Number(originStop.latitude ?? originStop.lat), lng: Number(originStop.longitude ?? originStop.lng) } : null}
          destination={destinationStop ? { lat: Number(destinationStop.latitude ?? destinationStop.lat), lng: Number(destinationStop.longitude ?? destinationStop.lng) } : null}
          userLocation={planner.currentLocationContext.selection && originStop?.isCurrent
            ? { lat: Number(originStop.latitude), lng: Number(originStop.longitude), accuracy: originStop.accuracy }
            : null}
          height="100%"
          fitTo="origin"
          showNearbyStops
          onSelectStop={({ target, id, name, latitude, longitude }) => {
            const stop = {
              id,
              name: name ?? t('map.selected_stop'),
              latitude: latitude ?? 0,
              longitude: longitude ?? 0,
            }
            if (target === 'origin') planner.setOriginStop(stop)
            else planner.setDestinationStop(stop)
          }}
        />
        {user?.name && (
          <span className="planner-map__badge">Planner · {user.name}</span>
        )}
      </div>
    </div>
  )
}
