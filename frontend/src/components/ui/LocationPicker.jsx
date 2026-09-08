import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Field } from './Input'
import { Icon } from './Icon'

function parseCoordinates(str) {
  if (!str) return null
  const match = str.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/)
  if (match) {
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[3])
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

const coalesce = (stop) => ({
  lat: stop?.latitude ?? stop?.lat,
  lng: stop?.longitude ?? stop?.lng,
})

/**
 * Journey-planner location picker (combobox).
 *
 * Data: server-side stop search against the public `/stops?search=…`
 * endpoint (3,025 stops — client-side filtering of a 15-row page was the
 * old defect). Raw lat,lng input stays supported for power users.
 *
 * Accessibility: ARIA combobox pattern — ArrowDown/ArrowUp move the active
 * option, Enter selects, Escape closes, focus returns to the input.
 */
export function LocationPicker({
  label,
  value,
  selected,
  onChange,
  onSearch,
  results = [],
  places = [],
  loading = false,
  placeholder,
  error,
  testId,
  icon = 'pin',
  groupStops = 'Transit stops',
  groupPlaces = 'Places on the map',
  hint = '{hint}',
}) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const listboxId = useId()
  const isSelected = Boolean(selected)
  const selectedCoords = coalesce(selected ?? {})

  // Reflect external value changes (e.g. swap control).
  useEffect(() => { setQuery(value ?? '') }, [value])

  // Debounced server-side search.
  useEffect(() => {
    if (!onSearch) return undefined
    const q = query.trim()
    if (q.length < 2 || isSelected) return undefined
    const coords = parseCoordinates(q)
    if (coords) return undefined

    const t = setTimeout(() => { onSearch(q) }, 300)
    return () => clearTimeout(t)
  }, [query, onSearch, isSelected])

  const options = useMemo(() => results.slice(0, 6), [results])
  const placeOptions = useMemo(() => places.slice(0, 5), [places])
  const hasAnyOption = options.length > 0 || placeOptions.length > 0

  const select = (stop) => {
    setQuery(stop.name)
    onChange(stop)
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
    const totalOptions = options.length + placeOptions.length
    if (!open || totalOptions === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % totalOptions)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()
        const flat = activeIndex
        if (flat < options.length) select(options[flat])
        else select({ ...placeOptions[flat - options.length], isPlace: true })
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Scroll the keyboard-active option into view.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    listRef.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <Field label={label} error={error}>
      {(id) => (
        <div className="locpicker">
          <div
            className={`locpicker__control${isSelected ? ' locpicker__control--selected' : ''}${error ? ' locpicker__control--error' : ''}`}
          >
            <span className="locpicker__lead" aria-hidden="true">
              <Icon name={isSelected ? 'pin' : icon} size={17} />
            </span>
            <input
              ref={inputRef}
              id={id ?? fieldId}
              data-testid={testId}
              className="locpicker__input"
              placeholder={placeholder ?? 'Search stops…'}
              value={query}
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="off"
              onChange={(e) => {
                const val = e.target.value
                setQuery(val)
                setOpen(true)
                setActiveIndex(-1)
                const coords = parseCoordinates(val)
                onChange(coords)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={handleKeyDown}
            />
            {loading && <span className="locpicker__spinner" aria-hidden="true" />}
            {isSelected && !loading && (
              <button
                type="button"
                className="locpicker__clear"
                onClick={clear}
                aria-label={`Clear ${label ?? 'location'}`}
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          {isSelected && selectedCoords.lat != null && (
            <div className="locpicker__meta" role="status">
              <Icon name="success" size={13} aria-hidden="true" style={{ color: 'var(--s700)' }} />
              Selected: {selected.name} · {Number(selectedCoords.lat).toFixed(4)}, {Number(selectedCoords.lng).toFixed(4)}
            </div>
          )}

          {open && !isSelected && (
            <div className="locpicker__list" ref={listRef} id={listboxId} role="listbox" aria-label={`${label ?? 'Location'} suggestions`}>
              {loading ? (
                <div className="locpicker__empty">Searching…</div>
              ) : !hasAnyOption ? (
                <div className="locpicker__empty">
                  {query.trim().length >= 2
                    ? <>No matches for “{query.trim()}”. You can paste lat, lng.</>
                    : '{hint}'}
                </div>
              ) : (
                <>
                  {options.length > 0 && (
                    <div className="locpicker__group" role="presentation">{groupStops}</div>
                  )}
                  {options.map((stop, idx) => (
                    <button
                      key={stop.id}
                      id={`${listboxId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIndex}
                      className={`locpicker__item${idx === activeIndex ? ' is-active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); select(stop) }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <Icon name="pin" size={14} aria-hidden="true" style={{ color: 'var(--ink300)', marginTop: 2 }} />
                      <span>
                        <span className="locpicker__item-name">{stop.name}</span>
                        <span className="locpicker__item-sub">
                          {stop.area?.name ?? stop.detail ?? '—'}{stop.area?.governorate?.name ? ` · ${stop.area.governorate.name}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                  {placeOptions.length > 0 && (
                    <div className="locpicker__group" role="presentation">{groupPlaces}</div>
                  )}
                  {placeOptions.map((place, idx) => {
                    const flat = idx + options.length
                    return (
                      <button
                        key={place.id}
                        id={`${listboxId}-opt-${flat}`}
                        type="button"
                        role="option"
                        aria-selected={flat === activeIndex}
                        className={`locpicker__item${flat === activeIndex ? ' is-active' : ''}`}
                        onMouseDown={(e) => { e.preventDefault(); select({ ...place, isPlace: true }) }}
                        onMouseEnter={() => setActiveIndex(flat)}
                      >
                        <Icon name="globe" size={14} aria-hidden="true" style={{ color: 'var(--nile)', marginTop: 2 }} />
                        <span>
                          <span className="locpicker__item-name">{place.name}</span>
                          <span className="locpicker__item-sub">{place.detail || 'Map place'}</span>
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Field>
  )
}
