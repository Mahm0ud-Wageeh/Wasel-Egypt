import { apiRequest, ApiError } from './client'
import { endpoints } from './endpoints'
import { EGYPT_STATIONS } from '../data/egyptTransitData'
import { MODE_COLORS } from '../components/icons'

export interface PlaceSearchResult {
  id: string | number
  name: string
  name_ar?: string
  name_en?: string
  latitude: number
  longitude: number
  type?: 'stop' | 'place' | 'poi'
  mode?: string
}

export interface JourneyLeg {
  type: 'walking' | 'metro' | 'train' | 'lrt' | 'monorail' | 'brt' | 'bus' | 'transfer'
  duration: number
  line?: string
  line_ar?: string
  line_en?: string
  from_ar?: string
  from_en?: string
  to_ar?: string
  to_en?: string
  desc_ar?: string
  desc_en?: string
  color?: string
  waypoints?: { lat: number, lng: number }[]
}

export interface JourneyPlan {
  id: string | number
  recommended: boolean
  duration: number
  departure: string
  arrival: string
  fare: number
  fareStatus: 'official' | 'estimated'
  changes: number
  walking: number
  origin_name: string
  destination_name: string
  legs: JourneyLeg[]
}

/** My saved/planned journeys (auth required). Returns [] when logged out. */
export async function fetchMyJourneys(): Promise<any[]> {
  try {
    const res = await apiRequest<any>(endpoints.journeys.list, { method: 'GET' })
    const data = res?.data ?? res
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    return []
  } catch {
    return []
  }
}

/** Search places or stops with debouncing */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const results = await apiRequest<PlaceSearchResult[]>(endpoints.public.placesSearch, {
      query: { q: query.trim() },
      signal,
      auth: false,
    })
    return Array.isArray(results) ? results : []
  } catch {
    return []
  }
}

/** Resolve a station name to lat/lng coordinates from local data or backend */
export async function resolveCoordinates(name: string): Promise<{ lat: number; lng: number } | null> {
  if (!name) return null

  // 1. Try exact match in local EGYPT_STATIONS (fast, no network)
  const exact = EGYPT_STATIONS.find(s =>
    s.name_ar === name || s.name_en === name ||
    s.name_ar.includes(name) || s.name_en.toLowerCase().includes(name.toLowerCase()) ||
    name.includes(s.name_ar) || name.toLowerCase().includes(s.name_en.toLowerCase())
  )
  if (exact) return { lat: exact.lat, lng: exact.lng }

  // 2. Try backend places/search for real stop coordinates
  try {
    const res = await apiRequest<any>(endpoints.public.placesSearch, {
      query: { q: name.trim() },
      auth: false,
    })
    const data = res.data ?? res
    const stops: any[] = data?.stops ?? []
    const places: any[] = data?.places ?? []
    const all = [...stops, ...places]
    if (all.length > 0 && all[0].lat && all[0].lng) {
      return { lat: all[0].lat, lng: all[0].lng }
    }
  } catch {
    /* ignore */
  }

  return null
}

/** Mode color mapping for transit legs */
function modeColor(mode: string): string {
  return MODE_COLORS[mode] || MODE_COLORS.walking || 'currentColor'
}

/** Map backend leg structure to frontend JourneyLeg */
function mapBackendLeg(leg: any): JourneyLeg {
  const type = leg.type === 'transit' ? (leg.mode ?? 'bus') : (leg.type ?? 'walking')
  const durationMin = Math.round((leg.duration_sec ?? 0) / 60)

  const fromName = leg.from_stop?.name ?? leg.from_name ?? ''
  const toName = leg.to_stop?.name ?? leg.to_name ?? ''
  const routeName = leg.route?.short_name ?? leg.route?.long_name ?? leg.mode ?? ''

  return {
    type: type as JourneyLeg['type'],
    duration: durationMin,
    line: routeName,
    line_ar: routeName,
    line_en: routeName,
    from_ar: fromName,
    from_en: fromName,
    to_ar: toName,
    to_en: toName,
    desc_ar: type === 'walking' ? `مشي ${durationMin} دقيقة` : `${routeName} من ${fromName} إلى ${toName}`,
    desc_en: type === 'walking' ? `Walk ${durationMin} min` : `${routeName} from ${fromName} to ${toName}`,
    color: modeColor(leg.mode ?? type),
    waypoints: Array.isArray(leg.geometry)
      ? leg.geometry.map((pt: [number, number]) => ({ lat: pt[0], lng: pt[1] }))
      : undefined,
  }
}

