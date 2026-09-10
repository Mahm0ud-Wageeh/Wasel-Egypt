import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon } from '../ui/Icon'
import { StopPanel } from '../ui/StopPanel'
import { useI18n } from '../../i18n/LanguageContext'
import { apiRequest } from '../../api/client'
import { endpoints } from '../../api/endpoints'

/**
 * Production map panel built on MapLibre GL JS.
 *
 * Data sources (real only — no decorative geometry):
 * - Base raster tiles: OpenStreetMap standard (ODbL) — the previous
 *   Stamen endpoint moved behind an API key and returned 401, leaving
 *   the map blank. VITE_MAP_TILES_URL can still override the provider.
 * - Route polylines: leg.geometry (variant polyline / OSRM walk
 *   geometry) with straight-line fallbacks between leg endpoints.
 * - Stops: leg from/to stops + (optionally) nearby network stops
 *   fetched live from GET /stops (public endpoint).
 * - Markers: origin (ring), destination (dot), current location
 *   (halo + dot), deviation (severity-colored).
 *
 * UX: grouped controls with tooltips (zoom / recenter / locate /
 * stops toggle), a compact legend, selected-place chip, and an honest
 * loading / failure state. No invented data: when the backend returns
 * nothing, the map shows the base network only.
 *
 * Coordinates in props are [lat, lng]; converted to [lng, lat] for MapLibre.
 */

// NOTE: MapLibre raster sources do not expand Leaflet's {r} retina token —
// it gets requested literally and 404s. 256px standard tiles only.
// OSM standard tiles require a valid UA; browsers always send one.
const TILE_URL =
  import.meta.env.VITE_MAP_TILES_URL ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Resolved hex values (MapLibre paint properties cannot read CSS variables).
const C = {
  primary: '#1a6bb0',
  primaryDark: '#14558b',
  accent: '#d3a044',
  danger: '#c62828',
  walking: '#6b7280',
  surface: '#FFFFFF',
  ink: '#16222e',
}

const MODE_COLORS = {
  metro: '#c62828',
  bus: '#1565c0',
  minibus: '#e07c00',
  microbus: '#00897b',
  rail: '#6a3fa0',
  walking: C.walking,
}

const lng = (p) => [p.lng ?? p[1], p.lat ?? p[0]]
const isFinitePoint = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])

/**
 * Build the full route GeoJSON for one itinerary: transit legs from
 * `leg.geometry` (variant polyline) when present, walking legs from
 * `leg.geometry` (OSRM road polyline), both falling back to straight lines
 * between leg endpoints.
 */
function itineraryToFeatures(itinerary, kind) {
  const features = []

  ;(itinerary?.legs ?? []).forEach((leg, idx) => {
    let coords = null

    if (Array.isArray(leg.geometry) && leg.geometry.length >= 2) {
      coords = leg.geometry
        .map((p) => [Number(p[1]), Number(p[0])])
        .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1])) // [lat,lng] → [lng,lat]
    }
    if ((!coords || coords.length < 2) && Number.isFinite(Number(leg.from_lat)) && Number.isFinite(Number(leg.to_lat))) {
      coords = [
        [Number(leg.from_lng), Number(leg.from_lat)],
        [Number(leg.to_lng), Number(leg.to_lat)],
      ]
    }
    if (!coords || coords.length < 2) return

    features.push({
      type: 'Feature',
      properties: {
        kind,
        legType: leg.type,
        mode: leg.mode,
        index: idx,
      },
      geometry: { type: 'LineString', coordinates: coords },
    })
  })

  return features
}

