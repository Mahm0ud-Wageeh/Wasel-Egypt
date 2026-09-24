import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface BackendTransitMode {
  id: number
  name: string
  name_ar?: string
  code?: string
  color?: string
  icon?: string
}

export interface BackendRoute {
  id: number
  gtfs_route_id?: string
  short_name?: string
  long_name?: string
  long_name_ar?: string
  color?: string
  source?: string
  transit_mode_id?: number
  transit_mode?: BackendTransitMode
  operator_id?: number
  transit_operator?: { id: number; name: string; name_ar?: string; code?: string }
}

export interface BackendVariant {
  id: number
  name?: string
  name_ar?: string
  headsign?: string
  direction?: string
  active?: boolean
  reliability_score?: number | null
  has_geometry?: boolean
  shape?: any
  point_count?: number
  frequency_windows?: any
}

export interface BackendRouteStop {
  id: number
  stop_id: number
  stop_name?: string
  stop_name_ar?: string
  latitude?: number | string
  longitude?: number | string
  stop_sequence?: number
  travel_time_s?: number | null
  distance_m?: number | null
  platform_code?: string | null
  parent_station_id?: number | null
  parent_station_name?: string | null
  parent_station_name_ar?: string | null
  is_interchange?: boolean
}

function unwrapData(res: any): any {
  return res?.data ?? res
}

export async function fetchTransitModes(): Promise<BackendTransitMode[]> {
  const res = await apiRequest<any>(endpoints.public.transitModes, { method: 'GET', auth: false })
  const d = unwrapData(res)
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.data)) return d.data
  return []
}

export async function fetchPublicRoutes(params?: {
  search?: string
  transit_mode_id?: number
  per_page?: number
}): Promise<{ routes: BackendRoute[]; total?: number }> {
  const q: Record<string, any> = { per_page: params?.per_page ?? 20 }
  if (params?.search) q.search = params.search
  if (params?.transit_mode_id) q.transit_mode_id = params.transit_mode_id
  const res = await apiRequest<any>(`${endpoints.public.routes}?${new URLSearchParams(q as any).toString()}`, {
    method: 'GET',
    auth: false,
  })
  const d = unwrapData(res)
  if (Array.isArray(d)) return { routes: d }
  return { routes: d?.data ?? [], total: d?.total ?? d?.meta?.total }
}

export async function fetchRouteDetail(id: number | string): Promise<{ route: any; variants: BackendVariant[] }> {
  const res = await apiRequest<any>(endpoints.public.route(id), { method: 'GET', auth: false })
  const d = unwrapData(res)
  return { route: d, variants: d?.variants ?? [] }
}

export async function fetchRouteStops(id: number | string): Promise<BackendRouteStop[]> {
  const res = await apiRequest<any>(endpoints.public.routeStops(id), { method: 'GET', auth: false })
  const d = unwrapData(res)
  const variants = Array.isArray(d) ? d : d?.variants ?? d?.data ?? []
  // Merge stops across variants, dedupe by stop_id, keep order of first appearance
  const seen = new Set<number | string>()
  const out: BackendRouteStop[] = []
  for (const v of variants) {
    const stops: any[] = v?.stops ?? []
    for (const s of stops) {
      const key = s.stop_id ?? s.id
      if (key == null || seen.has(key)) continue
      seen.add(key)
      out.push(s)
    }
  }
  return out
}

/** Normalize stored geometry (GeoJSON LineString or [[lat,lng],...]) to [{lat,lng},...]. */
export async function fetchVariantGeometry(variantId: number | string): Promise<Array<{ lat: number; lng: number }>> {
  const res = await apiRequest<any>(endpoints.public.variantGeometry(variantId), { method: 'GET', auth: false })
  const d = unwrapData(res)
  const out: Array<{ lat: number; lng: number }> = []

  if (d?.geojson?.coordinates && Array.isArray(d.geojson.coordinates)) {
    for (const p of d.geojson.coordinates) {
      if (Array.isArray(p) && p.length >= 2) {
        const lng = Number(p[0])
        const lat = Number(p[1])
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng })
      }
    }
    if (out.length >= 2) return out
  }

  const geom: any[] = d?.shape?.coordinates ?? d?.geometry ?? d?.shape ?? []
  for (const p of geom) {
    if (Array.isArray(p) && p.length >= 2) {
      const p0 = Number(p[0])
      const p1 = Number(p[1])
      if (p0 > 30.5 && p1 < 30.5) {
        out.push({ lat: p1, lng: p0 })
      } else {
        out.push({ lat: p0, lng: p1 })
      }
    } else if (p && typeof p === 'object') {
      const lat = Number((p as any).lat ?? (p as any).latitude)
      const lng = Number((p as any).lng ?? (p as any).longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng })
    }
  }
  return out
}

/** Real network statistics (landing page metrics). */
export async function fetchNetworkStats(): Promise<any> {
  try {
    const res = await apiRequest<any>(endpoints.public.networkStats, { method: 'GET', auth: false })
    return unwrapData(res)
  } catch {
    return null
  }
}

/** Active service alerts. */
export async function fetchActiveAlerts(): Promise<any[]> {
  try {
    const res = await apiRequest<any>(endpoints.public.activeServiceAlerts, { method: 'GET', auth: false })
    const d = unwrapData(res)
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.data)) return d.data
    return []
  } catch {
    return []
  }
}

