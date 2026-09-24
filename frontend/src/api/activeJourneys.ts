import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface BackendSearchCoords {
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  option_index?: number
}

/** Persist the chosen search option as a journey (auth required). */
export async function saveJourneyFromSearch(coords: BackendSearchCoords): Promise<any> {
  const res = await apiRequest<any>(endpoints.journeys.create, {
    method: 'POST',
    body: coords,
  })
  return res?.data ?? res
}

/** Start live tracking for a saved journey → returns the active journey. */
export async function startActiveJourney(journeyId: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.journeys.start(journeyId), { method: 'POST' })
  return res?.data ?? res
}

export async function fetchActiveJourney(id: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.show(id), { method: 'GET' })
  return res?.data ?? res
}

export async function fetchJourneyProgress(id: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.progress(id), { method: 'GET' })
  return res?.data ?? res
}

let clientSeq = 1

/** Post a GPS ping (crowdsourced presence + personal progress). */
export async function postJourneyLocation(
  id: number | string,
  pos: { latitude: number; longitude: number; speed_mps?: number | null; bearing?: number | null; accuracy?: number | null },
): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.location(id), {
    method: 'POST',
    body: {
      latitude: pos.latitude,
      longitude: pos.longitude,
      recorded_at: new Date().toISOString(),
      ...(pos.speed_mps != null ? { speed_mps: pos.speed_mps } : {}),
      ...(pos.bearing != null ? { bearing_deg: pos.bearing } : {}),
      ...(pos.accuracy != null ? { accuracy_meters: pos.accuracy } : {}),
      client_seq: clientSeq++,
    },
  })
  return res?.data ?? res
}

export async function fetchDeviations(id: number | string): Promise<any[]> {
  const res = await apiRequest<any>(endpoints.activeJourneys.deviations(id), { method: 'GET' })
  const d = res?.data ?? res
  return Array.isArray(d) ? d : d?.data ?? []
}

export async function fetchRecoveryOptions(id: number | string): Promise<any[]> {
  const res = await apiRequest<any>(endpoints.activeJourneys.recoveryOptions(id), { method: 'GET' })
  const d = res?.data ?? res
  return Array.isArray(d) ? d : d?.data ?? []
}

export async function generateRecoveryOptions(id: number | string): Promise<any[]> {
  const res = await apiRequest<any>(endpoints.activeJourneys.recoveryOptions(id), { method: 'POST', body: {} })
  const d = res?.data ?? res
  return Array.isArray(d) ? d : d?.data ?? []
}

export async function acceptRecoveryOption(id: number | string, recoveryId: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.acceptRecovery(id, recoveryId), { method: 'POST' })
  return res?.data ?? res
}

export async function completeActiveJourney(id: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.complete(id), { method: 'POST' })
  return res?.data ?? res
}

export async function cancelActiveJourney(id: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.activeJourneys.cancel(id), { method: 'POST' })
  return res?.data ?? res
}

// ─── Legacy aliases & helpers for unit test compatibility ────────────────
export async function startJourney(journeyId: number | string, startedAt: string | null = null) {
  const response = await apiRequest(endpoints.journeys.start(journeyId), {
    method: 'POST',
    body: startedAt ? { started_at: startedAt } : {},
  })
  return response
}

export async function getActiveJourneys(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.activeJourneys.list, { query })
  return response
}

export async function getActiveJourneyById(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.show(id))
  return (response as any)?.data ?? response
}

export async function updateJourneyLocation(id: number | string, {
  latitude,
  longitude,
  speed_mps = 0,
  recorded_at = null,
  accuracy = null,
  heading = null,
  client_seq = null,
  is_backfill = null,
}: {
  latitude: number
  longitude: number
  speed_mps?: number | null
  recorded_at?: string | null
  accuracy?: number | null
  heading?: number | null
  client_seq?: number | null
  is_backfill?: boolean | null
}) {
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

export async function getJourneyProgress(id: number | string, query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.activeJourneys.progress(id), { query })
  return response
}

export async function completeJourney(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.complete(id), {
    method: 'POST',
  })
  return response
}

export async function cancelJourney(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.cancel(id), {
    method: 'POST',
  })
  return response
}

export async function getJourneyDeviations(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.deviations(id))
  return (response as any)?.data ?? response
}

export async function resumeJourney(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.resume(id), {
    method: 'POST',
  })
  return response
}

export async function listRecoveryOptions(id: number | string) {
  const response = await apiRequest(endpoints.activeJourneys.recoveryOptions(id))
  return (response as any)?.data ?? response
}