/** Map backend journey option to frontend JourneyPlan */
function mapBackendOption(
  opt: any,
  index: number,
  originName: string,
  destinationName: string,
  requestedAt: Date,
): JourneyPlan {
  const durationSec = opt.total_duration_sec ?? 0
  const durationMin = Math.round(durationSec / 60)
  const arrival = new Date(requestedAt.getTime() + durationSec * 1000)

  const legs = (opt.legs ?? []).map(mapBackendLeg)

  const walkingLegs = legs.filter((l: JourneyLeg) => l.type === 'walking')
  const totalWalkMin = walkingLegs.reduce((acc: number, l: JourneyLeg) => acc + l.duration, 0)

  const fare = opt.fare ?? null

  return {
    id: `backend_${Date.now()}_${index}`,
    recommended: Boolean(opt.recommended),
    duration: durationMin,
    departure: requestedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    arrival: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fare: fare ? Math.round(Number(fare.total_egp ?? fare.total ?? fare)) : 0,
    fareStatus: fare?.is_official ? 'official' : 'estimated',
    changes: opt.total_transfers ?? 0,
    walking: totalWalkMin,
    origin_name: originName,
    destination_name: destinationName,
    legs,
  }
}

/** Plan journeys between origin and destination */
export async function planJourney(params: {
  origin: string
  destination: string
  origin_lat?: number
  origin_lng?: number
  destination_lat?: number
  destination_lng?: number
  departure_time?: string
}): Promise<JourneyPlan[]> {
  const requestedAt = new Date()

  // Resolve coordinates if not provided directly
  let originCoords = params.origin_lat && params.origin_lng
    ? { lat: params.origin_lat, lng: params.origin_lng }
    : await resolveCoordinates(params.origin)

  let destCoords = params.destination_lat && params.destination_lng
    ? { lat: params.destination_lat, lng: params.destination_lng }
    : await resolveCoordinates(params.destination)

  // If we have coordinates, call the real backend
  if (originCoords && destCoords) {
    try {
      const res = await apiRequest<any>(endpoints.journeys.search, {
        method: 'POST',
        body: {
          origin_lat: originCoords.lat,
          origin_lng: originCoords.lng,
          destination_lat: destCoords.lat,
          destination_lng: destCoords.lng,
          ...(params.departure_time ? { requested_at: params.departure_time } : {}),
        },
        auth: false,
      })

      // Backend response: { success: true, data: { options: [...] } }
      const data = res.data ?? res
      const options: any[] = data?.options ?? (Array.isArray(data) ? data : [])

      if (options.length > 0) {
        return options.map((opt, i) =>
          mapBackendOption(opt, i, params.origin, params.destination, requestedAt)
        )
      }

      // Backend answered honestly with zero options: no invented routes.
      // Surface an honest, localizable empty state to the caller.
      throw new ApiError(404, 'NO_JOURNEY_OPTIONS')
    } catch (err: any) {
      if (err instanceof ApiError) throw err
      // Network/backend failure: never invent times or fares.
      throw new ApiError(0, err?.message || 'NETWORK_ERROR')
    }
  }

  // Coordinates could not be resolved at all (unknown place names,
  // backend unreachable for geocoding): honest failure, no guessing.
  throw new ApiError(422, 'UNRESOLVABLE_PLACES')
}

  // ─── NOTE: no invented fallback routes ────────────────────────────────────
  // A previous version generated fake durations/fares when the backend was
  // unreachable. That is removed: times and fares must only come from real
  // backend data. Callers handle ApiError with honest empty states + retry.
  // (Removed: invented fallback routes with fake durations/fares.
  // Times and fares must only come from real backend data.)
