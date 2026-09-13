import { it, expect, vi, beforeEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import { MapPanel } from '../components/map/MapPanel'
import { renderWithProviders } from '../test/test-utils'

/**
 * Regression tests for the zoom/focus camera bug.
 *
 * Bug: the layer-rendering effect re-fitted the camera (fitBounds) whenever
 * its dependencies changed identity — including `modeColors`, which was
 * recreated on every render on dark basemaps (satellite default). Every zoom
 * gesture fired `zoom` events → zoom-badge setState → re-render → fresh
 * modeColors → effect re-ran → fitBounds yanked the camera back to the
 * focused bounds, rejecting the user's zoom.
 *
 * Contract under test:
 * 1. fitBounds runs ONCE when plotted data first appears (the focus).
 * 2. zoom events (user zooming) must NEVER re-trigger fitBounds.
 * 3. Equal-value prop churn (inline literals in parents) must not refit.
 * 4. A genuine plotted-data change intentionally refits (explicit refocus).
 * 5. Basemap switching repaints layers but must preserve the camera.
 */

class FakeLngLatBounds {
  constructor() { this.coords = [] }
  extend(c) { this.coords.push(c) }
}

const mapInstances = []

class FakeMap {
  constructor(options) {
    this.options = options
    this._zoom = options?.zoom ?? 11
    this._handlers = {}
    this.sources = {}
    this.fitBounds = vi.fn()
    this.easeTo = vi.fn()
    this.flyTo = vi.fn()
    this.resize = vi.fn()
    this.remove = vi.fn()
    this.moveLayer = vi.fn()
    this.setPaintProperty = vi.fn()
    this.setLayoutProperty = vi.fn()
    this.addSource = vi.fn((id, def) => { this.sources[id] = def?.data ?? null })
    this.addLayer = vi.fn()
    this.removeSource = vi.fn()
    this.removeLayer = vi.fn()
    this.off = vi.fn((event, handler) => {})
    this.hasImage = vi.fn(() => false)
    this.addImage = vi.fn()
    // The style ships the basemap layers; report them as present so the
    // layer-visibility effect exercises its setLayoutProperty path.
    this.getLayer = vi.fn((id) => (id === 'background' || id?.startsWith?.('bm-') ? { id } : undefined))
    this.getSource = vi.fn(() => undefined)
    this.getStyle = vi.fn(() => ({ layers: [], sources: {} }))
    this.queryRenderedFeatures = vi.fn(() => [])
    this.getCenter = vi.fn(() => ({ lat: 30.0444, lng: 31.2357 }))
    this.getZoom = vi.fn(() => this._zoom)
    mapInstances.push(this)
  }
  on(event, handler) { this._handlers[event] = handler }
  emit(event, payload) { this._handlers[event]?.(payload) }
}

vi.mock('maplibre-gl', () => {
  const lib = { Map: FakeMap, LngLatBounds: FakeLngLatBounds, setWorkerUrl: vi.fn() }
  // MapPanel reads `maplibre.Map` off the dynamic-import namespace (named
  // shape) — expose both the named exports and the default export.
  return { default: lib, ...lib }
})

// jsdom lacks ResizeObserver; MapPanel observes its container at init.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
if (!global.ResizeObserver) global.ResizeObserver = ResizeObserverStub

const LINE = {
  legs: [
    {
      type: 'transit',
      mode: 'metro',
      from_lat: 30.0617, from_lng: 31.2464,
      to_lat: 30.0261, to_lng: 31.2114,
      geometry: [
        [30.0617, 31.2464],
        [30.0444, 31.2357],
        [30.0261, 31.2114],
      ],
    },
  ],
}

// Same plotted data as LINE, fresh object identities (how parent pages pass
// inline literals on re-render).
const LINE_CLONE = JSON.parse(JSON.stringify(LINE))

// A genuinely different route (different coordinates).
const OTHER_LINE = {
  legs: [
    {
      type: 'transit',
      mode: 'bus',
      from_lat: 30.1, from_lng: 31.3,
      to_lat: 30.0, to_lng: 31.2,
      geometry: [[30.1, 31.3], [30.0, 31.2]],
    },
  ],
}

async function mountMap(itinerary) {
  const utils = renderWithProviders(<MapPanel itinerary={itinerary} height={300} />)
  // Flush the dynamic maplibre import (Map is constructed in a microtask),
  // grab the instance, then fire load (map becomes ready).
  await act(async () => {})
  const map = mapInstances[mapInstances.length - 1]
  if (!map) throw new Error('MapPanel never constructed a map — mock wiring broken')
  await act(async () => { map.emit('load') })
  return { ...utils, map }
}

beforeEach(() => {
  mapInstances.length = 0
  localStorage.removeItem('wasel.map.layer')
})

it('fits the camera once on focus, then never re-fits while the user zooms', async () => {
  const { map } = await mountMap(LINE)
  expect(map.fitBounds).toHaveBeenCalledTimes(1) // the focus itself

  // User zooms via any gesture: MapLibre fires `zoom` events (the panel's
  // zoom badge reads them). None of this may re-apply the focus.
  for (const z of [11, 12, 12, 13, 14]) {
    await act(async () => {
      map._zoom = z
      map.emit('zoom')
    })
  }
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
  // Zoom badge reflects the user's zoom (state handler still wired).
  expect(screen.getByText('14')).toBeInTheDocument()
})

it('ignores equal-value prop churn but refits on genuine data change', async () => {
  const { map, rerender } = await mountMap(LINE)
  expect(map.fitBounds).toHaveBeenCalledTimes(1)

  // Parent re-renders with a fresh object identity but identical coordinates
  // (RouteDetail/JourneySearch inline-literal pattern): camera must not move.
  await act(async () => { rerender(<MapPanel itinerary={LINE_CLONE} height={300} />) })
  expect(map.fitBounds).toHaveBeenCalledTimes(1)

  // An explicit new selection (different plotted data) intentionally refocuses.
  await act(async () => { rerender(<MapPanel itinerary={OTHER_LINE} height={300} />) })
  expect(map.fitBounds).toHaveBeenCalledTimes(2)
})

it('preserves the camera across basemap switches (repaint only)', async () => {
  const { map } = await mountMap(LINE)
  expect(map.fitBounds).toHaveBeenCalledTimes(1)

  await act(async () => { screen.getByRole('button', { name: 'Switch map layer' }).click() })
  await act(async () => { screen.getByRole('menuitemradio', { name: 'Streets' }).click() })

  // Layers were rebuilt for the new palette, but the camera was untouched.
  expect(map.setLayoutProperty).toHaveBeenCalled()
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
})

it('zoom controls animate from the current camera and stay user-controlled', async () => {
  const { map } = await mountMap(LINE)
  await act(async () => { map._zoom = 10; map.emit('zoom') })

  await act(async () => { screen.getByRole('button', { name: 'Zoom in' }).click() })
  expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 11 }))

  // The eased zoom fires zoom events — still no refocus.
  await act(async () => { map._zoom = 11; map.emit('zoom') })
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
})

