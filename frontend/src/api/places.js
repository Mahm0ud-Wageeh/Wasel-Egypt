import { apiRequest } from './client'
import { endpoints } from './endpoints'

/**
 * Unified place + stop search (server-proxied geocoder).
 * GET /api/v1/places/search?q=…[&lat=&lng=]
 * -> { data: { query, stops: [...], places: [...] } }
 *
 * Places come from the keyless Photon/OSM geocoder (Arabic-capable),
 * cached and throttled server-side — the client never calls the
 * geocoder directly.
 */
export async function searchPlaces(query, { lat, lng } = {}) {
  const params = new URLSearchParams({ q: query })
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('lat', String(lat))
    params.set('lng', String(lng))
  }
  const response = await apiRequest(`${endpoints.public.placesSearch}?${params.toString()}`, {
    auth: false,
  })
  return response.data ?? response
}

/**
 * Nearest named place for a coordinate, via the server-proxied reverse
 * geocoder (GET /places/search?lat=&lng= with no q → Photon reverse).
 * Falls back to a coordinate label when the network is unavailable —
 * never throws.
 */
export async function reverseGeocode({ lat, lng }) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
    const response = await apiRequest(`${endpoints.public.placesSearch}?${params.toString()}`, {
      auth: false,
    })
    const name = response?.data?.reverse?.name
    if (typeof name === 'string' && name !== '') return name
  } catch {
    /* fall through to coordinate label */
  }
  return `My location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
}
