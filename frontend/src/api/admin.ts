import { apiRequest } from './client'
import { endpoints } from './endpoints'

function unwrap<T>(res: any): T {
  if (res == null) return res
  if (Array.isArray(res)) return res as unknown as T
  if (res.data !== undefined) {
    if (Array.isArray(res.data)) return res.data as unknown as T
    if (res.data?.data !== undefined) return res.data.data as T
    return res.data as T
  }
  return res as T
}

async function get<T>(path: string): Promise<T> {
  const res = await apiRequest<any>(path, { method: 'GET' })
  return unwrap<T>(res)
}

// ── Dashboard & health ──────────────────────────────────────────────
export const fetchAdminDashboard = () => get<any>(endpoints.admin.dashboard)
export const fetchSystemHealth = () => get<any>(endpoints.admin.systemHealth)

// ── Users ───────────────────────────────────────────────────────────
export const fetchAdminUsers = () => get<any>(endpoints.admin.users)
export async function fetchAdminUsersPaged(params?: { search?: string; page?: number; per_page?: number }) {
  const q: Record<string, any> = {}
  if (params?.search) q.search = params.search
  if (params?.page) q.page = params.page
  if (params?.per_page) q.per_page = params.per_page
  const res = await apiRequest<any>(endpoints.admin.users, { method: 'GET', query: q as any } as any)
  return unwrap<any>(res)
}
export const deleteAdminUser = (id: number | string) =>
  apiRequest(endpoints.admin.deleteUser(id), { method: 'DELETE' })

// ── Fares (full CRUD — add modes / ranges / prices as network grows) ─
export const fetchAdminFares = () => get<any[]>(endpoints.admin.fares)
export const createAdminFare = (body: Record<string, any>) =>
  apiRequest(endpoints.admin.fares, { method: 'POST', body })
export const updateAdminFare = (id: number | string, body: Record<string, any>) =>
  apiRequest(`/admin/fares/${id}`, { method: 'PUT', body })
export const deleteAdminFare = (id: number | string) =>
  apiRequest(`/admin/fares/${id}`, { method: 'DELETE' })

// ── Moderation ──────────────────────────────────────────────────────
export const fetchAdminReports = (params?: { status?: string; page?: number }) =>
  get<any[]>(endpoints.reports.list)
export const moderateReport = (id: number | string, action: 'verify' | 'reject' | 'resolve', notes?: string) =>
  apiRequest(endpoints.reports.moderate(id), {
    method: 'POST',
    body: { action_taken: action, notes },
  })

// ── Data governance (network growth observability) ──────────────────
export const fetchDataQuality = () => get<any>(endpoints.admin.dataQuality)
export const fetchDataImports = () => get<any>(endpoints.admin.dataImports)
export const fetchDataAudit = () => get<any>(endpoints.admin.dataAudit)

// ── Analytics ───────────────────────────────────────────────────────
export const fetchAnalyticsJourneys = () => get<any>(endpoints.admin.journeys)
export const fetchAnalyticsDeviations = () => get<any>(endpoints.admin.deviations)
export const fetchAnalyticsUsage = () => get<any>(endpoints.admin.usage)
export const fetchAnalyticsReports = () => get<any>(endpoints.admin.reports)

// ── Legacy exports for unit test compatibility ──────────────────────
export async function getAdminDashboard(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.dashboard, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsJourneys(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.journeys, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsDeviations(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.deviations, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsUsage(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.usage, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsReports(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.reports, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsTrust(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.trust, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsNotifications(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.notifications, { query })
  return (response as any)?.data ?? response
}

export async function getAnalyticsModes(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.modes, { query })
  return (response as any)?.data ?? response
}

export async function getAdminUsers() {
  const response = await apiRequest(endpoints.admin.users)
  return (response as any)?.data ?? response
}

export async function getAdminRoles() {
  const response = await apiRequest(endpoints.admin.roles)
  return (response as any)?.data ?? response
}

export async function getAdminPermissions() {
  const response = await apiRequest(endpoints.admin.permissions)
  return (response as any)?.data ?? response
}

export const updateAdminUser = (id: number | string, body: Record<string, any>) =>
  apiRequest(`/admin/users/${id}`, { method: 'PUT', body })

export const clearSystemCache = () =>
  apiRequest('/admin/system/clear-cache', { method: 'POST' })

export const fetchAdminStops = (query?: Record<string, any>) =>
  apiRequest<any>(endpoints.public.stops, { method: 'GET', query, auth: false })

export const createAdminStop = (body: Record<string, any>) =>
  apiRequest('/transit-stops', { method: 'POST', body })

export const updateAdminStop = (id: number | string, body: Record<string, any>) =>
  apiRequest(`/transit-stops/${id}`, { method: 'PUT', body })

export const deleteAdminStop = (id: number | string) =>
  apiRequest(`/transit-stops/${id}`, { method: 'DELETE' })

export const fetchAdminAlerts = () =>
  apiRequest<any>('/service-alerts', { method: 'GET' })

export const broadcastServiceAlert = (body: Record<string, any>) =>
  apiRequest('/service-alerts', { method: 'POST', body })

export const deleteServiceAlert = (id: number | string) =>
  apiRequest(`/service-alerts/${id}`, { method: 'DELETE' })