/**
 * Route geometry rendering integrity: the drawn route is composed ONLY of
 * the selected journey's legs — each leg's polyline starts and ends at that
 * leg's own endpoints, walking geometry stays on walking legs, legs render
 * in order, and switching journeys replaces (never stacks) the geometry.
 */
describe('route geometry rendering composition', () => {
  const WALK_THEN_METRO = {
    legs: [
      {
        type: 'walking', mode: 'walking',
        from_lat: 30.0500, from_lng: 31.2300,
        to_lat: 30.0505, to_lng: 31.2310,
        duration_sec: 300, distance_meters: 120,
        geometry: [[30.0500, 31.2300], [30.0502, 31.2305], [30.0505, 31.2310]],
      },
      {
        type: 'transit', mode: 'metro',
        from_lat: 30.0505, from_lng: 31.2310,
        to_lat: 30.0600, to_lng: 31.2400,
        duration_sec: 600, distance_meters: 1500,
        geometry: [[30.0505, 31.2310], [30.0550, 31.2350], [30.0600, 31.2400]],
      },
    ],
  }

  const DIFFERENT_ROUTE = {
    legs: [
      {
        type: 'transit', mode: 'bus',
        from_lat: 30.0100, from_lng: 31.2000,
        to_lat: 30.0200, to_lng: 31.2100,
        duration_sec: 420, distance_meters: 1600,
        geometry: [[30.0100, 31.2000], [30.0200, 31.2100]],
      },
    ],
  }

  const routeFeatures = (map) => map.sources['selected-route']?.features ?? []

  it('renders one feature per leg in order, with leg-owned geometry endpoints', async () => {
    const { map } = await mountMap(WALK_THEN_METRO)
    const features = routeFeatures(map)

    expect(features).toHaveLength(2)

    // Legs render in their journey order (index preserved)…
    expect(features.map((f) => f.properties.index)).toEqual([0, 1])
    expect(features[0].properties.legType).toBe('walking')
    expect(features[1].properties.legType).toBe('transit')
    // …walking geometry belongs only to the walking leg…
    expect(features[0].geometry.coordinates[0]).toEqual([31.2300, 30.0500])
    expect(features[0].geometry.coordinates.at(-1)).toEqual([31.2310, 30.0505])
    // …and transit geometry only to the transit leg, chained to it.
    expect(features[1].geometry.coordinates[0]).toEqual([31.2310, 30.0505])
    expect(features[1].geometry.coordinates.at(-1)).toEqual([31.2400, 30.0600])

    // Coordinates never leave the journey's own bounding envelope.
    for (const f of features) {
      for (const [lng, lat] of f.geometry.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(30.0499)
        expect(lat).toBeLessThanOrEqual(30.0601)
        expect(lng).toBeGreaterThanOrEqual(31.2299)
        expect(lng).toBeLessThanOrEqual(31.2401)
      }
    }
  })

  it('replaces — never stacks — geometry when a different journey is rendered', async () => {
    const { map, rerender } = await mountMap(WALK_THEN_METRO)
    expect(routeFeatures(map)).toHaveLength(2)

    await act(async () => { rerender(<MapPanel itinerary={DIFFERENT_ROUTE} height={300} />) })

    const features = routeFeatures(map)
    expect(features).toHaveLength(1)
    expect(features[0].properties.mode).toBe('bus')
    // No stale walking-leg geometry from the previous journey survives.
    expect(features.some((f) => f.properties.legType === 'walking')).toBe(false)
    expect(features[0].geometry.coordinates[0]).toEqual([31.2000, 30.0100])
  })

  it('falls back to straight leg connectors when a leg has no geometry — endpoints still exact', async () => {
    const noGeometry = {
      legs: [{
        type: 'transit', mode: 'metro',
        from_lat: 30.0444, from_lng: 31.2357,
        to_lat: 30.0261, to_lng: 31.2114,
        duration_sec: 600, distance_meters: 3000,
        geometry: null,
      }],
    }
    const { map } = await mountMap(noGeometry)
    const features = routeFeatures(map)

    expect(features).toHaveLength(1)
    expect(features[0].geometry.coordinates[0]).toEqual([31.2357, 30.0444])
    expect(features[0].geometry.coordinates.at(-1)).toEqual([31.2114, 30.0261])
  })
})
