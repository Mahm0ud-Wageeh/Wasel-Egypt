import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface ApiStop {
  id: number
  gtfs_stop_id?: string
  name: string
  name_ar?: string
  name_en?: string
  latitude: string | number
  longitude: string | number
  location_accuracy?: number | string | null
  parent_station_id?: number | null
  parent_station?: ApiStop | null
  platforms?: ApiStop[]
  is_interchange?: boolean
  wheelchair_boarding?: number
  wheelchair_accessible?: boolean
  platform_code?: string | null
  area?: {
    id: number
    name: string
    governorate?: { id: number; name: string; code: string }
  }
}

/**
 * Returns localized stop name according to the active locale (defaulting to Arabic for 'ar').
 */
export function getStopDisplayName(stop: { name: string; name_ar?: string }, locale = 'ar'): string {
  if (locale === 'ar') {
    return stop.name_ar || stop.name
  }
  return stop.name || stop.name_ar || ''
}

export interface ApiDeparture {
  route_short_name?: string
  route_long_name?: string
  headsign?: string
  scheduled_departure?: string
  estimated_departure?: string
  minutes_until?: number
  mode?: string
  color?: string
}

export async function fetchStops(params?: { limit?: number; page?: number; area_id?: number }): Promise<{ data: ApiStop[]; meta?: any }> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('per_page', String(params.limit))
  if (params?.page) query.set('page', String(params.page))
  if (params?.area_id) query.set('area_id', String(params.area_id))
  
  const url = `${endpoints.stops.list}?${query.toString()}`
  return apiRequest<{ data: ApiStop[]; meta?: any }>(url, { auth: false })
}

export async function fetchStopDetail(id: number | string): Promise<any> {
  const url = `${endpoints.stops.show(id)}?with_routes=1`
  return apiRequest<any>(url, { auth: false })
}

export async function fetchStopDepartures(id: number | string, limit = 5): Promise<{ departures: ApiDeparture[] }> {
  const url = `${endpoints.stops.departures(id)}?limit=${limit}`
  const res = await apiRequest<any>(url, { auth: false })
  return res.data ?? res
}

export async function fetchPublicRoutes(): Promise<any[]> {
  const res = await apiRequest<any>(endpoints.public.routes, { auth: false })
  return res.data ?? res
}

export async function fetchRouteVariantGeometry(variantId: number | string): Promise<any> {
  const res = await apiRequest<any>(endpoints.public.variantGeometry(variantId), { auth: false })
  return res.data ?? res
}
