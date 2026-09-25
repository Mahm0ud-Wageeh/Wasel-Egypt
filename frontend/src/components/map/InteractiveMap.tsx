import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import maplibregl, { Map as MapLibreMap, Marker, LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Map as MapIcon, Satellite, Moon, Compass, LocateFixed, MapPin, Info, TriangleAlert, Navigation } from 'lucide-react'
import { EGYPT_STATIONS, TRANSIT_LINES, Station } from '../../data/egyptTransitData'
import { apiRequest } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import { forwardOffsetLocation } from '../../utils/geo/navigationMath'
import { ModeIcon, MAP_LAYER_COLORS } from '../icons'
import StopPanel from './StopPanel'

export type BasemapType = 'streets' | 'satellite' | 'dark'
export type TransitModeFilter = 'all' | 'metro' | 'lrt' | 'monorail' | 'train' | 'brt'

/** Satellite reference tiles include dense place and road labels, so only draw
 * them when the rider explicitly asks for that level of detail. */
export function satelliteReferenceVisibility(layer: BasemapType, detailsEnabled: boolean): 'visible' | 'none' {
  return layer === 'satellite' && detailsEnabled ? 'visible' : 'none'
}

type MapStationDensity = { isInterchange?: boolean; modes: readonly string[] }

/** Keep a national view legible: interchange points first, local stops on zoom. */
export function stationsForMapZoom<T extends MapStationDensity>(
  stations: readonly T[],
  mode: TransitModeFilter,
  zoom: number | null,
): T[] {
  const currentZoom = Number(zoom ?? 0)
  if (currentZoom < 11.5) return [] // At national/city-wide zoom, keep map clean and uncluttered
  const matching = stations.filter((station) => mode === 'all' || station.modes.includes(mode))
  if (currentZoom < 13.5) {
    // At medium zoom: show only major transfer and interchange stations
    return matching.filter((station) => station.isInterchange)
  }
  // At high zoom: show all matching transit stops
  return matching
}

/** Network feeds use both `train` and `rail`; present them as one rider-facing mode. */
export function matchesMapMode(mode: string | undefined, filter: TransitModeFilter): boolean {
  if (filter === 'all') return true
  return mode === filter || (filter === 'train' && mode === 'rail')
}

interface RoutePoint {
  lat: number
  lng: number
}

export interface MapItineraryLeg {
  type?: string
  mode?: string
  geometry?: Array<[number, number] | { lat: number; lng: number }>
  from_lat?: number | string
  from_lng?: number | string
  to_lat?: number | string
  to_lng?: number | string
  from_stop?: { lat?: number | string; latitude?: number | string; lng?: number | string; longitude?: number | string; name?: string; id?: number | string }
  to_stop?: { lat?: number | string; latitude?: number | string; lng?: number | string; longitude?: number | string; name?: string; id?: number | string }
}

export interface MapItinerary {
  legs?: MapItineraryLeg[]
}

/** A real network polyline from the backend (stored [lat,lng] → pass [lng,lat]). */
export interface NetworkShape {
  coords: Array<[number, number]> // [lng, lat]
  color: string
  mode?: string
  name?: string
}

interface Props {
  center?: [number, number] // [lng, lat]
  zoom?: number
  darkMode?: boolean
  userLocation?: { lat: number; lng: number; accuracy?: number } | null
  userHeading?: number | null
  userSpeed?: number
  activeRoutePoints?: RoutePoint[]
  activeLineId?: string | null
  // ── Production itinerary rendering (real backend leg.geometry) ──
  origin?: { lat: number; lng: number } | null
  destination?: { lat: number; lng: number } | null
  itinerary?: MapItinerary | null
  alternatives?: MapItinerary[]
  stops?: Array<{ lat: number; lng: number; name?: string; id?: number | string }>
  // Real network polylines (backend geometries). When provided with
  // hideSchematic, they replace the straight-line schematic overlay.
  networkShapes?: NetworkShape[]
  hideSchematic?: boolean
  deviation?: { lat: number; lng: number; severity?: string } | null
  currentLegIndex?: number | null
  highlightStop?: { lat: number; lng: number } | null
  // ── Navigation / follow ──
  follow?: boolean
  onFollowInterrupt?: () => void
  onRecenter?: () => void
  navigationMode?: boolean
  fitTo?: 'route' | 'origin' | 'user'
  showNearbyStops?: boolean
  onMapClick?: (pt: { lat: number; lng: number }) => void
  onSelectStop?: (sel: { id: number | string; name: string; latitude: number; longitude: number; target?: string }) => void
  onStationSelect?: (station: Station) => void
  onPlanFrom?: (station: Station) => void
  onPlanTo?: (station: Station) => void
  className?: string
  interactive?: boolean
  showControls?: boolean
  lang?: 'ar' | 'en'
  t?: (ar: string, en: string) => string
  /** v2.0: active transit mode filter from the map screen HUD */
  modeFilter?: 'all' | 'metro' | 'lrt' | 'monorail' | 'brt' | 'train'
  /** v2.0: enable 52° 3D pitch view */
  pitch3D?: boolean
}

const STORAGE_KEY = 'wasel.map.layer'

function defaultLayer(): BasemapType {
  const envDefault = typeof process !== 'undefined' ? (process.env?.NEXT_PUBLIC_MAP_DEFAULT_LAYER || (process.env as any)?.VITE_MAP_DEFAULT_LAYER) : null
  if (envDefault === 'streets' || envDefault === 'satellite' || envDefault === 'dark') return envDefault
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'streets' || saved === 'satellite' || saved === 'dark') return saved
  } catch { /* private mode */ }
  return 'streets'
}

function tileUrl(kind: 'satellite' | 'streets' | 'dark'): string {
  const env: any = typeof process !== 'undefined' ? (process.env || {}) : {}
  if (kind === 'satellite') return env.NEXT_PUBLIC_MAP_SATELLITE_TILES_URL || env.VITE_MAP_SATELLITE_TILES_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  if (kind === 'dark') return env.NEXT_PUBLIC_MAP_DARK_TILES_URL || env.VITE_MAP_DARK_TILES_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  return env.NEXT_PUBLIC_MAP_TILES_URL || env.NEXT_PUBLIC_MAP_STREETS_TILES_URL || env.VITE_MAP_TILES_URL || env.VITE_MAP_STREETS_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
}

// Esri reference overlays: boundaries/places + transportation labels.
// Rendered above satellite imagery so streets, districts, shops and POIs
// stay readable at high zoom — the "full detail" satellite experience.
const SAT_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const SAT_ROADS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'

function persistLayer(id: BasemapType) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
}

const MODE_COLORS: Record<string, string> = {
  metro: MAP_LAYER_COLORS.metroRed,
  bus: MAP_LAYER_COLORS.busBlue,
  minibus: MAP_LAYER_COLORS.minibusOrange,
  microbus: MAP_LAYER_COLORS.microbusTeal,
  rail: MAP_LAYER_COLORS.railPurple,
  train: MAP_LAYER_COLORS.trainPurple,
  lrt: MAP_LAYER_COLORS.lrtGreen,
  monorail: MAP_LAYER_COLORS.monorailAmber,
  brt: MAP_LAYER_COLORS.brtCyan,
  walking: MAP_LAYER_COLORS.walkingDash,
}