/** Deduplicate stops by id/position for the network layer. */
function normalizeStops(stops) {
  const seen = new Set()
  const out = []
  for (const s of stops) {
    const lat = Number(s.lat ?? s.latitude)
    const lng = Number(s.lng ?? s.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const key = s.id ?? `${lat.toFixed(5)},${lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: key, name: s.name ?? '', lat, lng })
  }
  return out
}
/** Collect every stop referenced by the itinerary legs. */
function itineraryStops(itinerary) {
  const out = []
  for (const leg of itinerary?.legs ?? []) {
    for (const key of ['from_stop', 'to_stop']) {
      const s = leg[key]
      if (s && (s.lat != null || s.latitude != null)) out.push(s)
    }
  }
  return normalizeStops(out)
}

export function MapPanel({
  origin = null,
  destination = null,
  itinerary = null, // selected itinerary: { legs: [...] }
  alternatives = [], // unselected itineraries for context
  stops = [], // [{lat,lng,name,id}] — explicit stop set (route stops)
  userLocation = null, // {lat,lng,accuracy?}
  deviation = null, // {lat,lng,severity}
  height = 260,
  fitTo = 'route', // 'route' | 'origin' | 'user'
  showControls = true,
  showNearbyStops = false, // live nearby network stops layer
  onMapClick = null,
  onSelectStop = null, // (selection {id,name,latitude,longitude}) — Set as origin/destination from the stop panel
  children,
}) {
  const { t } = useI18n()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const maplibreRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(null)
  const [nearby, setNearby] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [stopsLayerOn, setStopsLayerOn] = useState(showNearbyStops)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [selectedStopId, setSelectedStopId] = useState(null)
  const [legendOpen, setLegendOpen] = useState(false)

  // Stable stop object for the panel: an inline literal would get a fresh
  // identity on every MapPanel render (e.g. zoom state), refetching the
  // departures API and stealing focus on every gesture while open.
  const selectedStop = useMemo(
    () => (selectedStopId == null ? null : {
      id: selectedStopId,
      name: selectedPlace?.name,
      lat: selectedPlace?.lat,
      lng: selectedPlace?.lng,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStopId, selectedPlace?.name, selectedPlace?.lat, selectedPlace?.lng],
  )

  const hasItinerary = Boolean(itinerary?.legs?.length)

  // ---------- init ----------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    let disposed = false
    let resizeObserver = null

    import('maplibre-gl')
      .then((maplibre) => {
        if (disposed) return
        maplibreRef.current = maplibre

        // Explicit same-origin worker URL (see scripts/sync-maplibre-worker.mjs):
        // MapLibre resolves its worker relative to import.meta.url, which
        // Vite's dev pre-bundler and the Rollup build do not emit — the
        // worker 404s and ALL vector layers (routes, pins, stops) silently
        // never render while raster tiles still appear.
        try {
          maplibre.setWorkerUrl?.('/map/maplibre-gl-worker.mjs')
        } catch {
          /* fall back to MapLibre's default resolution */
        }

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: [TILE_URL],
                tileSize: 256,
                attribution: TILE_ATTRIBUTION,
                maxzoom: 19,
              },
            },
            layers: [
              { id: 'background', type: 'background', paint: { 'background-color': '#E8ECEF' } },
              { id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 24 },
            ],
          },
          center: [31.2357, 30.0444], // Cairo
          zoom: 11,
          attributionControl: { compact: true },
        })

        map.on('error', (e) => {
          // Tile errors are routine (offline); engine errors disable the map.
          if (e?.error?.message && !/Failed to fetch|NetworkError/i.test(e.error.message)) {
            console.error('MapLibre error:', e.error.message)
          }
        })

        map.on('load', () => {
          if (disposed) return
          setReady(true)
          map.resize()
        })
        map.on('zoom', () => setZoom(Math.round(map.getZoom())))

        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['stops-halo', 'nearby-halo'].filter((id) => map.getLayer(id)),
          })
          if (features.length > 0) {
            const f = features[0]
            setSelectedPlace({
              name: f.properties.name || t('map.selected_stop'),
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            })
            // Numeric db ids open the full stop panel (design v3 §10);
            // synthetic ids (geo_/coord_) fall back to the place chip.
            const sid = f.properties.stop_id
            setSelectedStopId(Number.isFinite(Number(sid)) ? Number(sid) : null)
          } else {
            setSelectedPlace(null)
            setSelectedStopId(null)
            onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng })
          }
        })

        mapRef.current = map
        // DEV-only handle for automated browser verification (compiled
        // out of production builds via import.meta.env.DEV).
        if (import.meta.env.DEV) window.__waselMap = map
        resizeObserver = new ResizeObserver(() => map.resize())
        resizeObserver.observe(mapContainerRef.current)
      })
      .catch(() => setFailed(true))

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // ---------- nearby stops (public endpoint, view-bounded) ----------
  const fetchNearbyStops = useCallback(async (center, currentZoom) => {
    if (currentZoom < 12) return // too wide — would fetch half the network
    setNearbyLoading(true)
    try {
      const radiusDeg = Math.max(0.012, 0.02 * Math.pow(2, 13 - currentZoom))
      const bbox = [
        (center.lng - radiusDeg).toFixed(4),
        (center.lat - radiusDeg).toFixed(4),
        (center.lng + radiusDeg).toFixed(4),
        (center.lat + radiusDeg).toFixed(4),
      ].join(',')
      const params = new URLSearchParams({ per_page: '40', bbox })
      const response = await apiRequest(
        `${endpoints.public.stops}?${params.toString()}`,
        { auth: false },
      ).catch(() => null)
      if (response?.data) setNearby(normalizeStops(response.data))
    } finally {
      setNearbyLoading(false)
    }
  }, [])

  // ---------- render layers ----------
  const clearDynamic = useCallback((map) => {
    const style = map.getStyle()
    ;(style?.layers ?? [])
      .filter((l) => !['background', 'osm-tiles'].includes(l.id))
      .forEach((l) => map.getLayer(l.id) && map.removeLayer(l.id))
    Object.keys(style?.sources ?? {})
      .filter((id) => id !== 'osm')
      .forEach((id) => map.getSource(id) && map.removeSource(id))
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const maplibre = maplibreRef.current
    if (!map || !maplibre || !ready) return

    clearDynamic(map)

    // -- nearby network stops layer (context) --
    const nearbyStops = stopsLayerOn ? nearby : []
    // Explicit stops prop MERGES with itinerary stops (both deduped):
    // pages like the route detail pass a polyline-only itinerary PLUS a
    // stop list — either/or would silently drop one of them.
    const routeStops = normalizeStops([...itineraryStops(itinerary), ...stops])
    const contextStops = nearbyStops.filter(
      (s) => !routeStops.some((r) => r.lat === s.lat && r.lng === s.lng),
    )

    if (contextStops.length > 0) {
      map.addSource('nearby-stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: contextStops.map((s) => ({
            type: 'Feature',
            properties: { name: s.name, stop_id: Number.isFinite(Number(s.id)) ? Number(s.id) : null },
            geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          })),
        },
      })
      map.addLayer({
        id: 'nearby-halo',
        type: 'circle',
        source: 'nearby-stops',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 5],
          'circle-color': C.surface,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#9db2c4',
        },
      })
    }

    // -- alternative routes (context) --
    alternatives.forEach((alt, i) => {
      const id = `alt-route-${i}`
      map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: itineraryToFeatures(alt, 'alternative') } })
      map.addLayer({
        id: `alt-line-${i}`,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#9AA7AE',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 5],
        },
        filter: ['==', ['get', 'kind'], 'alternative'],
      })
    })

    // -- selected itinerary --
    if (itinerary) {
      const features = itineraryToFeatures(itinerary, 'selected')
      map.addSource('selected-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })

      // Walking segments: dashed, muted.
      map.addLayer({
        id: 'selected-walk',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': C.walking,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 4],
          'line-dasharray': [1.5, 1.5],
        },
        filter: ['==', ['get', 'legType'], 'walking'],
      })

      // Directional casing for the selected route.
      map.addLayer({
        id: 'selected-casing',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': C.surface,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 7, 16, 11],
          'line-opacity': 0.85,
        },
        filter: ['==', ['get', 'legType'], 'transit'],
      })

      // Transit segments: solid, mode-colored.
      map.addLayer({
        id: 'selected-transit',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'mode'],
            'metro', MODE_COLORS.metro,
            'minibus', MODE_COLORS.minibus,
            'microbus', MODE_COLORS.microbus,
            'rail', MODE_COLORS.rail,
            MODE_COLORS.bus,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 16, 8],
        },
        filter: ['==', ['get', 'legType'], 'transit'],
      })
      map.moveLayer('selected-casing', 'selected-transit')
    }

    // -- route stop markers (interactive) --
    if (routeStops.length > 0) {
      map.addSource('stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: routeStops.map((s) => ({
            type: 'Feature',
            properties: { name: s.name, stop_id: Number.isFinite(Number(s.id)) ? Number(s.id) : null },
            geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          })),
        },
      })
      map.addLayer({
        id: 'stops-halo',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 16, 7],
          'circle-color': C.surface,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': C.primaryDark,
        },
      })
    }

    // -- origin / destination --
    const validPin = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
    const pinSource = (id, color, coords) => {
      map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords } } })
      map.addLayer({
        id: `${id}-layer`,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 7,
          'circle-color': C.surface,
          'circle-stroke-width': 3.5,
          'circle-stroke-color': color,
        },
      })
    }
    if (validPin(origin)) pinSource('origin-pin', C.primary, lng(origin))
    if (validPin(destination)) pinSource('destination-pin', C.accent, lng(destination))

    // -- user location --
    const validUser =
      userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))
    if (validUser) {
      const accuracyM = Number(userLocation.accuracy) || 0
      const sourceData = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: lng(userLocation) },
      }
      map.addSource('user', { type: 'geojson', data: sourceData })
      if (accuracyM > 0) {
        map.addLayer({
          id: 'user-accuracy',
          type: 'circle',
          source: 'user',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, Math.max(8, Math.sqrt(accuracyM) * 0.28), 16, Math.max(24, Math.sqrt(accuracyM) * 0.6)],
            'circle-color': 'rgba(26,107,176,0.14)',
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(26,107,176,0.35)',
          },
        })
      }
      map.addLayer({
        id: 'user-halo',
        type: 'circle',
        source: 'user',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 16, 20],
          'circle-color': 'rgba(26,107,176,0.22)',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(26,107,176,0.5)',
        },
      })
      map.addLayer({
        id: 'user-dot',
        type: 'circle',
        source: 'user',
        paint: {
          'circle-radius': 7,
          'circle-color': C.primary,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': C.surface,
        },
      })
    }

    // -- deviation marker --
    const validDeviation =
      deviation && Number.isFinite(Number(deviation.lat)) && Number.isFinite(Number(deviation.lng))
    if (validDeviation) {
      map.addSource('deviation', {
        type: 'geojson',
        data: { type: 'Feature', properties: { severity: deviation.severity ?? 'medium' }, geometry: { type: 'Point', coordinates: lng(deviation) } },
      })
      map.addLayer({
        id: 'deviation-pin',
        type: 'circle',
        source: 'deviation',
        paint: {
          'circle-radius': 11,
          'circle-color': deviation.severity === 'high' ? C.danger : C.accent,
          'circle-stroke-width': 3,
          'circle-stroke-color': C.surface,
        },
      })
    }

    // -- fit bounds (only finite coordinates are usable) --
    const points = []
    if (fitTo === 'user' && validUser) points.push(lng(userLocation))
    if (fitTo === 'origin' && validPin(origin)) points.push(lng(origin))
    if (itinerary?.legs) {
      itinerary.legs.forEach((leg) => {
        if (Number.isFinite(leg.from_lat) && Number.isFinite(leg.from_lng)) points.push([leg.from_lng, leg.from_lat])
        if (Number.isFinite(leg.to_lat) && Number.isFinite(leg.to_lng)) points.push([leg.to_lng, leg.to_lat])
        ;(leg.geometry ?? []).forEach((p) => {
          const c = [Number(p[1]), Number(p[0])]
          if (Number.isFinite(c[0]) && Number.isFinite(c[1])) points.push(c)
        })
      })
    } else {
      if (validPin(origin)) points.push(lng(origin))
      if (validPin(destination)) points.push(lng(destination))
      stops.forEach((s) => points.push([Number(s.lng), Number(s.lat)]))
      if (validUser) points.push(lng(userLocation))
      if (validDeviation) points.push(lng(deviation))
    }

    const usable = points.filter(isFinitePoint)
    if (usable.length > 0) {
      const bounds = new maplibre.LngLatBounds()
      usable.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, { padding: 56, maxZoom: 16.5, duration: 600 })
    }
  }, [ready, itinerary, alternatives, origin, destination, stops, userLocation, deviation, fitTo, clearDynamic, stopsLayerOn, nearby])

  // ---------- controls ----------
  const recenter = useCallback(() => {
    const map = mapRef.current
    const maplibre = maplibreRef.current
    if (!map || !maplibre) return

    const valid = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
    const target =
      (valid(userLocation) && lng(userLocation)) ||
      (valid(origin) && lng(origin)) ||
      null
    if (target) map.flyTo({ center: target, zoom: Math.max(map.getZoom(), 15), duration: 500 })
  }, [userLocation, origin])

  const zoomBy = useCallback((delta) => {
    mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() ?? 11) + delta, duration: 250 })
  }, [])

  const toggleStopsLayer = useCallback(() => {
    setStopsLayerOn((on) => {
      const next = !on
      if (next && nearby.length === 0) {
        const map = mapRef.current
        if (map) fetchNearbyStops({ lat: map.getCenter().lat, lng: map.getCenter().lng }, map.getZoom())
      }
      return next
    })
  }, [nearby.length, fetchNearbyStops])

  if (failed) {
    return (
      <div
        className="map-panel"
        role="img"
        aria-label="Map unavailable (route shown as outline)"
        style={{ height, borderRadius: 'var(--r-lg)', background: '#E8ECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}
      >
        <span className="t-caption" style={{ padding: 16, textAlign: 'center' }}>
          Interactive map could not load on this device. Journey routing still works — see the itinerary below.
        </span>
      </div>
    )
  }

  const legendItems = [
    { color: C.primary, label: t('map.legend_route') },
    { color: '#9AA7AE', label: t('map.legend_alt') },
    { color: MODE_COLORS.walking, label: t('map.legend_walk'), dashed: true },
  ]

  return (
    <div
      className="map-panel"
      style={{ height, borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden' }}
      aria-label={t('map.label')}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {!ready && (
        <div
          aria-label={t('map.loading')}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8ECEF', flexDirection: 'column', gap: 10 }}
        >
          <span className="spinner spinner--inline" role="status" />
          <span className="t-caption">{t('map.loading')}…</span>
        </div>
      )}

      {showControls && ready && (
        <>
          <div className="map-ctl-group" role="group" aria-label="Map controls">
            <button type="button" className="map-ctl" onClick={() => zoomBy(1)} aria-label={t('map.zoom_in')} title={t('map.zoom_in')}>
              <Icon name="plus" size={17} aria-hidden="true" />
            </button>
            <button type="button" className="map-ctl" onClick={() => zoomBy(-1)} aria-label={t('map.zoom_out')} title={t('map.zoom_out')}>
              <Icon name="minus" size={17} aria-hidden="true" />
            </button>
            <span className="map-ctl__divider" aria-hidden="true" />
            <button
              type="button"
              className={`map-ctl${stopsLayerOn ? ' is-on' : ''}`}
              onClick={toggleStopsLayer}
              aria-pressed={stopsLayerOn}
              aria-label={t('map.show_stops')}
              title={t('map.show_stops')}
              disabled={nearbyLoading}
            >
              <Icon name={stopsLayerOn ? 'layers' : 'layers'} size={17} aria-hidden="true" />
            </button>
            <button type="button" className="map-ctl" onClick={recenter} aria-label={t('map.recenter')} title={t('map.recenter')}>
              <Icon name="crosshair" size={17} aria-hidden="true" />
            </button>
          </div>

          {zoom != null && (
            <span className="map-zoom-badge" aria-hidden>
              {zoom}
            </span>
          )}

          {/* Legend — collapsed by default; relevant only with route data */}
          {(hasItinerary || alternatives.length > 0) && (
            <div className="map-legend">
              <button
                type="button"
                className="map-legend__toggle"
                onClick={() => setLegendOpen((v) => !v)}
                aria-expanded={legendOpen}
                aria-label={t('map.legend')}
                title={t('map.legend')}
              >
                <Icon name="info" size={15} aria-hidden="true" />
                {t('map.legend')}
                <Icon name="chevronRight" size={13} aria-hidden="true" style={legendOpen ? { transform: 'rotate(90deg)' } : { transform: 'rotate(90deg)' }} />
              </button>
              {legendOpen && (
                <ul className="map-legend__list" role="list">
                  {legendItems.map((item) => (
                    <li key={item.label}>
                      <span
                        aria-hidden="true"
                        style={{
                          background: item.dashed ? 'repeating-linear-gradient(90deg, ' + item.color + ' 0 5px, transparent 5px 8px)' : item.color,
                          borderRadius: item.dashed ? 0 : 2,
                          display: 'inline-block',
                          width: 16,
                          height: 4,
                        }}
                      />
                      {item.label}
                    </li>
                  ))}
                  <li>
                    <span aria-hidden="true" style={{ background: C.surface, border: `2px solid ${C.primaryDark}`, borderRadius: '50%', width: 8, height: 8, display: 'inline-block' }} />
                    {t('map.legend_stop')}
                  </li>
                </ul>
              )}
            </div>
          )}

          {selectedStop != null && (
            <StopPanel
              stop={selectedStop}
              onClose={() => {
                setSelectedStopId(null)
                setSelectedPlace(null)
              }}
              onSelectOrigin={(sel) => {
                onSelectStop?.({ ...sel, target: 'origin' })
                setSelectedStopId(null)
                setSelectedPlace(null)
              }}
              onSelectDestination={(sel) => {
                onSelectStop?.({ ...sel, target: 'destination' })
                setSelectedStopId(null)
                setSelectedPlace(null)
              }}
            />
          )}

          {selectedPlace && (
            <div className="map-place-chip" role="status">
              <Icon name="pin" size={14} aria-hidden="true" />
              <span className="map-place-chip__name">{selectedPlace.name}</span>
              <button
                type="button"
                className="map-place-chip__close"
                onClick={() => setSelectedPlace(null)}
                aria-label="Dismiss selected place"
              >
                <Icon name="close" size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}

      {children}
    </div>
  )
}
