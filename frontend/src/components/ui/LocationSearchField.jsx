import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

/**
 * Shared location search combobox — the single control used by the
 * landing hero and the journey planner.
 *
 * Features (unified UX across surfaces):
 * - Server-side stop + place autocomplete (debounced 600ms, previous
 *   in-flight request aborted so fast typing never floods the throttle)
 * - "Use my current location" action (real browser geolocation)
 * - Clear button, selected state, loading spinner
 * - Raw "lat, lng" paste support (power users)
 * - ARIA combobox pattern with full keyboard navigation
 *
 * Controlled selection via `selected`/`onChange`; query text is local.
 * onSearch receives (query, { signal }) — callers must swallow aborts.
 */

const DEBOUNCE_MS = 600

function parseCoordinates(str) {
  if (!str) return null
  const match = str.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (match) {
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        id: `coord_${lat.toFixed(4)}_${lng.toFixed(4)}`,
        name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        latitude: lat,
        longitude: lng,
      }
    }
  }
  return null
}

export function LocationSearchField({
  label,
  placeholder,
  icon = 'pin',
  selected,
  onChange,
  onSearch,
  loading = false,
  error,
  currentLocation,          // { selection, status, message, locate, enabled }
  results = [],
  places = [],
  groupStops = 'Transit stops',
  groupPlaces = 'Places on the map',
  hint,
  testId,
  tone = 'default',         // 'default' (planner card) | 'hero' (on dark hero)
}) {
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const listboxId = useId()

  const isSelected = Boolean(selected)
  const geoBusy = currentLocation?.status === 'locating'

  useEffect(() => { setQuery(selected?.name ?? '') }, [selected?.name])

  // Debounced server-side search (skipped while a selection is active).
  // Each new keystroke aborts the previous in-flight request: without this,
  // typing a word fires one request per keystroke and trips the server
  // throttle, killing suggestions mid-word with 429s.
  const abortRef = useRef(null)
  useEffect(() => {
    if (!onSearch) return undefined
    const q = query.trim()
    if (q.length < 2 || isSelected) return undefined
    if (parseCoordinates(q)) return undefined
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      Promise.resolve(onSearch(q, { signal: controller.signal })).catch(() => {})
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, onSearch, isSelected])
  useEffect(() => () => abortRef.current?.abort(), [])

  const stopOptions = useMemo(() => results.slice(0, 6), [results])
  const placeOptions = useMemo(() => places.slice(0, 5), [places])
  const totalOptions = stopOptions.length + placeOptions.length

  const select = (option) => {
    setQuery(option.name)
    onChange(option)
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const clear = () => {
    setQuery('')
    onChange(null)
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && (open || query.length >= 2)) {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (totalOptions === 0 ? -1 : (i + 1) % totalOptions))
    } else if (e.key === 'ArrowUp' && open && totalOptions > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && open) {
        e.preventDefault()
        if (activeIndex < stopOptions.length) select(stopOptions[activeIndex])
        else select(placeOptions[activeIndex - stopOptions.length])
      } else if (!isSelected && parseCoordinates(query)) {
        e.preventDefault()
        select(parseCoordinates(query))
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    listRef.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const showList = open && !isSelected
  const listIdleMessage = query.trim().length >= 2
    ? (loading ? 'Searching…' : null)
    : (hint ?? null)

  return (
    <div className={`locfield locfield--${tone}${error ? ' locfield--error' : ''}`}>
      <div className="locfield__control-wrap">
        <div
          className="locfield__control"
          data-selected={isSelected || undefined}
        >
          <span className="locfield__lead" aria-hidden="true">
            {selected?.isCurrent ? <Icon name="crosshair" size={17} /> : <Icon name={icon} size={17} />}
          </span>
          <label className="sr-only" htmlFor={listboxId + '-input'}>{label}</label>
          <input
            ref={inputRef}
            id={listboxId + '-input'}
            data-testid={testId}
            className="locfield__input"
            placeholder={placeholder ?? 'Search stops and places…'}
            value={query}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setActiveIndex(-1)
              const coords = parseCoordinates(e.target.value)
              if (coords) onChange(coords)
              else if (isSelected) onChange(null)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
          />
          {(loading || geoBusy) && <span className="locfield__spinner" aria-label="Loading" role="status" />}
          {isSelected && !loading && !geoBusy && (
            <button
              type="button"
              className="locfield__clear"
              onClick={clear}
              aria-label={`Clear ${label ?? 'location'}`}
            >
              <Icon name="close" size={15} />
            </button>
          )}
          {!isSelected && currentLocation?.enabled && (
            <button
              type="button"
              className="locfield__geo"
              onClick={currentLocation.locate}
              disabled={geoBusy}
              aria-label={`Use my current location for ${label ?? 'origin'}`}
              title="Use my current location"
            >
              <Icon name="crosshair" size={15} />
            </button>
          )}
        </div>
        {error && <div className="locfield__error" role="alert">{error}</div>}
        {isSelected && selected.latitude != null && (
          <div className="locfield__meta" role="status">
            <Icon
              name={selected.isCurrent ? 'crosshair' : 'success'}
              size={13}
              aria-hidden="true"
            />
            {selected.isCurrent
              ? 'Using your current location'
              : `Selected: ${selected.name} · ${Number(selected.latitude).toFixed(4)}, ${Number(selected.longitude).toFixed(4)}`}
          </div>
        )}
      </div>

      {showList && (
        <div className="locfield__list" ref={listRef} id={listboxId} role="listbox" aria-label={`${label ?? 'Location'} suggestions`}>
          {currentLocation?.enabled && !isSelected && currentLocation.selection && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="locfield__item locfield__item--geo"
              onMouseDown={(e) => { e.preventDefault(); select(currentLocation.selection) }}
              onMouseEnter={() => setActiveIndex(-1)}
            >
              <span className="locfield__item-icon locfield__item-icon--geo" aria-hidden="true">
                <Icon name="crosshair" size={16} />
              </span>
              <span>
                <span className="locfield__item-name">{currentLocation.selection.name}</span>
                <span className="locfield__item-sub">Detected from this device</span>
              </span>
            </button>
          )}

          {!loading && stopOptions.length === 0 && placeOptions.length === 0 && (
            <div className="locfield__empty">
              {listIdleMessage ?? `No matches for “${query.trim()}”. You can paste lat, lng.`}
            </div>
          )}

          {stopOptions.length > 0 && (
            <div className="locfield__group" role="presentation">{groupStops}</div>
          )}
          {stopOptions.map((stop, idx) => (
            <button
              key={stop.id}
              id={`${listboxId}-opt-${idx}`}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              className={`locfield__item${idx === activeIndex ? ' is-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); select(stop) }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className="locfield__item-icon" aria-hidden="true"><Icon name="pin" size={15} /></span>
              <span>
                <span className="locfield__item-name">{stop.name}</span>
                <span className="locfield__item-sub">
                  {stop.area?.name ?? stop.detail ?? 'Transit stop'}
                  {stop.area?.governorate?.name ? ` · ${stop.area.governorate.name}` : ''}
                </span>
              </span>
            </button>
          ))}

          {placeOptions.length > 0 && (
            <div className="locfield__group" role="presentation">{groupPlaces}</div>
          )}
          {placeOptions.map((place, idx) => {
            const flat = idx + stopOptions.length
            return (
              <button
                key={place.id}
                id={`${listboxId}-opt-${flat}`}
                type="button"
                role="option"
                aria-selected={flat === activeIndex}
                className={`locfield__item${flat === activeIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); select({ ...place, isPlace: true }) }}
                onMouseEnter={() => setActiveIndex(flat)}
              >
                <span className="locfield__item-icon locfield__item-icon--place" aria-hidden="true">
                  <Icon name="globe" size={15} />
                </span>
                <span>
                  <span className="locfield__item-name">{place.name}</span>
                  <span className="locfield__item-sub">{place.detail || 'Map place'}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
