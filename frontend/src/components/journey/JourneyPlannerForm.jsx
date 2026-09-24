import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import { searchJourneys } from '../../api/journeys'
import { searchPlaces, reverseGeocode } from '../../api/places'
import { useJourneyContext } from '../../contexts/JourneyContext'
import { LocationSearchField } from '../ui/LocationSearchField'
import { Icon } from '../ui/Icon'
import { useGeolocation, positionToSelection } from '../../hooks/useGeolocation'

/**
 * JourneyPlannerForm — the single functional search component, used by:
 *  - the landing hero (tone="hero", compact — get the user into results)
 *  - the /search page (tone="full", departure + advanced constraints)
 *
 * It owns: origin/destination selection, swap, current-location, and
 * search execution. Navigation to results is shared via
 * onSearched(results, params) — the pages only decide where to go.
 */
export function useJourneyPlanner({ initial = null } = {}) {
  const { t } = useI18n()
  const { storeSearch, storeResults } = useJourneyContext()

  const [originStop, setOriginStop] = useState(initial?.originStop ?? null)
  const [destinationStop, setDestinationStop] = useState(initial?.destinationStop ?? null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [originResults, setOriginResults] = useState([])
  const [originPlaces, setOriginPlaces] = useState([])
  const [destResults, setDestResults] = useState([])
  const [destPlaces, setDestPlaces] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  // Current-location state (shared with both pickers as the origin's
  // "use my location" affordance; never auto-applied).
  const geo = useGeolocation()
  const [geoSelection, setGeoSelection] = useState(null)

  // Once granted, label the position with a real place name (best
  // effort — coordinate label fallback inside reverseGeocode). When the
  // origin is still empty, adopt it as the default origin (never
  // overwriting a user-entered value); the user can clear/replace it,
  // and a fresh locate re-arms the adoption.
  const geoAutoApplied = useRef(false)
  useEffect(() => {
    let cancelled = false
    if (geo.status === 'locating') {
      geoAutoApplied.current = false
      return undefined
    }
    if (geo.status === 'granted' && geo.position) {
      const selection = positionToSelection(geo.position)
      setGeoSelection(selection)
      if (!originStop && !geoAutoApplied.current) {
        geoAutoApplied.current = true
        setOriginStop(selection)
      }
      reverseGeocode(geo.position)
        .then((name) => {
          if (cancelled) return
          const named = { ...selection, name }
          setGeoSelection(named)
          // Keep the adopted origin's label in sync (same identity).
          setOriginStop((prev) => (prev?.isCurrent ? named : prev))
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [geo.status, geo.position, originStop])

  const makeSearchHandler = useCallback(async (query, { signal } = {}) => {
    setSearching(true)
    setSearchError(null)
    try {
      const bias = geo.position ?? { lat: 30.05, lng: 31.23 }
      const data = await searchPlaces(query, bias, { signal })
      const seen = new Set()
      const dedupe = (list) => (Array.isArray(list) ? list : []).filter((item) => {
        const key = item.id ?? `${item.name}|${item.lat}|${item.lng}`
        if (seen.has(key)) return false
        seen.add(key)
        return item
      })
      return {
        stops: dedupe(Array.isArray(data?.stops) ? data.stops : []).map((s) => ({
          id: s.stop_id ?? s.id,
          name: s.name,
          latitude: s.lat,
          longitude: s.lng,
          area: { name: s.detail },
        })),
        places: dedupe(Array.isArray(data?.places) ? data.places : []),
      }
    } catch (err) {
      // Superseded keystroke (aborted) or typing-burst throttle (429): keep
      // the previous suggestions on screen instead of flashing an error or
      // wiping the list mid-word. Returning null tells callers to skip set.
      if (err?.aborted || err?.status === 429) return null
      setSearchError(t('planner.err_unavailable'))
      return { stops: [], places: [] }
    } finally {
      setSearching(false)
    }
  }, [t, geo.position])

  // Each field gets a fresh result cache — concurrent origin/destination
  // typing must not overwrite each other's dropdowns.
  const searchOrigin = useCallback(async (q, opts) => {
    const r = await makeSearchHandler(q, opts)
    if (!r) return
    setOriginResults(r.stops); setOriginPlaces(r.places)
  }, [makeSearchHandler])
  const searchDestination = useCallback(async (q, opts) => {
    const r = await makeSearchHandler(q, opts)
    if (!r) return
    setDestResults(r.stops); setDestPlaces(r.places)
  }, [makeSearchHandler])

  const swap = useCallback(() => {
    setOriginStop(destinationStop)
    setDestinationStop(originStop)
    setFieldErrors({})
  }, [originStop, destinationStop])

  const validate = useCallback(() => {
    const errors = {}
    if (!originStop) errors.origin = [t('planner.err_origin')]
    if (!destinationStop) errors.destination = [t('planner.err_destination')]
    if (originStop && destinationStop
      && originStop.latitude != null && destinationStop.latitude != null
      && Number(originStop.latitude) === Number(destinationStop.latitude)
      && Number(originStop.longitude) === Number(destinationStop.longitude)) {
      errors.destination = [t('planner.err_same')]
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [originStop, destinationStop, t])

  const buildForm = useCallback((extraParams = {}) => {
    const o = { lat: originStop?.latitude ?? originStop?.lat, lng: originStop?.longitude ?? originStop?.lng }
    const d = { lat: destinationStop?.latitude ?? destinationStop?.lat, lng: destinationStop?.longitude ?? destinationStop?.lng }
    return {
      origin_lat: Number(o.lat),
      origin_lng: Number(o.lng),
      destination_lat: Number(d.lat),
      destination_lng: Number(d.lng),
      requested_at: new Date().toISOString(),
      max_transfers: 1,
      max_walk_distance_per_leg: 1000,
      alternatives: 3,
      avoided_modes: [],
      ...extraParams,
    }
  }, [originStop, destinationStop])

  const submit = useCallback(async (extraParams = {}) => {
    if (submitting) return null

    let curOrigin = originStop
    let curDest = destinationStop

    // Auto-resolve missing coordinates from place names if provided by AI or quick-entry
    if (curOrigin && (curOrigin.latitude == null && curOrigin.lat == null) && curOrigin.name) {
      try {
        const r = await searchPlaces(curOrigin.name)
        const match = r?.stops?.[0] || r?.places?.[0]
        if (match) {
          curOrigin = {
            ...curOrigin,
            latitude: Number(match.latitude ?? match.lat),
            longitude: Number(match.longitude ?? match.lng),
            id: match.id ?? match.stop_id ?? curOrigin.id,
            name: match.name ?? curOrigin.name,
          }
          setOriginStop(curOrigin)
        }
      } catch {}
    }

    if (curDest && (curDest.latitude == null && curDest.lat == null) && curDest.name) {
      try {
        const r = await searchPlaces(curDest.name)
        const match = r?.stops?.[0] || r?.places?.[0]
        if (match) {
          curDest = {
            ...curDest,
            latitude: Number(match.latitude ?? match.lat),
            longitude: Number(match.longitude ?? match.lng),
            id: match.id ?? match.stop_id ?? curDest.id,
            name: match.name ?? curDest.name,
          }
          setDestinationStop(curDest)
        }
      } catch {}
    }

    const errors = {}
    if (!curOrigin) errors.origin = [t('planner.err_origin')]
    if (!curDest) errors.destination = [t('planner.err_destination')]
    if (curOrigin && curDest
      && curOrigin.latitude != null && curDest.latitude != null
      && Number(curOrigin.latitude) === Number(curDest.latitude)
      && Number(curOrigin.longitude) === Number(curDest.longitude)) {
      errors.destination = [t('planner.err_same')]
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return null

    const o = { lat: curOrigin.latitude ?? curOrigin.lat, lng: curOrigin.longitude ?? curOrigin.lng }
    const d = { lat: curDest.latitude ?? curDest.lat, lng: curDest.longitude ?? curDest.lng }
    const form = {
      origin_lat: Number(o.lat),
      origin_lng: Number(o.lng),
      destination_lat: Number(d.lat),
      destination_lng: Number(d.lng),
      requested_at: new Date().toISOString(),
      max_transfers: 1,
      max_walk_distance_per_leg: 1000,
      alternatives: 3,
      avoided_modes: [],
      ...extraParams,
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await searchJourneys(form)
      const optionsList = Array.isArray(result)
        ? result
        : (result?.options ?? result?.data?.options ?? (Array.isArray(result?.data) ? result.data : []))
      storeSearch({ ...form, originStop: curOrigin, destinationStop: curDest })
      storeResults(optionsList)
      return { options: optionsList, params: { ...form, originStop: curOrigin, destinationStop: curDest } }
    } catch (error) {
      setSubmitError(
        error.isUnauthorized ? t('error.session_expired')
          : error.isValidation ? (Object.values(error.errors ?? {}).flat().join(' ') || error.message)
          : error.message,
      )
      return null
    } finally {
      setSubmitting(false)
    }
  }, [originStop, destinationStop, submitting, t, storeSearch, storeResults])

  // Validate + persist the params WITHOUT running the (protected) search
  // API — used for the guest hand-off: Landing → login → /search
  // continues with the fields pre-filled from JourneyContext.
  const storeDraft = useCallback((extraParams = {}) => {
    if (!validate()) return null
    const form = buildForm(extraParams)
    const draft = { ...form, originStop, destinationStop }
    storeSearch(draft)
    return draft
  }, [validate, buildForm, originStop, destinationStop, storeSearch])

  const currentLocationContext = useMemo(() => ({
    enabled: true,
    status: geo.status,
    message: geo.message,
    locate: geo.locate,
    selection: geoSelection,
  }), [geo.status, geo.message, geo.locate, geoSelection])

  return {
    // fields
    originStop, destinationStop, setOriginStop, setDestinationStop,
    fieldErrors, submitting, submitError, setSubmitError, searchError,
    // autocomplete
    searchOrigin, searchDestination,
    originResults, originPlaces, destResults, destPlaces,
    searching,
    // actions
    swap, submit, storeDraft,
    // geolocation
    geoStatus: geo.status,
    geoMessage: geo.message,
    geoSelection,
    currentLocationContext,
  }
}

/**
 * The visual OD (origin→destination) block with swap. Shared by hero
 * and planner page for one consistent interaction language.
 */
export function OriginDestinationFields({
  planner,
  tone = 'default',
  labels,
}) {
  const { t } = useI18n()
  const {
    originStop, destinationStop, setOriginStop, setDestinationStop,
    fieldErrors,
    searchOrigin, searchDestination,
    originResults, originPlaces, destResults, destPlaces, searching,
    swap, currentLocationContext,
  } = planner

  return (
    <div className="od-block">
      <div className="od-block__field">
        <LocationSearchField
          tone={tone}
          label={t('planner.origin')}
          testId="origin-picker"
          icon="pin"
          placeholder={labels?.originPlaceholder ?? t('planner.origin_placeholder')}
          selected={originStop}
          onChange={setOriginStop}
          onSearch={searchOrigin}
          results={originResults}
          places={originPlaces}
          loading={searching}
          error={fieldErrors.origin?.[0] || fieldErrors.origin_lat?.[0]}
          currentLocation={currentLocationContext}
          hint={t('planner.hint')}
          groupStops={t('planner.group_stops')}
          groupPlaces={t('planner.group_places')}
        />
      </div>

      <button
        type="button"
        className="od-block__swap"
        onClick={swap}
        aria-label={t('action.swap')}
        title={t('action.swap')}
        disabled={!originStop && !destinationStop}
      >
        <Icon name="arrowUpDown" size={16} />
      </button>

      <div className="od-block__field">
        <LocationSearchField
          tone={tone}
          label={t('planner.destination')}
          testId="destination-picker"
          icon="navigate"
          placeholder={labels?.destinationPlaceholder ?? t('planner.destination_placeholder')}
          selected={destinationStop}
          onChange={setDestinationStop}
          onSearch={searchDestination}
          results={destResults}
          places={destPlaces}
          loading={searching}
          error={fieldErrors.destination?.[0] || fieldErrors.destination_lat?.[0]}
          currentLocation={null}
          hint={t('planner.hint')}
          groupStops={t('planner.group_stops')}
          groupPlaces={t('planner.group_places')}
        />
      </div>
    </div>
  )
}
