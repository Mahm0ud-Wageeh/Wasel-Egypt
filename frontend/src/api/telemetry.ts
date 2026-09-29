import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface LiveVehicle {
  id: string
  line: string
  mode: string
  headsign: string
  color: string
  lat: number
  lng: number
  bearing: number
  speed_kmh: number
  next_stop: string
  eta_next_stop_mins: number
  occupancy: string
  status: string
}

export interface LiveTelemetry {
  vehicles: LiveVehicle[]
  count: number
  timestamp: string | null
}

/**
 * Live telemetry snapshot from the Laravel backend (GET /telemetry/live,
 * public, throttled server-side). Positions are computed server-side from
 * the clock, so every poll returns fresh coordinates — never hardcode or
 * seed vehicle positions on the client.
 */
export async function fetchLiveTelemetry(): Promise<LiveTelemetry> {
  const res = await apiRequest<any>(endpoints.telemetry.live, {
    method: 'GET',
    auth: false,
  })
  const raw = res?.data
  const vehicles: LiveVehicle[] = Array.isArray(raw)
    ? raw.filter(
        (v: any) =>
          v && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng))
      )
    : []
  return {
    vehicles,
    count:
      typeof res?.active_vehicles_count === 'number'
        ? res.active_vehicles_count
        : vehicles.length,
    timestamp: res?.timestamp ?? null,
  }
}