const MODE_COLORS_DARK: Record<string, string> = {
  ...MODE_COLORS,
  metro: MAP_LAYER_COLORS.metroOrange,
  bus: MAP_LAYER_COLORS.busLightBlue,
  minibus: MAP_LAYER_COLORS.minibusYellow,
  microbus: MAP_LAYER_COLORS.microbusMint,
  rail: MAP_LAYER_COLORS.railLavender,
  walking: MAP_LAYER_COLORS.walkingMuted,
}

/** Draw the Google Maps-grade live navigation puck with radiant forward light beam */
function makeNavigationArrow(color = MAP_LAYER_COLORS.activeBlue): HTMLCanvasElement {
  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const beamGrad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, 44)
  beamGrad.addColorStop(0, 'rgba(37, 99, 235, 0.45)')
  beamGrad.addColorStop(1, 'rgba(37, 99, 235, 0)')
  ctx.beginPath()
  ctx.moveTo(size / 2, size / 2)
  ctx.arc(size / 2, size / 2, 44, (-65 * Math.PI) / 180, (-115 * Math.PI) / 180, true)
  ctx.closePath()
  ctx.fillStyle = beamGrad
  ctx.fill()

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, 14, 0, 2 * Math.PI)
  ctx.fillStyle = MAP_LAYER_COLORS.white
  ctx.shadowColor = 'rgba(0,0,0,0.32)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fill()
  ctx.shadowColor = 'transparent'

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, 11, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(size / 2, size / 2 - 17)
  ctx.lineTo(size / 2 + 7, size / 2 - 3)
  ctx.lineTo(size / 2, size / 2 - 7)
  ctx.lineTo(size / 2 - 7, size / 2 - 3)
  ctx.closePath()
  ctx.fillStyle = MAP_LAYER_COLORS.white
  ctx.fill()

  return canvas
}

const isFinitePoint = (p: any) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])

/** Normalize a leg.geometry point ([lat,lng] or {lat,lng}) to [lng,lat] for MapLibre. */
function legGeometryToLngLat(leg: MapItineraryLeg): Array<[number, number]> {
  const out: Array<[number, number]> = []
  if (Array.isArray(leg.geometry)) {
    for (const p of leg.geometry) {
      if (Array.isArray(p)) {
        const lat = Number(p[0]); const lng = Number(p[1])
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lng, lat])
      } else if (p && typeof p === 'object') {
        const lat = Number((p as any).lat); const lng = Number((p as any).lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lng, lat])
      }
    }
  }
  if (out.length < 2) {
    const fLat = Number(leg.from_lat ?? leg.from_stop?.lat ?? (leg.from_stop as any)?.latitude)
    const fLng = Number(leg.from_lng ?? leg.from_stop?.lng ?? (leg.from_stop as any)?.longitude)
    const tLat = Number(leg.to_lat ?? leg.to_stop?.lat ?? (leg.to_stop as any)?.latitude)
    const tLng = Number(leg.to_lng ?? leg.to_stop?.lng ?? (leg.to_stop as any)?.longitude)
    if (Number.isFinite(fLat) && Number.isFinite(fLng) && Number.isFinite(tLat) && Number.isFinite(tLng)) {
      return [[fLng, fLat], [tLng, tLat]]
    }
  }
  return out
}

function itineraryToFeatures(itinerary: MapItinerary | null | undefined, kind: string) {
  const features: any[] = []
  ;(itinerary?.legs ?? []).forEach((leg, idx) => {
    const coords = legGeometryToLngLat(leg)
    if (coords.length < 2) return
    const legType = leg.type ?? (leg.mode === 'walking' ? 'walking' : 'transit')
    const hasDetailedGeometry = Array.isArray(leg.geometry) && leg.geometry.length > 2
    features.push({
      type: 'Feature',
      properties: {
        kind,
        legType,
        mode: leg.mode ?? legType,
        index: idx,
        isEstimated: !hasDetailedGeometry && legType !== 'walking',
      },
      geometry: { type: 'LineString', coordinates: coords },
    })
  })
  return features
}

function normalizeStops(stops: any[]) {
  const seen = new Set<string>()
  const out: Array<{ id: number | string; name: string; lat: number; lng: number }> = []
  for (const s of stops ?? []) {
    const lat = Number(s.lat ?? s.latitude)
    const lng = Number(s.lng ?? s.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const key = String(s.id ?? `${lat.toFixed(5)},${lng.toFixed(5)}`)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: s.id ?? key, name: s.name ?? '', lat, lng })
  }
  return out
}

function itineraryStops(itinerary: MapItinerary | null | undefined) {
  const out: any[] = []
  for (const leg of itinerary?.legs ?? []) {
    for (const key of ['from_stop', 'to_stop'] as const) {
      const s = (leg as any)[key]
      if (s && (s.lat != null || s.latitude != null)) out.push(s)
    }
  }
  return normalizeStops(out)
}

