import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * Active Journey Execution, Tracking, Deviation & Recovery API.
 * Endpoints used:
 *   POST   /api/v1/journeys/{id}/start                         → Start a planned journey
 *   GET    /api/v1/active-journeys                             → List active journeys
 *   GET    /api/v1/active-journeys/{id}                        → Show active journey + tracking
 *   POST   /api/v1/active-journeys/{id}/location               → Record GPS location
 *   GET    /api/v1/active-journeys/{id}/progress               → Progress history
 *   POST   /api/v1/active-journeys/{id}/complete               → Complete active journey
 *   POST   /api/v1/active-journeys/{id}/cancel                 → Cancel active journey
 *   GET    /api/v1/active-journeys/{id}/deviations             → Deviation events history
 *   POST   /api/v1/active-journeys/{id}/resume                 → Resume deviated journey
 *   GET    /api/v1/active-journeys/{id}/recovery-options       → List generated recovery options
 *   POST   /api/v1/active-journeys/{id}/recovery-options       → Generate new recovery options
 *   POST   /api/v1/active-journeys/{id}/recovery-options/{rid}/accept → Accept recovery option
 */

export async function startJourney(journeyId, startedAt = null) {
  const response = await apiRequest(endpoints.journeys.start(journeyId), {
    method: 'POST',
    body: startedAt ? { started_at: startedAt } : {},
  })
  return response
}

export async function getActiveJourneys(query = {}) {
  const response = await apiRequest(endpoints.activeJourneys.list, { query })
  return response
}

export async function getActiveJourneyById(id) {
  const response = await apiRequest(endpoints.activeJourneys.show(id))
  return response.data ?? response
}

export async function updateJourneyLocation(id, { latitude, longitude, speed_mps = 0, recorded_at = null, accuracy = null, heading = null, client_seq = null, is_backfill = null }) {
  const payload = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed_mps: speed_mps !== null && speed_mps !== undefined ? Number(speed_mps) : 0,
    ...(recorded_at ? { recorded_at } : {}),
    ...(accuracy !== null && accuracy !== undefined ? { accuracy: Number(accuracy) } : {}),
    ...(heading !== null && heading !== undefined ? { heading: Number(heading) } : {}),
    ...(client_seq !== null && client_seq !== undefined ? { client_seq: Number(client_seq) } : {}),
    ...(is_backfill ? { is_backfill: true } : {}),
  }
  const response = await apiRequest(endpoints.activeJourneys.location(id), {
    method: 'POST',
    body: payload,
  })
  return response
}

export async function getJourneyProgress(id, query = {}) {
  const response = await apiRequest(endpoints.activeJourneys.progress(id), { query })
  return response
}

export async function completeJourney(id) {
  const response = await apiRequest(endpoints.activeJourneys.complete(id), {
    method: 'POST',
  })
  return response
}

export async function cancelJourney(id) {
  const response = await apiRequest(endpoints.activeJourneys.cancel(id), {
    method: 'POST',
  })
  return response
}

export async function getJourneyDeviations(id) {
  const response = await apiRequest(endpoints.activeJourneys.deviations(id))
  return response.data ?? response
}

export async function resumeJourney(id) {
  const response = await apiRequest(endpoints.activeJourneys.resume(id), {
    method: 'POST',
  })
  return response
}

export async function listRecoveryOptions(id) {
  const response = await apiRequest(endpoints.activeJourneys.recoveryOptions(id))
  return response.data ?? response
}

export async function generateRecoveryOptions(id, maxOptions = 3) {
  const response = await apiRequest(endpoints.activeJourneys.recoveryOptions(id), {
    method: 'POST',
    body: { max_options: maxOptions },
  })
  return response.data ?? response
}

export async function acceptRecoveryOption(id, recoveryId) {
  const response = await apiRequest(endpoints.activeJourneys.acceptRecovery(id, recoveryId), {
    method: 'POST',
  })
  return response
}
