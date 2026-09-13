import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css'
import { Icon } from '../ui/Icon'
import { StopPanel } from '../ui/StopPanel'
import { useI18n } from '../../i18n/LanguageContext'
import { apiRequest } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import {
  BASEMAPS,
  getPreferredLayer,
  setPreferredLayer,
  onMapCommand,
} from '../../map/basemaps'

/**
 * Production map panel built on MapLibre GL JS.
 *
 * Data sources (real only — no decorative geometry):
 * - Base raster tiles: configurable basemap layers (satellite default,
 *   streets, dark) — see src/map/basemaps.js; satellite gracefully falls
 *   back to streets when its tiles fail.
 * - Route polylines: leg.geometry (variant polyline / OSRM walk
 *   geometry) with straight-line fallbacks between leg endpoints.
 * - Stops: leg from/to stops + (optionally) nearby network stops
 *   fetched live from GET /stops (public endpoint).
 * - Markers: origin (ring), destination (dot), current location
 *   (halo + dot), deviation (severity-colored).
 *
 * UX: grouped controls with tooltips (zoom / recenter / locate / stops
 * toggle / layer switcher), a compact legend, selected-place chip, and
 * an honest loading / failure state. No invented data: when the backend
 * returns nothing, the map shows the base network only.
 *
 * Coordinates in props are [lat, lng]; converted to [lng, lat] for MapLibre.
 */

// NOTE: MapLibre raster sources do not expand Leaflet's {r} retina token —
// it gets requested literally and 404s. 256px standard tiles only.
// Satellite/dark layers need brighter, higher-contrast overlay paint;
// the OSM-standard palette stays for the light streets layer.

// Resolved hex values (MapLibre paint properties cannot read CSS variables).
// A satellite/dark base needs brighter overlays than the light streets
// palette — layer-aware variants keep every basemap readable.
const C = {
  primary: '#1a6bb0',
  primaryDark: '#14558b',
  accent: '#d3a044',
  danger: '#c62828',
  walking: '#6b7280',
  surface: '#FFFFFF',
  ink: '#16222e',
}

// Brighter marker/stroke tones that stay legible over satellite imagery
// without repainting the light-layer palette.
const C_SAT = {
  ...C,
  primary: '#4da3e8',
  primaryDark: '#9dc9ef',
  accent: '#ffc94d',
  walking: '#c3ccd6',
  surface: '#FFFFFF',
}

const MODE_COLORS = {
  metro: '#c62828',
  bus: '#1565c0',
  minibus: '#e07c00',
  microbus: '#00897b',
  rail: '#6a3fa0',
  walking: C.walking,
}

const DARK_MODE_COLORS = {
  metro: '#ff7043',
  bus: '#64b5f6',
  minibus: '#ffb74d',
  microbus: '#4dd0c4',
  rail: '#b39ddb',
  walking: '#c3ccd6',
}

// Module-level constant: the dark palette must keep ONE stable object
// identity across renders. Building it inline per render (satellite/dark
// basemaps) made every zoom-badge re-render change this effect dependency,
// re-running the layer effect and yanking the camera back with fitBounds —
// rejecting the user's zoom after a location focus.
const MODE_COLORS_DARK = { ...MODE_COLORS, ...DARK_MODE_COLORS }

const lng = (p) => [p.lng ?? p[1], p.lat ?? p[0]]

/** Draw the live-navigation arrow (points north; rotated by icon-rotate). */
function makeNavigationArrow(color) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.moveTo(size / 2, 6)
  ctx.lineTo(size - 10, size - 8)
  ctx.lineTo(size / 2, size - 20)
  ctx.lineTo(10, size - 8)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineJoin = 'round'
  ctx.stroke()
  return ctx.getImageData(0, 0, size, size)
}