export default function InteractiveMap({
  center = [31.2357, 30.0444],
  zoom = 12,
  darkMode = false,
  userLocation,
  userHeading,
  userSpeed = 0,
  activeRoutePoints,
  activeLineId,
  origin = null,
  destination = null,
  itinerary = null,
  alternatives = [],
  stops = [],
  networkShapes = [],
  hideSchematic = false,
  deviation = null,
  currentLegIndex = null,
  highlightStop = null,
  follow = false,
  onFollowInterrupt,
  onRecenter,
  navigationMode = false,
  fitTo = 'route',
  showNearbyStops = false,
  onMapClick,
  onSelectStop,
  onStationSelect,
  onPlanFrom,
  onPlanTo,
  className = 'w-full h-full min-h-[300px]',
  interactive = true,
  showControls = true,
  lang = 'ar',
  t,
  modeFilter: modeFilterProp = 'all',
  pitch3D: pitch3DProp = false,
}: Props) {
  const tt = t ?? ((ar: string, _en: string) => ar)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<Marker | null>(null)
  const userMarkerElRef = useRef<HTMLDivElement | null>(null)
  const stationMarkersRef = useRef<Marker[]>([])

  // v2.0: When darkMode=true (MapScreen v2), default to dark basemap
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>(() => {
    const saved = defaultLayer()
    if (darkMode && saved !== 'dark' && saved !== 'satellite') return 'dark'
    return saved
  })
  // v2.0: pitch3D can be driven by parent prop (MapScreen HUD toggle)
  const [pitch3D, setPitch3D] = useState(pitch3DProp)
  const [headingUp, setHeadingUp] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<number | null>(null)
  const [selectedStop, setSelectedStop] = useState<{ id: number | string; name: string; lat?: number; lng?: number } | null>(null)
  const [modeFilter, setModeFilter] = useState<TransitModeFilter>('all')
  const [legendOpen, setLegendOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [satelliteDetails, setSatelliteDetails] = useState(false)
  const [displaced, setDisplaced] = useState(false)
  const [tileFallback, setTileFallback] = useState(false)
  const [nearby, setNearby] = useState<Array<{ id: number | string; name: string; lat: number; lng: number }>>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [stopsLayerOn, setStopsLayerOn] = useState(showNearbyStops)
  const tileErrorCountRef = useRef(0)
  const tileFallbackRef = useRef(false)
  const hasInitialFitRef = useRef(false)

  const effectiveLayer: BasemapType = tileFallback && activeBasemap === 'satellite' ? 'streets' : activeBasemap
  const isDarkBase = effectiveLayer === 'dark' || effectiveLayer === 'satellite' || darkMode
  const modeColors = isDarkBase ? MODE_COLORS_DARK : MODE_COLORS

  useEffect(() => { setStopsLayerOn(showNearbyStops) }, [showNearbyStops])

  // v2.0: Sync pitch3D from parent prop (MapScreen HUD toggle)
  useEffect(() => {
    setPitch3D(pitch3DProp)
    const map = mapRef.current
    if (!map) return
    try { map.easeTo({ pitch: pitch3DProp ? 52 : 0, duration: 600 }) } catch { /* ignore */ }
  }, [pitch3DProp])

  // v2.0: Sync modeFilter from parent prop to internal state
  useEffect(() => { setModeFilter(modeFilterProp as TransitModeFilter) }, [modeFilterProp])

  const selectLayer = useCallback((id: BasemapType) => {
    persistLayer(id)
    setTileFallback(false)
    tileFallbackRef.current = false
    tileErrorCountRef.current = 0
    setActiveBasemap(id)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!mapRef.current) return
      if (detail?.type === 'flyTo' && detail.center) {
        hasInitialFitRef.current = true
        mapRef.current.flyTo({ center: detail.center, zoom: detail.zoom || 14, essential: true })
      } else if (detail?.type === 'switch_map_layer' && (detail.layer === 'satellite' || detail.layer === 'streets' || detail.layer === 'dark')) {
        selectLayer(detail.layer)
      } else if (detail?.type === 'setLayer' && (detail.layer === 'satellite' || detail.layer === 'streets' || detail.layer === 'dark')) {
        selectLayer(detail.layer)
      } else if (detail?.type === 'pitch') {
        mapRef.current.easeTo({ pitch: detail.pitch ?? 52 })
      } else if (detail?.type === 'toggle_3d') {
        toggle3DRef.current()
      } else if (detail?.type === 'locate_me') {
        handleLocateMeRef.current()
      } else if (detail?.type === 'nearby_on') {
        setStopsLayerOn(true)
      } else if (detail?.type === 'focus_map_location' && Number.isFinite(detail.lat) && Number.isFinite(detail.lng)) {
        hasInitialFitRef.current = true
        mapRef.current.flyTo({ center: [detail.lng, detail.lat], zoom: Number.isFinite(detail.zoom) ? detail.zoom : 14.5, duration: 900 })
      }
    }
    window.addEventListener('wasel:map-command', handler)
    return () => window.removeEventListener('wasel:map-command', handler)
  }, [selectLayer])

  // 1. Initialize Map — all 3 basemaps ship in one style; switching = visibility toggle
  useEffect(() => {
    if (!mapContainer.current) return
    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    try {
      ;(maplibregl as any).setWorkerUrl?.('/map/maplibre-gl-worker.mjs')
    } catch { /* default resolution */ }

    const visibility = (id: string) => (id === effectiveLayer ? 'visible' : 'none')

    let map: MapLibreMap
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'bm-satellite': { type: 'raster', tiles: [tileUrl('satellite')], tileSize: 256, attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics', maxzoom: 18 } as any,
            'bm-sat-labels': { type: 'raster', tiles: [SAT_LABELS_URL], tileSize: 256, maxzoom: 18 } as any,
            'bm-sat-roads': { type: 'raster', tiles: [SAT_ROADS_URL], tileSize: 256, maxzoom: 18 } as any,
            'bm-streets': { type: 'raster', tiles: [tileUrl('streets')], tileSize: 256, attribution: '© OpenStreetMap contributors', maxzoom: 19 } as any,
            'bm-dark': { type: 'raster', tiles: [tileUrl('dark')], tileSize: 256, attribution: 'Tiles © Esri — Esri, DeLorme, NAVTEQ', maxzoom: 16 } as any,
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': isDarkBase ? MAP_LAYER_COLORS.bgDark : MAP_LAYER_COLORS.bgLight } } as any,
            { id: 'bm-satellite-layer', type: 'raster', source: 'bm-satellite', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('satellite') } } as any,
            { id: 'bm-sat-roads-layer', type: 'raster', source: 'bm-sat-roads', minzoom: 0, maxzoom: 24, layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } } as any,
            { id: 'bm-sat-labels-layer', type: 'raster', source: 'bm-sat-labels', minzoom: 0, maxzoom: 24, layout: { visibility: 'none' } } as any,
            { id: 'bm-streets-layer', type: 'raster', source: 'bm-streets', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('streets') } } as any,
            { id: 'bm-dark-layer', type: 'raster', source: 'bm-dark', minzoom: 0, maxzoom: 24, layout: { visibility: visibility('dark') } } as any,
          ],
        },
        center,
        zoom,
        pitch: pitch3D ? 52 : 0,
        interactive,
        attributionControl: false,
      })
    } catch {
      setMapFailed(true)
      return
    }

    mapRef.current = map

    map.on('error', (e: any) => {
      if (e?.error?.message && /Failed to fetch|NetworkError/i.test(e.error.message)) {
        if (activeBasemap === 'satellite' && !tileFallbackRef.current) {
          tileErrorCountRef.current += 1
          if (tileErrorCountRef.current >= 6) {
            tileFallbackRef.current = true
            setTileFallback(true)
          }
        }
        return
      }
      if (e?.error?.message) console.error('MapLibre error:', e.error.message)
    })

    const onMapReady = () => {
      if (disposed) return
      setMapLoaded(true)
      try {
        setZoomLevel(Math.round(map.getZoom()))
        map.resize()
      } catch { /* ignore */ }
    }
    map.on('load', onMapReady)
    if (map.loaded() || map.isStyleLoaded()) {
      onMapReady()
    }
    map.on('zoom', () => { try { setZoomLevel(Math.round(map.getZoom())) } catch { /* ignore */ } })
    const interrupt = () => {
      setDisplaced(true)
      if (followRef.current) followInterruptRef.current?.()
    }
    map.on('dragstart', interrupt)
    map.on('zoomstart', interrupt)
    map.on('pitchstart', interrupt)
    map.on('rotatestart', interrupt)

    map.on('click', (e: any) => {
      try {
        const layers = ['stops-halo', 'nearby-halo'].filter((id) => map.getLayer(id))
        const features = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : []
        if (features.length > 0) {
          const f = features[0]
          const plat = f.geometry.coordinates[1]
          const plng = f.geometry.coordinates[0]
          setSelectedStop({
            id: f.properties.stop_id ?? `geo_${plat.toFixed(5)},${plng.toFixed(5)}`,
            name: f.properties.name || tt('محطة مختارة', 'Selected stop'),
            lat: plat,
            lng: plng,
          })
          return
        }
      } catch { /* fall through */ }
      setSelectedStop(null)
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })

    if (typeof window !== 'undefined') (window as any).__waselMap = map
    try {
      resizeObserver = new ResizeObserver(() => { try { map.resize() } catch { /* ignore */ } })
      if (mapContainer.current) resizeObserver.observe(mapContainer.current)
    } catch { /* ignore */ }

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      try { map.remove() } catch { /* ignore */ }
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Basemap visibility toggle (no rebuild — instant, no refetch bugs)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    try {
      for (const id of ['satellite', 'streets', 'dark'] as BasemapType[]) {
        if (!map.getLayer(`bm-${id}-layer`)) continue
        map.setLayoutProperty(`bm-${id}-layer`, 'visibility', id === effectiveLayer ? 'visible' : 'none')
      }
      // Reference overlays are intentionally opt-in: the provider's road and
      // place labels become noisy when layered over imagery at a wide zoom.
      const referenceVisible = satelliteReferenceVisibility(effectiveLayer, satelliteDetails)
      for (const overlay of ['bm-sat-labels-layer', 'bm-sat-roads-layer']) {
        if (map.getLayer(overlay)) map.setLayoutProperty(overlay, 'visibility', referenceVisible)
      }
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', isDarkBase ? MAP_LAYER_COLORS.bgDark : MAP_LAYER_COLORS.bgLight)
      }
    } catch { /* style not ready */ }
  }, [effectiveLayer, isDarkBase, mapLoaded, satelliteDetails])

  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const followRef = useRef(follow)
  followRef.current = follow
  const followInterruptRef = useRef(onFollowInterrupt)
  followInterruptRef.current = onFollowInterrupt

  // ── Nearby live stops (public endpoint, view-bounded) ──
  const fetchNearbyStops = useCallback(async (c: { lat: number; lng: number }, currentZoom: number) => {
    if (currentZoom < 12) return
    setNearbyLoading(true)
    try {
      const radiusDeg = Math.max(0.012, 0.02 * Math.pow(2, 13 - currentZoom))
      const bbox = [
        (c.lng - radiusDeg).toFixed(4),
        (c.lat - radiusDeg).toFixed(4),
        (c.lng + radiusDeg).toFixed(4),
        (c.lat + radiusDeg).toFixed(4),
      ].join(',')
      const res = await apiRequest<any>(`${endpoints.public.stops}?per_page=40&bbox=${encodeURIComponent(bbox)}`, { auth: false }).catch(() => null)
      const data = res?.data ?? res
      const list = Array.isArray(data) ? data : data?.data ?? []
      if (Array.isArray(list)) setNearby(normalizeStops(list))
    } finally {
      setNearbyLoading(false)
    }
  }, [])

  const toggleStopsLayer = useCallback(() => {
    setStopsLayerOn((on) => {
      const next = !on
      if (next && nearby.length === 0 && mapRef.current) {
        try {
          const c = mapRef.current.getCenter()
          fetchNearbyStops({ lat: c.lat, lng: c.lng }, mapRef.current.getZoom())
        } catch { /* ignore */ }
      }
      return next
    })
  }, [nearby.length, fetchNearbyStops])

  // ── Render all dynamic layers ──
  const routeStops = useMemo(
    () => normalizeStops([...itineraryStops(itinerary), ...(stops ?? [])]),
    [itinerary, stops],
  )
  const contextStops = useMemo(
    () => (stopsLayerOn ? nearby.filter((s) => !routeStops.some((r) => r.lat === s.lat && r.lng === s.lng)) : []),
    [stopsLayerOn, nearby, routeStops],
  )
  const activeRouteCoords = useMemo(() => {
    if (itinerary?.legs?.length) {
      const pts: Array<[number, number]> = []
      for (const leg of itinerary.legs) {
        const c = legGeometryToLngLat(leg)
        for (const p of c) {
          const last = pts[pts.length - 1]
          if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p)
        }
      }
      if (pts.length >= 2) return pts
    }
    if (activeRoutePoints && activeRoutePoints.length >= 2) {
      const valid = activeRoutePoints
        .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
        .map((p) => [Number(p.lng), Number(p.lat)] as [number, number])
      if (valid.length >= 2) return valid
    }
    return []
  }, [itinerary, activeRoutePoints])

  const legOpacity = useMemo(() => {
    if (currentLegIndex == null) return 1.0
    return ['case', ['<', ['get', 'index'], currentLegIndex], 0.3, ['==', ['get', 'index'], currentLegIndex], 1.0, 0.9] as any
  }, [currentLegIndex])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const clearDynamic = () => {
      try {
        const style = map.getStyle()
        const keep = ['background', 'bm-satellite-layer', 'bm-sat-labels-layer', 'bm-sat-roads-layer', 'bm-streets-layer', 'bm-dark-layer']
        ;(style?.layers ?? [])
          .filter((l: any) => !keep.includes(l.id))
          .forEach((l: any) => { if (map.getLayer(l.id)) map.removeLayer(l.id) })
        Object.keys(style?.sources ?? {})
          .filter((id) => !['bm-satellite', 'bm-sat-labels', 'bm-sat-roads', 'bm-streets', 'bm-dark'].includes(id))
          .forEach((id) => { try { if (map.getSource(id)) map.removeSource(id) } catch { /* ignore */ } })
      } catch { /* ignore */ }
    }
    clearDynamic()

    const addLineLayers = (sourceId: string, features: any[], kind: 'selected' | 'alternative' | 'simple') => {
      map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } })
      if (kind === 'alternative') {
        map.addLayer({
          id: `${sourceId}-line`, type: 'line', source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
          paint: { 'line-color': MAP_LAYER_COLORS.slateLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 5] } as any,
        })
        return
      }
      if (kind === 'simple') {
        map.addLayer({
          id: `${sourceId}-casing`, type: 'line', source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
          paint: { 'line-color': MAP_LAYER_COLORS.activeBlueGlow, 'line-width': 8, 'line-opacity': 0.35 } as any,
        })
        map.addLayer({
          id: `${sourceId}-core`, type: 'line', source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
          paint: { 'line-color': MAP_LAYER_COLORS.activeBlue, 'line-width': 4.5, 'line-dasharray': [2, 1] } as any,
        })
        return
      }
      map.addLayer({
        id: `${sourceId}-walk`, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
        paint: {
          'line-color': modeColors.walking, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 4],
          'line-dasharray': [1.5, 1.5], 'line-opacity': legOpacity,
        } as any,
        filter: ['==', ['get', 'legType'], 'walking'],
      })
      // Real transit geometry (road/rail following)
      map.addLayer({
        id: `${sourceId}-casing`, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
        paint: { 'line-color': MAP_LAYER_COLORS.white, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 7, 16, 11], 'line-opacity': 0.85 } as any,
        filter: ['all', ['==', ['get', 'legType'], 'transit'], ['!=', ['get', 'isEstimated'], true]],
      })
      map.addLayer({
        id: `${sourceId}-transit`, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
        paint: {
          'line-color': ['match', ['get', 'mode'],
            'metro', modeColors.metro, 'bus', modeColors.bus, 'minibus', modeColors.minibus,
            'microbus', modeColors.microbus, 'rail', modeColors.rail, 'train', modeColors.train,
            'lrt', modeColors.lrt, 'monorail', modeColors.monorail, 'brt', modeColors.brt,
            modeColors.bus] as any,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 16, 8], 'line-opacity': legOpacity,
        } as any,
        filter: ['all', ['==', ['get', 'legType'], 'transit'], ['!=', ['get', 'isEstimated'], true]],
      })
      // Estimated transit corridors (intercity connections without turn-by-turn road shapes)
      map.addLayer({
        id: `${sourceId}-estimated-casing`, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
        paint: {
          'line-color': isDarkBase ? MAP_LAYER_COLORS.darkPin : MAP_LAYER_COLORS.white,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 9],
          'line-opacity': 0.5,
        } as any,
        filter: ['all', ['==', ['get', 'legType'], 'transit'], ['==', ['get', 'isEstimated'], true]],
      })
      map.addLayer({
        id: `${sourceId}-estimated`, type: 'line', source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' } as any,
        paint: {
          'line-color': ['match', ['get', 'mode'],
            'metro', modeColors.metro, 'bus', modeColors.bus, 'minibus', modeColors.minibus,
            'microbus', modeColors.microbus, 'rail', modeColors.rail, 'train', modeColors.train,
            'lrt', modeColors.lrt, 'monorail', modeColors.monorail, 'brt', modeColors.brt,
            modeColors.bus] as any,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 16, 6],
          'line-dasharray': [4, 2],
          'line-opacity': legOpacity,
        } as any,
        filter: ['all', ['==', ['get', 'legType'], 'transit'], ['==', ['get', 'isEstimated'], true]],
      })
    }

    try {
      // Nearby context stops
      if (contextStops.length > 0) {
        map.addSource('nearby-stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: contextStops.map((s) => ({
              type: 'Feature', properties: { name: s.name, stop_id: Number.isFinite(Number(s.id)) ? Number(s.id) : null },
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            })),
          },
        })
        map.addLayer({
          id: 'nearby-halo', type: 'circle', source: 'nearby-stops',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 5],
            'circle-color': MAP_LAYER_COLORS.white, 'circle-stroke-width': 1.5,
            'circle-stroke-color': isDarkBase ? MAP_LAYER_COLORS.outlineDark : MAP_LAYER_COLORS.outlineLight,
          } as any,
        })
      }

      const selFeatures = itineraryToFeatures(itinerary, 'selected')
      const hasActiveRoute = selFeatures.length > 0 || activeRouteCoords.length >= 2

      // 1. Local transit network lines (schematic context under everything).
      // Only drawn when no active route is being inspected AND no real networkShapes are provided.
      if (!hasActiveRoute && !activeLineId && !hideSchematic && networkShapes.length === 0) {
        const lineFeatures = TRANSIT_LINES
          .filter((line) => modeFilter === 'all' || line.mode === modeFilter)
          .map((line) => ({
            type: 'Feature',
            properties: { id: line.id, name: line.name_ar, color: line.color, mode: line.mode },
            geometry: { type: 'LineString', coordinates: line.stations.map((s) => [s.lng, s.lat]) },
          }))
        if (lineFeatures.length > 0) {
          map.addSource('transit-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: lineFeatures } })
          map.addLayer({
            id: 'transit-lines-casing', type: 'line', source: 'transit-lines',
            layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
            paint: {
              'line-color': isDarkBase ? MAP_LAYER_COLORS.darkPin : MAP_LAYER_COLORS.white,
              'line-width': modeFilter === 'all'
                ? ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 5]
                : ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8],
              'line-opacity': modeFilter === 'all' ? 0.55 : 0.85,
            } as any,
          })
          map.addLayer({
            id: 'transit-lines-core', type: 'line', source: 'transit-lines',
            layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': modeFilter === 'all'
                ? ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 3.5]
                : ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 5.5],
              'line-opacity': modeFilter === 'all' ? 0.75 : 0.95,
            } as any,
          })
        }
      }

      // 2. Real network shapes from the backend (true geography, mode-colored).
      if (!hasActiveRoute && networkShapes.length > 0) {
        const feats = networkShapes
          .filter((s) => s.coords.length >= 2 && matchesMapMode(s.mode, modeFilter))
          .map((s) => ({
            type: 'Feature',
            properties: { color: s.color, mode: s.mode ?? '', name: s.name ?? '' },
            geometry: { type: 'LineString', coordinates: s.coords },
          }))
        if (feats.length > 0) {
          map.addSource('network-shapes', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } })
          map.addLayer({
            id: 'network-shapes-casing', type: 'line', source: 'network-shapes',
            layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
            paint: {
              'line-color': isDarkBase ? MAP_LAYER_COLORS.darkPin : MAP_LAYER_COLORS.white,
              'line-width': modeFilter === 'all'
                ? ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 5]
                : ['interpolate', ['linear'], ['zoom'], 10, 4.5, 15, 8],
              'line-opacity': modeFilter === 'all' ? 0.55 : 0.85,
            } as any,
          })
          map.addLayer({
            id: 'network-shapes-core', type: 'line', source: 'network-shapes',
            layout: { 'line-cap': 'round', 'line-join': 'round' } as any,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': modeFilter === 'all'
                ? ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 3.5]
                : ['interpolate', ['linear'], ['zoom'], 10, 3.0, 15, 5.5],
              'line-opacity': modeFilter === 'all' ? 0.75 : 0.95,
            } as any,
          })
        }
      }

      // 3. Alternatives (context, grey)
      alternatives.forEach((alt, i) => {
        const feats = itineraryToFeatures(alt, 'alternative')
        if (feats.length) addLineLayers(`alt-route-${i}`, feats, 'alternative')
      })

      // 4. Selected itinerary OR simple active-route polyline (rendered above background)
      if (selFeatures.length > 0) {
        addLineLayers('selected-route', selFeatures, 'selected')
      } else if (activeRouteCoords.length >= 2) {
        addLineLayers('active-route', [{
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: activeRouteCoords },
        }], 'simple')
      }

      // Route stops (interactive)
      if (routeStops.length > 0) {
        map.addSource('stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: routeStops.map((s) => ({
              type: 'Feature',
              properties: {
                name: (s as any).name_ar || s.name,
                name_en: s.name,
                is_interchange: Boolean((s as any).is_interchange),
                parent_station_id: (s as any).parent_station_id || null,
                stop_id: Number.isFinite(Number(s.id)) ? Number(s.id) : null,
              },
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            })),
          },
        })
        map.addLayer({
          id: 'stops-halo', type: 'circle', source: 'stops',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 7],
            'circle-color': ['case', ['get', 'is_interchange'], MAP_LAYER_COLORS.activeBlue, MAP_LAYER_COLORS.white],
            'circle-stroke-width': ['case', ['get', 'is_interchange'], 3, 2],
            'circle-stroke-color': ['case', ['get', 'is_interchange'], MAP_LAYER_COLORS.white, MAP_LAYER_COLORS.originStroke],
          } as any,
        })
      }

      // Highlighted stop (e.g. next stop) — presentational only
      if (highlightStop && Number.isFinite(Number(highlightStop.lat)) && Number.isFinite(Number(highlightStop.lng))) {
        map.addSource('highlight-stop', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [Number(highlightStop.lng), Number(highlightStop.lat)] } },
        })
        map.addLayer({
          id: 'highlight-stop-ring', type: 'circle', source: 'highlight-stop',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 9, 16, 18],
            'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 3, 'circle-stroke-color': MAP_LAYER_COLORS.destPin,
          } as any,
        })
        map.addLayer({
          id: 'highlight-stop-dot', type: 'circle', source: 'highlight-stop',
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 8], 'circle-color': MAP_LAYER_COLORS.destPin, 'circle-stroke-width': 2.5, 'circle-stroke-color': MAP_LAYER_COLORS.white } as any,
        })
      }

      // Origin / destination pins
      const pinSource = (id: string, color: string, coords: [number, number]) => {
        map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords } } })
        map.addLayer({
          id: `${id}-layer`, type: 'circle', source: id,
          paint: { 'circle-radius': 7, 'circle-color': MAP_LAYER_COLORS.white, 'circle-stroke-width': 3.5, 'circle-stroke-color': color } as any,
        })
      }
      if (origin && Number.isFinite(Number(origin.lat)) && Number.isFinite(Number(origin.lng))) {
        pinSource('origin-pin', MAP_LAYER_COLORS.originPin, [Number(origin.lng), Number(origin.lat)])
      } else if (activeRouteCoords.length >= 2) {
        pinSource('origin-pin', MAP_LAYER_COLORS.originPin, activeRouteCoords[0])
      }
      if (destination && Number.isFinite(Number(destination.lat)) && Number.isFinite(Number(destination.lng))) {
        pinSource('destination-pin', MAP_LAYER_COLORS.destPin, [Number(destination.lng), Number(destination.lat)])
      } else if (activeRouteCoords.length >= 2 && !itinerary?.legs?.length) {
        pinSource('destination-pin', MAP_LAYER_COLORS.destPin, activeRouteCoords[activeRouteCoords.length - 1])
      }

      // User location: accuracy halo + ring (heading arrow handled by marker puck below)
      if (userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))) {
        const accuracyM = Number((userLocation as any).accuracy) || 0
        map.addSource('user', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [Number(userLocation.lng), Number(userLocation.lat)] } },
        })
        if (accuracyM > 0) {
          map.addLayer({
            id: 'user-accuracy', type: 'circle', source: 'user',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, Math.max(8, Math.sqrt(accuracyM) * 0.28), 16, Math.max(24, Math.sqrt(accuracyM) * 0.6)],
              'circle-color': 'rgba(26,107,176,0.14)', 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(26,107,176,0.35)',
            } as any,
          })
        }
        map.addLayer({
          id: 'user-halo', type: 'circle', source: 'user',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 16, 20],
            'circle-color': 'rgba(26,107,176,0.22)', 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(26,107,176,0.5)',
          } as any,
        })
      }

      // Deviation marker (severity-colored)
      if (deviation && Number.isFinite(Number(deviation.lat)) && Number.isFinite(Number(deviation.lng))) {
        map.addSource('deviation', {
          type: 'geojson',
          data: { type: 'Feature', properties: { severity: deviation.severity ?? 'medium' }, geometry: { type: 'Point', coordinates: [Number(deviation.lng), Number(deviation.lat)] } },
        })
        map.addLayer({
          id: 'deviation-pin', type: 'circle', source: 'deviation',
          paint: { 'circle-radius': 11, 'circle-color': deviation.severity === 'high' ? MAP_LAYER_COLORS.metroRed : MAP_LAYER_COLORS.destPin, 'circle-stroke-width': 3, 'circle-stroke-color': MAP_LAYER_COLORS.white } as any,
        })
      }
    } catch (e) {
      console.error('Map layer render error:', (e as Error)?.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, itinerary, alternatives, origin, destination, stops, userLocation, deviation, currentLegIndex, highlightStop, stopsLayerOn, nearby, effectiveLayer, isDarkBase, activeRouteCoords, legOpacity, modeFilter, activeLineId, networkShapes, hideSchematic])

  // ── Camera fit: only when plotted data genuinely changes (fitKey), never on cosmetic re-renders ──
  const fitPoints = useMemo(() => {
    const points: Array<[number, number]> = []
    const validUser = userLocation && Number.isFinite(Number(userLocation.lat)) && Number.isFinite(Number(userLocation.lng))
    if (fitTo === 'user' && validUser) points.push([Number(userLocation!.lng), Number(userLocation!.lat)])
    if (activeRouteCoords.length >= 2) {
      for (const c of activeRouteCoords) points.push(c)
    } else {
      if (origin && Number.isFinite(Number(origin.lat))) points.push([Number(origin.lng), Number(origin.lat)])
      if (destination && Number.isFinite(Number(destination.lat))) points.push([Number(destination.lng), Number(destination.lat)])
      for (const s of routeStops) points.push([s.lng, s.lat])
      if (validUser) points.push([Number(userLocation!.lng), Number(userLocation!.lat)])
      if (deviation && Number.isFinite(Number(deviation.lat))) points.push([Number(deviation.lng), Number(deviation.lat)])
    }
    return points.filter(isFinitePoint)
  }, [fitTo, activeRouteCoords, origin, destination, routeStops, userLocation, deviation])

  const fitKey = useMemo(
    () => fitPoints.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|'),
    [fitPoints],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || fitPoints.length === 0) return
    if (navigationMode && hasInitialFitRef.current) return
    hasInitialFitRef.current = true
    try {
      map.resize()
      const bounds = new LngLatBounds()
      fitPoints.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, { padding: 56, maxZoom: 16.5, duration: 600 })
      setDisplaced(false)
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, fitKey, navigationMode])

  // ── Station markers (local network, filtered by mode) ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    stationMarkersRef.current.forEach((m) => { try { m.remove() } catch { /* ignore */ } })
    stationMarkersRef.current = []

    // When an active itinerary or route is displayed, suppress background static station dots
    // so the map cleanly highlights only the user's route, transfer stops, origin, and destination.
    const hasActiveRoute = Boolean(itinerary?.legs?.length || (activeRouteCoords && activeRouteCoords.length >= 2))
    if (hasActiveRoute && !stopsLayerOn) {
      return
    }

    const stationsToDisplay = stationsForMapZoom(EGYPT_STATIONS, modeFilter, zoomLevel)

    stationsToDisplay.forEach((station) => {
      const el = document.createElement('div')
      el.className = 'station-marker group cursor-pointer transition-transform hover:scale-125'

      const isInterchange = station.isInterchange
      const markerSize = isInterchange ? 'w-4 h-4' : 'w-3 h-3'
      const borderSize = isInterchange ? 'border-2' : 'border'
      const borderColor = isInterchange ? 'border-[#1a6bb0]' : 'border-[#1a6bb0]/70'
      const bgColor = 'bg-white'

      el.innerHTML = `
        <div class="${markerSize} rounded-full ${bgColor} ${borderSize} ${borderColor} shadow-xs flex items-center justify-center" title="${lang === 'ar' ? station.name_ar : station.name_en}">
          ${isInterchange ? '<div class="w-1.5 h-1.5 rounded-full bg-[#1a6bb0]"></div>' : ''}
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedStop({ id: station.id, name: lang === 'ar' ? station.name_ar : station.name_en, lat: station.lat, lng: station.lng })
        onStationSelect?.(station)
      })

      try {
        const marker = new Marker({ element: el }).setLngLat([station.lng, station.lat]).addTo(map)
        stationMarkersRef.current.push(marker)
      } catch { /* ignore */ }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, modeFilter, zoomLevel, itinerary, activeRouteCoords, stopsLayerOn, lang])

  // ── Google Maps-style live navigation puck ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (!userLocation) {
      if (userMarkerRef.current) {
        try { userMarkerRef.current.remove() } catch { /* ignore */ }
        userMarkerRef.current = null
        userMarkerElRef.current = null
      }
      return
    }

    if (!userMarkerRef.current) {
      const wrapper = document.createElement('div')
      wrapper.className = 'navigation-puck-wrapper pointer-events-none'
      wrapper.appendChild(makeNavigationArrow(MAP_LAYER_COLORS.activeBlue))
      userMarkerElRef.current = wrapper
      try {
        userMarkerRef.current = new Marker({ element: wrapper })
          .setLngLat([Number(userLocation.lng), Number(userLocation.lat)])
          .addTo(map)
      } catch { /* ignore */ }
    } else {
      try { userMarkerRef.current.setLngLat([Number(userLocation.lng), Number(userLocation.lat)]) } catch { /* ignore */ }
    }

    if (userMarkerElRef.current && userHeading != null && Number.isFinite(Number(userHeading))) {
      userMarkerElRef.current.style.transform = `rotate(${Number(userHeading)}deg)`
    }
  }, [userLocation, userHeading, mapLoaded])

  // ── Follow-me ──
  useEffect(() => {
    const map = mapRef.current
    if (!follow || !map || !mapLoaded || !userLocation) return
    const uLat = Number(userLocation.lat)
    const uLng = Number(userLocation.lng)
    if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) return
    setDisplaced(false)

    try {
      if (navigationMode) {
        if (!hasInitialFitRef.current) {
          hasInitialFitRef.current = true
          map.flyTo({ center: [uLng, uLat], zoom: 16.5, duration: 900 })
          return
        }
        const offsetDist = Number(userSpeed) > 6 ? 45 : 24
        const [fLat, fLng] = forwardOffsetLocation(uLat, uLng, Number(userHeading ?? 0), offsetDist)
        map.easeTo({
          center: [fLng, fLat],
          bearing: headingUp && Number.isFinite(Number(userHeading)) ? Number(userHeading) : 0,
          pitch: pitch3D ? 38 : 0,
          zoom: Number(userSpeed) > 10 ? 15.2 : Number(userSpeed) > 2.5 ? 16.4 : 17.4,
          duration: 800,
        })
      } else {
        map.easeTo({ center: [uLng, uLat], duration: 800 })
      }
    } catch { /* ignore */ }
  }, [follow, mapLoaded, userLocation, navigationMode, userHeading, userSpeed, headingUp, pitch3D])

  // Heading-up rotation
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !headingUp || userHeading == null || !Number.isFinite(Number(userHeading))) return
    try { map.rotateTo(Number(userHeading), { duration: 400 }) } catch { /* ignore */ }
  }, [userHeading, headingUp, mapLoaded])

  const toggle3D = () => {
    const next = !pitch3D
    setPitch3D(next)
    try { mapRef.current?.easeTo({ pitch: next ? 52 : 0, duration: 600 }) } catch { /* ignore */ }
  }
  const toggle3DRef = useRef(toggle3D)
  toggle3DRef.current = toggle3D

  const toggleHeadingUp = () => {
    const next = !headingUp
    setHeadingUp(next)
    if (!next) { try { mapRef.current?.resetNorth({ duration: 400 }) } catch { /* ignore */ } }
  }

  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      try { mapRef.current.flyTo({ center: [Number(userLocation.lng), Number(userLocation.lat)], zoom: 15.5, duration: 800 }) } catch { /* ignore */ }
      setDisplaced(false)
    } else if (mapRef.current) {
      // No GPS fix: ask for it and fall back to plotted data bounds.
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              try { mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15.5, duration: 800 }) } catch { /* ignore */ }
              setDisplaced(false)
            },
            () => recenter(),
            { timeout: 8000, enableHighAccuracy: true },
          )
          return
        }
      } catch { /* ignore */ }
      recenter()
    }
  }
  const handleLocateMeRef = useRef(handleLocateMe)
  handleLocateMeRef.current = handleLocateMe

  const recenter = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    setDisplaced(false)
    try {
      const valid = (p: any) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
      const target = (valid(userLocation) && [Number((userLocation as any).lng), Number((userLocation as any).lat)]) ||
        (valid(origin) && [Number((origin as any).lng), Number((origin as any).lat)]) || null
      if (target) {
        if (navigationMode && valid(userLocation)) {
          const uLat = Number((userLocation as any).lat)
          const uLng = Number((userLocation as any).lng)
          const offsetDist = Number(userSpeed) > 6 ? 45 : 24
          const [fLat, fLng] = forwardOffsetLocation(uLat, uLng, Number(userHeading ?? 0), offsetDist)
          map.flyTo({
            center: [fLng, fLat], zoom: Number(userSpeed) > 10 ? 15.2 : Number(userSpeed) > 2.5 ? 16.4 : 17.4,
            bearing: headingUp && Number.isFinite(Number(userHeading)) ? Number(userHeading) : 0,
            pitch: pitch3D ? 38 : 0, duration: 700,
          })
        } else {
          map.flyTo({ center: target as [number, number], zoom: Math.max(map.getZoom(), 15), duration: 500 })
        }
        return
      }
      if (fitPoints.length > 0) {
        const bounds = new LngLatBounds()
        fitPoints.forEach((p) => bounds.extend(p))
        map.fitBounds(bounds, { padding: 56, maxZoom: 16.5, duration: 600 })
      }
    } catch { /* ignore */ }
  }, [userLocation, origin, navigationMode, userHeading, userSpeed, headingUp, pitch3D, fitPoints])

  if (mapFailed) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-center bg-neutral-200 ${className}`} role="img" aria-label={tt('الخريطة غير متاحة', 'Map unavailable')}>
        <p className="text-xs text-neutral-500 p-4 text-center">
          {tt('تعذر تحميل الخريطة التفاعلية على هذا الجهاز. التخطيط ما زال يعمل — تابع الخطوات بالأسفل.', 'Interactive map could not load on this device. Routing still works — see the itinerary below.')}
        </p>
      </div>
    )
  }

  const hasRouteData = activeRouteCoords.length >= 2 || (alternatives?.length ?? 0) > 0

  const modeChips = useMemo(() => [
    { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
    { id: 'metro', label: lang === 'ar' ? 'المترو' : 'Metro' },
    { id: 'lrt', label: 'LRT' },
    { id: 'monorail', label: lang === 'ar' ? 'مونوريل' : 'Monorail' },
    { id: 'train', label: lang === 'ar' ? 'قطار' : 'Rail' },
    { id: 'brt', label: 'BRT' },
  ], [lang])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-neutral-200" aria-label={tt('جاري تحميل الخريطة', 'Loading map')}>
          <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" role="status" />
          <span className="text-xs text-neutral-500">{tt('جاري تحميل الخريطة…', 'Loading map…')}</span>
        </div>
      )}

      {showControls && mapLoaded && (
        <div className="absolute top-3 end-3 z-20 flex flex-col gap-1.5">
          <div className="relative">
            <button
              onClick={() => setLayerMenuOpen((open) => !open)}
              aria-label={tt('اختيار نمط الخريطة', 'Choose map style')}
              aria-expanded={layerMenuOpen}
              title={tt('اختيار نمط الخريطة', 'Choose map style')}
              className="w-10 h-10 bg-white/95 hover:bg-white text-neutral-800 rounded-2xl shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {effectiveLayer === 'satellite' ? <Satellite size={18} /> : effectiveLayer === 'dark' ? <Moon size={18} /> : <MapIcon size={18} />}
            </button>
            {layerMenuOpen && (
              <div className="absolute end-0 top-12 min-w-40 rounded-2xl border border-neutral-200/70 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
                {([
                  { id: 'streets', Icon: MapIcon, label: tt('خريطة الشوارع', 'Streets') },
                  { id: 'satellite', Icon: Satellite, label: tt('صور الأقمار الصناعية', 'Satellite') },
                  { id: 'dark', Icon: Moon, label: tt('الوضع الداكن', 'Dark') },
                ] as Array<{ id: BasemapType; Icon: typeof MapIcon; label: string }>).map((b) => (
              <button
                key={b.id}
                onClick={() => { selectLayer(b.id); setLayerMenuOpen(false) }}
                role="menuitemradio"
                aria-checked={effectiveLayer === b.id}
                aria-pressed={effectiveLayer === b.id}
                className={`w-full rounded-xl px-2.5 py-2 flex items-center gap-2 text-xs font-bold transition-all ${
                  effectiveLayer === b.id ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <b.Icon size={15} />
                <span>{b.label}</span>
              </button>
                ))}
              </div>
            )}
          </div>

          {effectiveLayer === 'satellite' && (
            <button
              onClick={() => setSatelliteDetails((enabled) => !enabled)}
              title={satelliteDetails ? tt('إخفاء أسماء الطرق والأماكن', 'Hide road and place labels') : tt('إظهار أسماء الطرق والأماكن', 'Show road and place labels')}
              aria-label={satelliteDetails ? tt('إخفاء أسماء الطرق والأماكن', 'Hide road and place labels') : tt('إظهار أسماء الطرق والأماكن', 'Show road and place labels')}
              aria-pressed={satelliteDetails}
              className={`w-10 h-10 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                satelliteDetails ? 'bg-blue-600 text-white' : 'bg-white/95 text-neutral-800 hover:bg-white'
              }`}
            >
              <Info size={18} />
            </button>
          )}

          <button
            onClick={toggle3D}
            title={pitch3D ? tt('منظور مسطح 2D', 'Flat 2D view') : tt('منظور مجسم 3D', '3D perspective')}
            aria-pressed={pitch3D}
            className={`w-9 h-9 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center text-xs font-black transition-all ${
              pitch3D ? 'bg-blue-600 text-white' : 'bg-white/95 text-neutral-800 hover:bg-white'
            }`}
          >
            3D
          </button>

          {navigationMode && (
            <button
              onClick={toggleHeadingUp}
              title={headingUp ? tt('توجيه للشمال', 'North up') : tt('توجيه مع اتجاه الحركة', 'Heading up')}
              aria-pressed={headingUp}
              className={`w-10 h-10 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                headingUp ? 'bg-blue-600 text-white' : 'bg-white/95 text-neutral-800 hover:bg-white'
              }`}
            >
              <Compass size={17} />
            </button>
          )}

          <button
            onClick={toggleStopsLayer}
            title={tt('محطات قريبة', 'Nearby stops')}
            aria-pressed={stopsLayerOn}
            disabled={nearbyLoading}
            className={`w-10 h-10 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              stopsLayerOn ? 'bg-blue-600 text-white' : 'bg-white/95 text-neutral-800 hover:bg-white'
            }`}
          >
            {nearbyLoading
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <MapPin size={17} />}
          </button>

          <button
            onClick={handleLocateMe}
            title={tt('موقعي الحالي', 'My location')}
            className="w-10 h-10 bg-white/95 hover:bg-white text-neutral-800 rounded-2xl shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <LocateFixed size={17} />
          </button>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-0.5 shadow-md flex flex-col">
            <button
              onClick={() => { try { mapRef.current?.zoomIn({ duration: 250 }) } catch { /* ignore */ } }}
              aria-label={tt('تكبير', 'Zoom in')}
              className="w-8 h-8 flex items-center justify-center text-base font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl"
            >
              +
            </button>
            <button
              onClick={() => { try { mapRef.current?.zoomOut({ duration: 250 }) } catch { /* ignore */ } }}
              aria-label={tt('تصغير', 'Zoom out')}
              className="w-8 h-8 flex items-center justify-center text-base font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl"
            >
              −
            </button>
          </div>
        </div>
      )}

      {showControls && mapLoaded && (
        <div className="absolute top-3 start-3 end-16 z-20 overflow-x-auto flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-neutral-200/60 scrollbar-none">
          {modeChips.map((m) => (
            <button
              key={m.id}
              onClick={() => setModeFilter(m.id as TransitModeFilter)}
              aria-pressed={modeFilter === m.id}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 min-w-max focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                modeFilter === m.id ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <ModeIcon mode={m.id === 'all' ? 'bus' : m.id} size={13} color={modeFilter === m.id ? 'white' : undefined} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}

      {showControls && mapLoaded && zoomLevel != null && (
        <span className="absolute bottom-3 end-3 z-20 bg-neutral-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg" aria-hidden>
          z{zoomLevel}
        </span>
      )}

      {showControls && mapLoaded && tileFallback && activeBasemap === 'satellite' && (
        <div className="absolute bottom-3 start-3 z-20 bg-amber-500/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5" role="status">
          <TriangleAlert size={14} />
          <span>{tt('تعذر تحميل صور القمر الصناعي — تم التحويل لخريطة الشوارع', 'Satellite tiles unavailable — showing streets')}</span>
        </div>
      )}

      {showControls && mapLoaded && hasRouteData && (
        <div className="absolute bottom-3 start-3 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-neutral-200/60 overflow-hidden max-w-[200px]">
          <button
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50"
          >
            <Info size={13} />
            <span>{tt('مفتاح الخريطة', 'Legend')}</span>
            <span className="ms-auto">{legendOpen ? '▾' : '▸'}</span>
          </button>
          {legendOpen && (
            <ul className="px-3 pb-2.5 space-y-1.5 text-[11px] text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="inline-block w-4 h-1 rounded bg-blue-600" />
                {tt('المسار المختار', 'Selected route')}
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-4 h-1 rounded bg-slate-400" />
                {tt('مسار بديل', 'Alternative')}
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-4 h-1 border-b-2 border-dashed border-slate-500" />
                {tt('مشي', 'Walking')}
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-white border-2 border-blue-800" />
                {tt('محطة', 'Stop')}
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                {tt('موقعك', 'You')}
              </li>
            </ul>
          )}
        </div>
      )}

      {showControls && mapLoaded && fitPoints.length > 0 && ((navigationMode && !follow) || displaced) && (
        <button
          onClick={() => { onRecenter?.(); recenter() }}
          className="absolute bottom-16 end-3 z-20 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-1.5 transition-all"
        >
          <Navigation size={14} />
          <span>{tt('إعادة التمركز', 'Re-center')}</span>
        </button>
      )}

      {mapLoaded && (
        <div className="absolute top-3 start-1/2 -translate-x-1/2 z-10 opacity-0 pointer-events-none" aria-hidden>
          credits-anchor
        </div>
      )}
      {mapLoaded && (
        <div className="absolute bottom-1 start-1 z-20">
          {creditsOpen && (
            <div className="mb-1 bg-neutral-900/90 text-white text-[10px] leading-relaxed p-2.5 rounded-xl max-w-[240px] shadow-xl" role="note">
              <div><b>Satellite:</b> Tiles © Esri — Maxar, Earthstar Geographics</div>
              <div><b>Labels:</b> © Esri Reference (places + transportation)</div>
              <div><b>Streets:</b> © OpenStreetMap contributors (ODbL)</div>
              <div><b>Dark:</b> Tiles © Esri — DeLorme, NAVTEQ</div>
              <div><b>Routing:</b> © OpenStreetMap contributors (OSRM)</div>
            </div>
          )}
          <button
            onClick={() => setCreditsOpen((v) => !v)}
            aria-expanded={creditsOpen}
            aria-label={tt('حقوق الخريطة', 'Map credits')}
            title={tt('حقوق الخريطة', 'Map credits')}
            className="w-6 h-6 bg-white/90 hover:bg-white text-neutral-500 rounded-full shadow flex items-center justify-center text-[10px]"
          >
            ©
          </button>
        </div>
      )}

      {selectedStop && (
        <StopPanel
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onSelectOrigin={(st) => {
            const full = EGYPT_STATIONS.find((s) => String(s.id) === String(st.id))
            if (full && onPlanFrom) { onPlanFrom(full); setSelectedStop(null); return }
            onSelectStop?.({ id: st.id, name: st.name, latitude: st.lat ?? 0, longitude: st.lng ?? 0, target: 'origin' })
            setSelectedStop(null)
          }}
          onSelectDestination={(st) => {
            const full = EGYPT_STATIONS.find((s) => String(s.id) === String(st.id))
            if (full && onPlanTo) { onPlanTo(full); setSelectedStop(null); return }
            onSelectStop?.({ id: st.id, name: st.name, latitude: st.lat ?? 0, longitude: st.lng ?? 0, target: 'destination' })
            setSelectedStop(null)
          }}
          lang={lang}
          t={tt}
        />
      )}
    </div>
  )
}
