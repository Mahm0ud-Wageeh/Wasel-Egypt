import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * Journey Search + Results API.
 * Endpoints used:
 *   POST /api/v1/journeys/search  → { data: { origin, destination, requested_at, options[] } }
 *   POST /api/v1/journeys        → { data: Journey }
 */

export async function searchJourneys(payload) {
  const response = await apiRequest(endpoints.journeys.search, {
    method: 'POST',
    body: payload,
  })
  return response.data ?? response
}

export async function saveJourney({ searchPayload, optionIndex }) {
  return getData(endpoints.journeys.create, {
    method: 'POST',
    body: { ...searchPayload, option_index: optionIndex },
  })
}

/** Start a saved journey: POST /journeys/{id}/start -> ActiveJourney. */
export async function startSavedJourney(journeyId) {
  const response = await apiRequest(endpoints.journeys.start(journeyId), {
    method: 'POST',
    body: {},
  })
  return response.data ?? response
}

/** All transit stops, public endpoint (legacy: default page only). */
export async function getPublicStops() {
  const response = await apiRequest(endpoints.public.stops, { auth: false })
  return response.data ?? response
}

/**
 * Server-side stop autocomplete against GET /stops?search=…&per_page=8.
 * The public stops index holds 3,000+ rows — filtering must happen on the
 * server (the endpoint natively supports the `search` parameter).
 */
export async function searchPublicStops(query, perPage = 8) {
  const response = await apiRequest(
    `${endpoints.public.stops}?search=${encodeURIComponent(query)}&per_page=${perPage}`,
    { auth: false },
  )
  return response.data ?? response
}

/** All governorates, for the location picker. */
export async function getGovernorates() {
  const response = await apiRequest(endpoints.public.governorates, { auth: false })
  return response.data ?? response
}