const isFinitePoint = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
const validPin = (p) => Boolean(p) && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))

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
  currentLegIndex = null, // journey progress: completed legs render de-emphasized
  highlightStop = null, // {lat,lng} — visually emphasized stop (e.g. next stop)
  userHeading = null, // device heading in degrees (null = unknown, never faked)
  follow = false, // follow-me: gently keep the live position centered
  onFollowInterrupt = null, // user panned away — caller leaves follow mode
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
  const [layerId, setLayerId] = useState(getPreferredLayer)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  // Compact "Map credits" control: legally required attribution stays
  // accessible one tap away without competing with the journey UI.
  const [creditsOpen, setCreditsOpen] = useState(false)
  // Satellite tiles failing (offline / provider limit) → one-time fallback
  // to streets with an honest notice; the user may still switch back.
  const [tileFallback, setTileFallback] = useState(false)
  const tileErrorCountRef = useRef(0)
  const tileFallbackRef = useRef(false)

  const activeLayer = tileFallback && layerId === 'satellite' ? BASEMAPS.streets : BASEMAPS[layerId]
  const palette = activeLayer.dark ? C_SAT : C
  const modeColors = activeLayer.dark ? MODE_COLORS_DARK : MODE_COLORS

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

        // All basemap layers ship in the initial style; switching is a
        // visibility toggle (instant, no source rebuild, no refetch bugs).
        // Only the visible layer's tiles are ever requested.
        const preferredInit = BASEMAPS[getPreferredLayer()] ?? BASEMAPS.streets
        const visibility = (id) => (id === preferredInit.id ? 'visible' : 'none')

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              'bm-satellite': {
                type: 'raster',
                tiles: [BASEMAPS.satellite.url],
                tileSize: 256,
                attribution: BASEMAPS.satellite.attribution,
                maxzoom: 18,
              },
              'bm-streets': {
                type: 'raster',
                tiles: [BASEMAPS.streets.url],
                tileSize: 256,
                attribution: BASEMAPS.streets.attribution,
                maxzoom: 19,
              },
              'bm-dark': {
                type: 'raster',
                tiles: [BASEMAPS.dark.url],
                tileSize: 256,
                attribution: BASEMAPS.dark.attribution,
                maxzoom: 16, // Esri Dark Gray Canvas tops out at z16; MapLibre overzooms gracefully
              },
            },
            layers: [
              {
                id: 'background',
                type: 'background',
                paint: { 'background-color': preferredInit.dark ? '#101418' : '#E8ECEF' },
              },
              { id: 'bm-satellite-layer', type: 'raster', source: 'bm-satellite', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('satellite') } },
              { id: 'bm-streets-layer', type: 'raster', source: 'bm-streets', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('streets') } },
              { id: 'bm-dark-layer', type: 'raster', source: 'bm-dark', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('dark') } },
            ],
          },
          center: [31.2357, 30.0444], // Cairo
          zoom: 11,
          // Attribution is rendered by the in-product "Map credits" control
          // (compact, toggle-accessible) instead of MapLibre's expanded strip,
          // so provider credit never competes with route-critical UI.
          attributionControl: false,
        })

        map.on('error', (e) => {
          // Tile errors are routine (offline); engine errors disable the map.
          // Repeated basemap tile failures while satellite is active trigger
          // an automatic, honest fallback to streets.
          if (e?.error?.message && /Failed to fetch|NetworkError/i.test(e.error.message)) {
            if (getPreferredLayer() === 'satellite' && !tileFallbackRef.current) {
              tileErrorCountRef.current += 1
              if (tileErrorCountRef.current >= 6) {
                tileFallbackRef.current = true
                setTileFallback(true)
              }
            }
            return
          }
          if (e?.error?.message) {
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

  // ---------- basemap layer switching (visibility toggle, no rebuild) ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    for (const id of ['satellite', 'streets', 'dark']) {
      if (!map.getLayer(`bm-${id}-layer`)) continue
      map.setLayoutProperty(`bm-${id}-layer`, 'visibility', id === activeLayer.id ? 'visible' : 'none')
    }
    // Repaint the background under transparent tile areas to match.
    if (map.getLayer('background')) {
      map.setPaintProperty('background', 'background-color', activeLayer.dark ? '#101418' : '#E8ECEF')
    }
  }, [activeLayer, ready])

  // ---------- external map commands (AI assistant actions) ----------
  useEffect(() => {
    if (!ready) return undefined
    return onMapCommand((command) => {
      const map = mapRef.current
      if (!map) return
      if (command?.type === 'switch_map_layer' && BASEMAPS[command.layer]) {
        setPreferredLayer(command.layer)
        setTileFallback(false)
        tileFallbackRef.current = false
        tileErrorCountRef.current = 0
        setLayerId(command.layer)
      } else if (command?.type === 'focus_map_location'
        && Number.isFinite(command.lat) && Number.isFinite(command.lng)) {
        map.flyTo({
          center: [command.lng, command.lat],
          zoom: Number.isFinite(command.zoom) ? command.zoom : Math.max(map.getZoom(), 14.5),
          duration: 900,
        })
      }
    })
  }, [ready])

  // ---------- follow-me (gentle recenter on live fixes) ----------
  // Only pans — never zooms, never fits, never touches the fit contract.
  // A user drag leaves follow mode (dragstart fires only for real gestures).
  const followRef = useRef(follow)
  followRef.current = follow
  const followInterruptRef = useRef(onFollowInterrupt)
  followInterruptRef.current = onFollowInterrupt

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return undefined
    const interrupt = () => {
      if (followRef.current) followInterruptRef.current?.()
    }
    map.on('dragstart', interrupt)
    map.on('zoomstart', interrupt) // pinch/wheel zoom also signals manual control
    return () => {
      map.off('dragstart', interrupt)
      map.off('zoomstart', interrupt)
    }
  }, [ready])

  useEffect(() => {
    const map = mapRef.current
    if (!follow || !map || !ready || !userLocation) return
    if (!Number.isFinite(Number(userLocation.lat)) || !Number.isFinite(Number(userLocation.lng))) return
    map.easeTo({
      center: [Number(userLocation.lng), Number(userLocation.lat)],
      duration: 800,
    })
  }, [follow, ready, userLocation])

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
      .filter((l) => !['background', 'bm-satellite-layer', 'bm-streets-layer', 'bm-dark-layer'].includes(l.id))
      .forEach((l) => map.getLayer(l.id) && map.removeLayer(l.id))
    Object.keys(style?.sources ?? {})
      .filter((id) => !['bm-satellite', 'bm-streets', 'bm-dark'].includes(id))
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
          'circle-color': palette.surface,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': activeLayer.dark ? '#7d93a8' : '#9db2c4',
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

      // Journey-progress styling: completed legs fade back, the current leg
      // keeps full strength, remaining legs stay clearly visible. Cosmetic
      // only — progress must never move or reset the camera (fitKey is
      // geometry-based and excludes progress entirely).
      const legOpacity = currentLegIndex == null
        ? 1.0
        : ['case',
            ['<', ['get', 'index'], currentLegIndex], 0.3,
            ['==', ['get', 'index'], currentLegIndex], 1.0,
            0.9]

      // Walking segments: dashed, muted.
      map.addLayer({
        id: 'selected-walk',
        type: 'line',
        source: 'selected-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': palette.walking,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 4],
          'line-dasharray': [1.5, 1.5],
          'line-opacity': legOpacity,
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
          'line-color': palette.surface,
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
            'metro', modeColors.metro,
            'minibus', modeColors.minibus,
            'microbus', modeColors.microbus,
            'rail', modeColors.rail,
            modeColors.bus,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 16, 8],
          'line-opacity': legOpacity,
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
          'circle-color': palette.surface,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': palette.primaryDark,
        },
      })
    }

    // -- emphasized stop (e.g. the journey's next stop) --
    // Presentational only: deliberately excluded from the camera-fit inputs
    // so progress updates can never re-frame the view.
    const validHighlight =
      highlightStop && Number.isFinite(Number(highlightStop.lat)) && Number.isFinite(Number(highlightStop.lng))
    if (validHighlight) {
      map.addSource('highlight-stop', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [Number(highlightStop.lng), Number(highlightStop.lat)] },
        },
      })
      map.addLayer({
        id: 'highlight-stop-ring',
        type: 'circle',
        source: 'highlight-stop',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 9, 16, 18],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 3,
          'circle-stroke-color': palette.accent,
        },
      })
      map.addLayer({
        id: 'highlight-stop-dot',
        type: 'circle',
        source: 'highlight-stop',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 8],
          'circle-color': palette.accent,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': palette.surface,
        },
      })
    }

    // -- origin / destination --
    const pinSource = (id, color, coords) => {
      map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords } } })
      map.addLayer({
        id: `${id}-layer`,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 7,
          'circle-color': palette.surface,
          'circle-stroke-width': 3.5,
          'circle-stroke-color': color,
        },
      })
    }
    if (validPin(origin)) pinSource('origin-pin', palette.primary, lng(origin))
    if (validPin(destination)) pinSource('destination-pin', palette.accent, lng(destination))

    // -- user location --
    // Live navigation marker: a device-heading arrow when the device reports
    // a heading, falling back to a stable non-directional marker otherwise.
    // Heading is NEVER fabricated — it only comes from the GPS payload.
    const validUser =
      userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))
    if (validUser) {
      const accuracyM = Number(userLocation.accuracy) || 0
      const headingVal = userHeading != null && Number.isFinite(Number(userHeading)) ? Number(userHeading) : null
      const sourceData = {
        type: 'Feature',
        properties: { heading: headingVal },
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
      if (headingVal != null && maplibreRef.current) {
        // Directional navigation arrow (rotates with device heading).
        if (!map.hasImage('wasel-nav-arrow')) {
          map.addImage('wasel-nav-arrow', makeNavigationArrow(palette.primary), { pixelRatio: 2 })
        }
        map.addLayer({
          id: 'user-arrow',
          type: 'symbol',
          source: 'user',
          filter: ['!=', ['get', 'heading'], ['literal', null]],
          layout: {
            'icon-image': 'wasel-nav-arrow',
            'icon-size': 0.42,
            'icon-rotate': ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': true,
          },
        })
      } else {
        map.addLayer({
          id: 'user-dot',
          type: 'circle',
          source: 'user',
          paint: {
            'circle-radius': 7,
            'circle-color': palette.primary,
            'circle-stroke-width': 2.5,
            'circle-stroke-color': palette.surface,
          },
        })
      }
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
          'circle-color': deviation.severity === 'high' ? C.danger : palette.accent,
          'circle-stroke-width': 3,
          'circle-stroke-color': palette.surface,
        },
      })
    }

    // NOTE: the camera fit lives in its own effect below — deliberately NOT
    // here. Rebuilding layers on a palette/basemap change must never move the
    // camera, and re-running this effect from cosmetic re-renders (zoom
    // badge, panel toggles) must never re-apply the last focus.
  }, [ready, itinerary, alternatives, origin, destination, stops, userLocation, userHeading, deviation, currentLegIndex, highlightStop, clearDynamic, stopsLayerOn, nearby, activeLayer, palette, modeColors])

  // ---------- camera fit (explicit plotted-data changes only) ----------
  // The camera belongs to the user once the focus animation finishes. It is
  // fitted here ONLY when the plotted data genuinely changes: fitKey is a
  // signature of the actual coordinates, so equal-value prop churn (inline
  // literals in parent pages), zoom-badge re-renders, basemap switches and
  // panel toggles can never re-apply the previous focus or reject a zoom.
  const fitPoints = useMemo(() => {
    const points = []
    const validUser =
      userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))
    const validDeviation =
      deviation && Number.isFinite(Number(deviation.lat)) && Number.isFinite(Number(deviation.lng))
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
    return points.filter(isFinitePoint)
  }, [fitTo, itinerary, origin, destination, stops, userLocation, deviation])

  const fitKey = useMemo(
    () => fitPoints.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|'),
    [fitPoints],
  )

  useEffect(() => {
    const map = mapRef.current
    const maplibre = maplibreRef.current
    if (!map || !maplibre || !ready || fitPoints.length === 0) return
    const bounds = new maplibre.LngLatBounds()
    fitPoints.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, { padding: 56, maxZoom: 16.5, duration: 600 })
    // fitKey — not fitPoints identity — decides: equal coordinates must not refit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey])

  const selectLayer = useCallback((id) => {
    if (!BASEMAPS[id]) return
    setPreferredLayer(id)
    setTileFallback(false)
    tileFallbackRef.current = false
    tileErrorCountRef.current = 0
    setLayerId(id)
    setLayerMenuOpen(false)
  }, [])

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
            <div className="map-layer-switch" style={{ position: 'relative' }}>
              <button
                type="button"
                className="map-ctl"
                onClick={() => setLayerMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={layerMenuOpen}
                aria-label={t('map.switch_layer')}
                title={t('map.switch_layer')}
              >
                <Icon name="globe" size={17} aria-hidden="true" />
              </button>
              {layerMenuOpen && (
                <div className="map-layer-menu" role="menu" aria-label={t('map.switch_layer')}>
                  {Object.values(BASEMAPS).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={layerId === layer.id && !tileFallback}
                      className={`map-layer-menu__item${layerId === layer.id && !tileFallback ? ' is-active' : ''}`}
                      onClick={() => selectLayer(layer.id)}
                    >
                      <Icon name={layer.id === 'satellite' ? 'globe' : layer.id === 'dark' ? 'moon' : 'map'} size={14} aria-hidden="true" />
                      {t(`map.layer_${layer.id}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="map-ctl" onClick={recenter} aria-label={t('map.recenter')} title={t('map.recenter')}>
              <Icon name="crosshair" size={17} aria-hidden="true" />
            </button>
          </div>

          {zoom != null && (
            <span className="map-zoom-badge" aria-hidden>
              {zoom}
            </span>
          )}

          {tileFallback && layerId === 'satellite' && (
            <div className="map-fallback-note" role="status">
              <Icon name="info" size={13} aria-hidden="true" />
              {t('map.satellite_fallback')}
            </div>
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

      {/* Compact, compliant provider credits — one tap to the full text.
          Rendered whenever the map is ready (independent of showControls)
          so attribution is always accessible. */}
      {ready && (
        <div className="map-credits">
          {creditsOpen && (
            <div className="map-credits__panel" role="note" aria-label={t('map.credits')}>
              {Object.values(BASEMAPS).map((layer) => (
                <div key={layer.id} className="map-credits__row">
                  <b>{t(`map.layer_${layer.id}`)}</b>
                  <span dangerouslySetInnerHTML={{ __html: layer.attribution }} />
                </div>
              ))}
              <div className="map-credits__row">
                <b>OSRM</b>
                <span>© OpenStreetMap contributors (routing)</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="map-credits__btn"
            onClick={() => setCreditsOpen((v) => !v)}
            aria-expanded={creditsOpen}
            aria-label={t('map.credits')}
            title={t('map.credits')}
          >
            <Icon name="info" size={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {children}
    </div>
  )
}
