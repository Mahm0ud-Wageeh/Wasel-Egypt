import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { useJourneyContext } from '../contexts/JourneyContext'
import { searchJourneys } from '../api/journeys'
import { searchPlaces } from '../api/places'
import { Button } from '../components/ui/Button'
import { SelectInput } from '../components/ui/Input'
import { LocationPicker } from '../components/ui/LocationPicker'
import { ModeChip } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/MapPanel'

const MODES = [
  { id: 'walking', label: 'Walking' },
  { id: 'metro', label: 'Metro' },
  { id: 'bus', label: 'Bus' },
  { id: 'minibus', label: 'Minibus' },
  { id: 'microbus', label: 'Microbus' },
  { id: 'rail', label: 'Rail' },
]

const normalizeStop = (stop) => ({
  ...stop,
  lat: stop.latitude ?? stop.lat,
  lng: stop.longitude ?? stop.lng,
})

/**
 * Journey search — the planner.
 *
 * Desktop (≥1024px): planner panel left, live map right (selected
 * origin/destination visualized). Mobile: stacked, touch-first.
 * Stop autocomplete runs server-side against GET /stops?search=…
 */
export function JourneySearchPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { searchParams, storeSearch, storeResults } = useJourneyContext()
  const navigate = useNavigate()

  const [originStop, setOriginStop] = useState(searchParams?.originStop ?? null)
  const [destinationStop, setDestinationStop] = useState(searchParams?.destinationStop ?? null)
  const [departure, setDeparture] = useState(
    searchParams?.requested_at ?? new Date().toISOString().slice(0, 16))
  const [maxTransfers, setMaxTransfers] = useState(searchParams?.max_transfers ?? 1)
  const [maxWalk, setMaxWalk] = useState(searchParams?.max_walk_distance_per_leg ?? 1000)
  const [alternatives, setAlternatives] = useState(searchParams?.alternatives ?? 3)
  const [avoidedModes, setAvoidedModes] = useState(searchParams?.avoided_modes ?? [])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [originResults, setOriginResults] = useState([])
  const [destResults, setDestResults] = useState([])
  const [originPlaces, setOriginPlaces] = useState([])
  const [destPlaces, setDestPlaces] = useState([])
  const [searchingStops, setSearchingStops] = useState(false)
  const [stopsError, setStopsError] = useState(null)

  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Unified server-side search: transit stops + geocoded places (Arabic
  // capable, cached/throttled proxy). Debounced inside LocationPicker.
  const makeSearchHandler = (setResults, setPlaces) => useCallback(async (query) => {
    setSearchingStops(true)
    setStopsError(null)
    try {
      const data = await searchPlaces(query, { lat: 30.05, lng: 31.23 })
      const stops = Array.isArray(data?.stops) ? data.stops : []
      const places = Array.isArray(data?.places) ? data.places : []
      setResults(stops.map((s) => ({
        id: s.stop_id ?? s.id,
        name: s.name,
        latitude: s.lat,
        longitude: s.lng,
        area: { name: s.detail },
      })))
      setPlaces(places)
    } catch {
      setStopsError(t('planner.err_unavailable'))
      setResults([])
      setPlaces([])
    } finally {
      setSearchingStops(false)
    }
  }, [])

  const searchOrigin = makeSearchHandler(setOriginResults, setOriginPlaces)
  const searchDestination = makeSearchHandler(setDestResults, setDestPlaces)

  const toggleAvoided = (mode) =>
    setAvoidedModes((prev) => prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode])

  const swap = () => {
    setOriginStop(destinationStop)
    setDestinationStop(originStop)
    setFieldErrors({})
  }

  const clearAll = () => {
    setOriginStop(null)
    setDestinationStop(null)
    setFieldErrors({})
    setSubmitError(null)
    setOriginResults([])
    setDestResults([])
  }

  const onSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setFieldErrors({})
    setSubmitError(null)

    const errors = {}
    if (!originStop) errors.origin = [t('planner.err_origin')]
    if (!destinationStop) errors.destination = [t('planner.err_destination')]
    if (originStop && destinationStop && originStop.id && destinationStop.id && originStop.id === destinationStop.id) {
      errors.destination = [t('planner.err_same')]
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const o = normalizeStop(originStop)
    const d = normalizeStop(destinationStop)
    const form = {
      origin_lat: o.lat,
      origin_lng: o.lng,
      destination_lat: d.lat,
      destination_lng: d.lng,
      requested_at: departure,
      max_transfers: Number(maxTransfers),
      max_walk_distance_per_leg: Number(maxWalk),
      alternatives: Number(alternatives),
      avoided_modes: avoidedModes,
    }

    setSubmitting(true)
    try {
      const result = await searchJourneys(form)
      const optionsList = Array.isArray(result)
        ? result
        : (result?.options ?? result?.data?.options ?? (Array.isArray(result?.data) ? result.data : []))
      storeSearch({ ...form, originStop, destinationStop })
      storeResults(optionsList)
      navigate('/journeys/results')
    } catch (error) {
      setSubmitError(
        error.isUnauthorized ? 'Your session has expired. Please log in again.' :
        error.isValidation ? (Object.values(error.errors ?? {}).flat().join(' ') || error.message) :
        error.message,
      )
    } finally {
      setSubmitting(false)
    }
  }, [originStop, destinationStop, departure, maxTransfers, maxWalk, alternatives, avoidedModes, storeSearch, storeResults, navigate])

  const hasSelection = Boolean(originStop || destinationStop)

  return (
    <div className="planner-page">
      {/* ---- Planner panel ---- */}
      <form className="planner-panel card" onSubmit={onSubmit} noValidate aria-label="Journey planner">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <b style={{ fontSize: 16 }}>{t('planner.title')}</b>
          {hasSelection && (
            <button type="button" className="chip" onClick={clearAll}>
              <Icon name="close" size={13} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {stopsError && (
          <Alert severity="warning" title="Location search unavailable" style={{ marginBottom: 12 }}>
            {stopsError}
          </Alert>
        )}

        <div className="planner-od">
          <LocationPicker
            label={t('planner.origin')}
            groupStops={t('planner.group_stops')}
            groupPlaces={t('planner.group_places')}
            hint={t('planner.hint')}
            testId="origin-picker"
            icon="pin"
            value={originStop?.name ?? ''}
            selected={originStop}
            onChange={setOriginStop}
            onSearch={searchOrigin}
            results={originResults}
            places={originPlaces}
            loading={searchingStops}
            placeholder="Stop name or lat, lng…"
            error={fieldErrors.origin?.[0] || fieldErrors.origin_lat?.[0]}
          />

          <button
            type="button"
            className="planner-swap"
            onClick={swap}
            aria-label="Swap origin and destination"
            disabled={!originStop && !destinationStop}
          >
            <Icon name="chevronRight" size={14} aria-hidden="true" style={{ transform: 'rotate(90deg)' }} />
            <Icon name="chevronRight" size={14} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} />
          </button>

          <LocationPicker
            label={t('planner.destination')}
            groupStops={t('planner.group_stops')}
            groupPlaces={t('planner.group_places')}
            hint={t('planner.hint')}
            testId="destination-picker"
            icon="navigate"
            value={destinationStop?.name ?? ''}
            selected={destinationStop}
            onChange={setDestinationStop}
            onSearch={searchDestination}
            results={destResults}
            places={destPlaces}
            loading={searchingStops}
            placeholder="Stop name or lat, lng…"
            error={fieldErrors.destination?.[0] || fieldErrors.destination_lat?.[0]}
          />
        </div>

        <div className="planner-field">
          <span className="t-label">Departure</span>
          <div className="planner-departure">
            <SelectInput
              type="datetime-local"
              aria-label="Departure time"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              error={fieldErrors.requested_at?.[0]}
            />
            <button
              type="button"
              className="chip"
              onClick={() => setDeparture(new Date().toISOString().slice(0, 16))}
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
          <Icon name={advancedOpen ? 'close' : 'chevronRight'} size={14} aria-hidden="true" style={advancedOpen ? { transform: 'none' } : { transform: 'rotate(90deg)' }} />
          {t('planner.advanced')}
        </button>

        {advancedOpen && (
          <div className="planner-advanced">
            <div className="planner-field">
              <span className="t-label">Modes to avoid</span>
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
                label="Max transfers"
                type="number"
                value={maxTransfers}
                min={0}
                max={5}
                onChange={(e) => setMaxTransfers(e.target.value)}
                error={fieldErrors.max_transfers?.[0]}
              />
              <SelectInput
                label="Max walk / leg (m)"
                type="number"
                value={maxWalk}
                min={100}
                max={10000}
                step={100}
                onChange={(e) => setMaxWalk(e.target.value)}
                error={fieldErrors.max_walk_distance_per_leg?.[0]}
              />
              <SelectInput
                label="Alternatives"
                type="number"
                value={alternatives}
                min={1}
                max={5}
                onChange={(e) => setAlternatives(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button block size="lg" type="submit" loading={submitting} disabled={submitting} style={{ marginTop: 14 }}>
          {submitting ? t('planner.searching') : t('planner.find')}
        </Button>

        {submitting && (
          <p className="t-caption" style={{ textAlign: 'center', marginTop: 8 }} role="status">
            {t('planner.searching_hint')}
          </p>
        )}

        {submitError && (
          <Alert severity="error" title="Search failed" style={{ marginTop: 12 }}>
            {submitError}
          </Alert>
        )}
      </form>

      {/* ---- Live map: selected endpoints visualized ---- */}
      <div className="planner-map" aria-label="Selected locations map">
        <MapPanel
          origin={originStop ? { lat: Number(originStop.latitude ?? originStop.lat), lng: Number(originStop.longitude ?? originStop.lng) } : null}
          destination={destinationStop ? { lat: Number(destinationStop.latitude ?? destinationStop.lat), lng: Number(destinationStop.longitude ?? destinationStop.lng) } : null}
          height="100%"
          fitTo="origin"
        />
        {user?.name && (
          <span className="planner-map__badge">Planner · {user.name}</span>
        )}
      </div>
    </div>
  )
}
