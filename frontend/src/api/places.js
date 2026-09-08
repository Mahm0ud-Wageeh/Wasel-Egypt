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
