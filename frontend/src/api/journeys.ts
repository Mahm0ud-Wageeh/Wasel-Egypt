import { apiRequest, getData, ApiError } from './client'
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
  leg_type?: 'transit' | 'walk'
  mode?: string
  transit_mode_id?: number | null
  route_variant_id?: number | null
  from_stop_id?: number | null
  to_stop_id?: number | null
  from_lat?: number | null
  from_lng?: number | null
  to_lat?: number | null
  to_lng?: number | null
  from_stop?: { id?: number | string; name?: string; lat?: number; lng?: number } | null
  to_stop?: { id?: number | string; name?: string; lat?: number; lng?: number } | null
  distance_m?: number | null
  fare?: number
  boarding_at?: string | null
  alighting_at?: string | null
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
  /** Raw backend geometry [[lat, lng], ...] — preserved for MapItinerary */
  geometry?: number[][] | null
}

export interface JourneyPlan {
  id: string | number
  recommended: boolean
  duration: number
  departure: string
  arrival: string
  fare: number
  total_fare?: number
  fareStatus: 'official' | 'estimated'
  changes: number
  total_transfers?: number
  walking: number
  walk_distance_meters?: number
  origin_name: string
  destination_name: string
  origin_lat?: number
  origin_lng?: number
  dest_lat?: number
  dest_lng?: number
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

/** Map backend leg structure to frontend JourneyLeg.
 * Preserves all coordinate data so the planner can build a proper
 * MapItinerary with origin/destination pins, real geometry, and
 * correct transit/walking styling.
 */
function mapBackendLeg(leg: any): JourneyLeg {
  const type = leg.type === 'transit' ? (leg.mode ?? 'bus') : (leg.type ?? 'walking')
  const durationMin = Math.round((leg.duration_sec ?? 0) / 60)

  const fromName = leg.from_stop?.name ?? leg.from_name ?? ''
  const toName = leg.to_stop?.name ?? leg.to_name ?? ''
  const routeName = leg.route?.short_name ?? leg.route?.long_name ?? leg.mode ?? ''

  // Preserve from_stop/to_stop with lat/lng for InteractiveMap stop markers
  const fromStop = leg.from_stop ? {
    id: leg.from_stop.id,
    name: leg.from_stop.name ?? leg.from_stop.name_ar ?? fromName,
    lat: Number(leg.from_stop.lat ?? leg.from_lat),
    lng: Number(leg.from_stop.lng ?? leg.from_lng),
  } : null
  const toStop = leg.to_stop ? {
    id: leg.to_stop.id,
    name: leg.to_stop.name ?? leg.to_stop.name_ar ?? toName,
    lat: Number(leg.to_stop.lat ?? leg.to_lat),
    lng: Number(leg.to_stop.lng ?? leg.to_lng),
  } : null

  return {
    type: type as JourneyLeg['type'],
    leg_type: leg.type === 'walking' ? 'walk' : 'transit',
    mode: leg.mode ?? type,
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
    from_lat: Number(leg.from_lat) || null,
    from_lng: Number(leg.from_lng) || null,
    to_lat: Number(leg.to_lat) || null,
    to_lng: Number(leg.to_lng) || null,
    from_stop: fromStop,
    to_stop: toStop,
    // Preserve raw backend geometry [[lat,lng],...] for MapItinerary
    geometry: Array.isArray(leg.geometry) ? leg.geometry : null,
    waypoints: Array.isArray(leg.geometry)
      ? leg.geometry.map((pt: [number, number]) => ({ lat: pt[0], lng: pt[1] }))
      : undefined,
  }
}

/** Map backend journey option to frontend JourneyPlan.
 * Extracts origin/destination coordinates from legs for map pins.
 */
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

  // Extract origin/destination coordinates from the first/last leg
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const originLat = Number(firstLeg?.from_lat) || undefined
  const originLng = Number(firstLeg?.from_lng) || undefined
  const destLat = Number(lastLeg?.to_lat) || undefined
  const destLng = Number(lastLeg?.to_lng) || undefined

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
    origin_lat: originLat,
    origin_lng: originLng,
    dest_lat: destLat,
    dest_lng: destLng,
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

// ─── Legacy journey helper exports for test compatibility ──────────────────
export async function searchJourneys(payload: any) {
  const response = await apiRequest<any>(endpoints.journeys.search, {
    method: 'POST',
    body: payload,
  })
  return response?.data ?? response
}

export async function saveJourney({ searchPayload, optionIndex }: { searchPayload?: any; optionIndex?: number } = {}) {
  return getData(endpoints.journeys.create, {
    method: 'POST',
    body: { ...(searchPayload || {}), option_index: optionIndex },
  })
}

export async function startSavedJourney(journeyId: string | number) {
  const response = await apiRequest<any>(endpoints.journeys.start(journeyId), {
    method: 'POST',
    body: {},
  })
  return response?.data ?? response
}

export async function getSavedJourneys(perPage = 4) {
  const response = await apiRequest<any>(`${endpoints.journeys.list}?per_page=${perPage}`)
  return response?.data ?? response
}

export function cairoWallTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export async function getPublicStops() {
  const response = await apiRequest<any>(endpoints.public.stops, { auth: false })
  return response?.data ?? response
}

export async function searchPublicStops(query: string, perPage = 8) {
  const response = await apiRequest<any>(
    `${endpoints.public.stops}?search=${encodeURIComponent(query)}&per_page=${perPage}`,
    { auth: false },
  )
  return response?.data ?? response
}

export async function getGovernorates() {
  const response = await apiRequest<any>(endpoints.public.governorates, { auth: false })
  return response?.data ?? response
}
