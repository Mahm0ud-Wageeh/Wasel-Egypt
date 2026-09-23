import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface BackendTransitMode {
  id: number
  name: string
  code?: string
  color?: string
}

export interface BackendRoute {
  id: number
  short_name?: string
  long_name?: string
  transit_mode_id?: number
  transit_mode?: BackendTransitMode
  transit_operator?: { id: number; name: string }
}

export interface BackendVariant {
  id: number
  name?: string
  headsign?: string
  direction?: string
  active?: boolean
  reliability_score?: number | null
  has_geometry?: boolean
  frequency_windows?: any
}

export interface BackendRouteStop {
  id: number
  stop_id: number
  stop_name?: string
  latitude?: number | string
  longitude?: number | string
  stop_sequence?: number
  platform_code?: string | null
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

/** Normalize stored [[lat,lng],...] geometry to [{lat,lng},...]. */
export async function fetchVariantGeometry(variantId: number | string): Promise<Array<{ lat: number; lng: number }>> {
  const res = await apiRequest<any>(endpoints.public.variantGeometry(variantId), { method: 'GET', auth: false })
  const d = unwrapData(res)
  const geom: any[] = d?.geometry ?? []
  const out: Array<{ lat: number; lng: number }> = []
  for (const p of geom) {
    if (Array.isArray(p) && p.length >= 2) {
      const lat = Number(p[0]); const lng = Number(p[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng })
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

