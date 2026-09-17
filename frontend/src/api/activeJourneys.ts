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
