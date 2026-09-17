import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface PlaceSearchStop {
  id: string | number
  stop_id?: number
  name: string
  detail?: string
  lat: number
  lng: number
  source?: string
  modes?: string[]
}

export interface PlaceSearchPlace {
  id: string
  name: string
  detail?: string
  lat: number
  lng: number
  kind?: string
  source?: string
}

export interface PlaceSearchResult {
  query: string
  stops: PlaceSearchStop[]
  places: PlaceSearchPlace[]
}

/**
 * Unified place + stop search (server-proxied geocoder + real GTFS stops in Egypt).
 * GET /api/v1/places/search?q=…[&lat=&lng=]
 */
export async function searchPlaces(
  query: string,
  bias?: { lat?: number; lng?: number },
  options?: { signal?: AbortSignal }
): Promise<PlaceSearchResult> {
  const params = new URLSearchParams({ q: query })
  if (bias?.lat && bias?.lng) {
    params.set('lat', String(bias.lat))
    params.set('lng', String(bias.lng))
  }
  const url = `${endpoints.places.search}?${params.toString()}`
  const response = await apiRequest<any>(url, {
    auth: false,
    ...(options?.signal ? { signal: options.signal } : {}),
  })
  return (response.data ?? response) as PlaceSearchResult
}

/**
 * Reverse geocode coordinate to nearest named place via server API.
 */
export async function reverseGeocode(coords: { lat: number; lng: number }): Promise<string> {
  try {
    const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng) })
    const response = await apiRequest<any>(`${endpoints.places.search}?${params.toString()}`, {
      auth: false,
    })
    const name = response?.data?.reverse?.name
    if (typeof name === 'string' && name !== '') return name
  } catch {
    /* fallback to coordinate label */
  }
  return `موقعي الحالي (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
}
