import { useMemo, useState, useCallback } from 'react'
import type { JourneySearchContext } from '../screens/PlannerScreen'

export interface RoutePoint {
  lat: number
  lng: number
}

export type PolylineSource =
  | 'transit_geometry'
  | 'walking_straight'
  | 'stop_to_stop'
  | 'search_od'
  | 'empty'

export interface UseJourneyPolylineResult {
  polyline: RoutePoint[]
  coords: Array<[number, number]> // [lng, lat] for MapLibre GeoJSON
  source: PolylineSource
  isEmpty: boolean
  hasFallback: boolean
  retry: () => void
}

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Validate coordinates within reasonable bounds for Egypt transit.
 */
function isValidPoint(lat: any, lng: any): boolean {
  const nLat = Number(lat)
  const nLng = Number(lng)
  return Number.isFinite(nLat) && Number.isFinite(nLng) && nLat >= 20 && nLat <= 33 && nLng >= 24 && nLng <= 38
}

/**
 * Parse a raw coordinate point that may be [lat, lng], [lng, lat], or { lat, lng } / { latitude, longitude }.
 */
function parsePoint(p: any): RoutePoint | null {
  if (!p) return null
  if (Array.isArray(p)) {
    let lat = Number(p[0])
    let lng = Number(p[1])
    // Auto-detect swapped [lng, lat] if p[0] is longitude-like (>33) and p[1] is latitude-like (<=32)
    if (lat > 33 && lng <= 32) {
      const tmp = lat
      lat = lng
      lng = tmp
    }
    if (isValidPoint(lat, lng)) return { lat, lng }
    return null
  }
  if (typeof p === 'object') {
    const lat = Number(p.lat ?? p.latitude)
    const lng = Number(p.lng ?? p.longitude)
    if (isValidPoint(lat, lng)) return { lat, lng }
  }
  return null
}

function extractStopPoint(stop: any, latFallback?: any, lngFallback?: any): RoutePoint | null {
  const lat = stop?.latitude ?? stop?.lat ?? latFallback
  const lng = stop?.longitude ?? stop?.lng ?? lngFallback
  return parsePoint({ lat, lng })
}

/**
 * Single Source of Truth for journey path geometry.
 *
 * Fallback chain:
 * 1. Transit legs' real polyline geometry (geometry array)
 * 2. Walking legs' straight lines (from_stop → to_stop)
 * 3. Transit legs missing geometry (from_stop → to_stop connector)
 * 4. Search origin → destination fallback
 * 5. Honest empty state with retry trigger
 */
export function useJourneyPolyline(
  snapshot: any | null,
  lastSearch: JourneySearchContext | null,
  fallbackOD?: { origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number } } | null
): UseJourneyPolylineResult {
  const [retryCount, setRetryCount] = useState(0)
  const retry = useCallback(() => setRetryCount((c) => c + 1), [])

  return useMemo(() => {
    // 1. Try extracting from legs
    const rawLegs =
      snapshot?.journey?.journeyLegs ??
      snapshot?.journey?.legs ??
      snapshot?.journeyLegs ??
      snapshot?.legs ??
      (Array.isArray(snapshot) ? snapshot : [])

    const legs: any[] = Array.isArray(rawLegs) ? rawLegs : []
    const pts: RoutePoint[] = []
    let usedSource: PolylineSource = 'empty'

    if (legs.length > 0) {
      for (const leg of legs) {
        const isWalking = leg?.type === 'walking' || leg?.mode === 'walking'
        const rawGeom = leg?.geometry

        if (Array.isArray(rawGeom) && rawGeom.length >= 2) {
          // Real geometry provided
          let legPointsCount = 0
          for (const rawPt of rawGeom) {
            const pt = parsePoint(rawPt)
            if (pt) {
              const last = pts[pts.length - 1]
              if (!last || last.lat !== pt.lat || last.lng !== pt.lng) {
                pts.push(pt)
                legPointsCount++
              }
            }
          }
          if (legPointsCount >= 2) {
            if (usedSource === 'empty') usedSource = isWalking ? 'walking_straight' : 'transit_geometry'
            continue
          }
        }

        // Geometry missing or insufficient — fall back to leg endpoints
        const fromPt = extractStopPoint(leg?.from_stop, leg?.from_lat, leg?.from_lng)
        const toPt = extractStopPoint(leg?.to_stop, leg?.to_lat, leg?.to_lng)

        if (fromPt && toPt) {
          const last = pts[pts.length - 1]
          if (!last || last.lat !== fromPt.lat || last.lng !== fromPt.lng) {
            pts.push(fromPt)
          }
          pts.push(toPt)

          if (isDev && !isWalking) {
            console.warn('[useJourneyPolyline] Transit leg missing full geometry, used stop connector:', leg)
          }
          if (usedSource === 'empty') usedSource = isWalking ? 'walking_straight' : 'stop_to_stop'
        }
      }
    }

    if (pts.length >= 2) {
      return {
        polyline: pts,
        coords: pts.map((p) => [p.lng, p.lat] as [number, number]),
        source: usedSource,
        isEmpty: false,
        hasFallback: usedSource === 'stop_to_stop',
        retry,
      }
    }

    // 2. Fallback to lastSearch
    if (lastSearch && isValidPoint(lastSearch.origin_lat, lastSearch.origin_lng) && isValidPoint(lastSearch.destination_lat, lastSearch.destination_lng)) {
      if (isDev) {
        console.warn('[useJourneyPolyline] Legs empty, falling back to search origin->destination line:', lastSearch)
      }
      const odPoints: RoutePoint[] = [
        { lat: Number(lastSearch.origin_lat), lng: Number(lastSearch.origin_lng) },
        { lat: Number(lastSearch.destination_lat), lng: Number(lastSearch.destination_lng) },
      ]
      return {
        polyline: odPoints,
        coords: odPoints.map((p) => [p.lng, p.lat] as [number, number]),
        source: 'search_od',
        isEmpty: false,
        hasFallback: true,
        retry,
      }
    }

    // 3. Fallback to explicit fallbackOD
    if (fallbackOD?.origin && fallbackOD?.destination && isValidPoint(fallbackOD.origin.lat, fallbackOD.origin.lng) && isValidPoint(fallbackOD.destination.lat, fallbackOD.destination.lng)) {
      if (isDev) {
        console.warn('[useJourneyPolyline] Falling back to explicit fallbackOD:', fallbackOD)
      }
      const odPoints: RoutePoint[] = [
        { lat: Number(fallbackOD.origin.lat), lng: Number(fallbackOD.origin.lng) },
        { lat: Number(fallbackOD.destination.lat), lng: Number(fallbackOD.destination.lng) },
      ]
      return {
        polyline: odPoints,
        coords: odPoints.map((p) => [p.lng, p.lat] as [number, number]),
        source: 'search_od',
        isEmpty: false,
        hasFallback: true,
        retry,
      }
    }

    if (isDev) {
      console.warn('[useJourneyPolyline] No polyline could be drawn (empty state).')
    }

    return {
      polyline: [],
      coords: [],
      source: 'empty',
      isEmpty: true,
      hasFallback: false,
      retry,
    }
  }, [snapshot, lastSearch, fallbackOD, retryCount, retry])
}
