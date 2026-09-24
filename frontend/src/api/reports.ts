import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

export const REPORT_TYPES = [
  { value: 'delay', label: 'Delay', lucideIcon: 'clock', icon: '⏱️', ar: 'تأخير' },
  { value: 'early_arrival', label: 'Early Arrival', lucideIcon: 'zap', icon: '⚡', ar: 'وصول مبكر' },
  { value: 'overcrowding', label: 'Overcrowding', lucideIcon: 'users', icon: '👥', ar: 'ازدحام شديد' },
  { value: 'cleanliness', label: 'Cleanliness', lucideIcon: 'sparkles', icon: '🧹', ar: 'نظافة' },
  { value: 'safety', label: 'Safety Concern', lucideIcon: 'warning', icon: '⚠️', ar: 'سلامة وأمان' },
  { value: 'stop_damage', label: 'Stop Damage', lucideIcon: 'wrench', icon: '🛠️', ar: 'تلف بالمحطة' },
  { value: 'signage_issue', label: 'Signage Issue', lucideIcon: 'signage', icon: '🪧', ar: 'مشكلة لافتات' },
  { value: 'accessibility', label: 'Accessibility', lucideIcon: 'accessibility', icon: '♿', ar: 'إمكانية وصول' },
  { value: 'suggestion', label: 'Suggestion', lucideIcon: 'lightbulb', icon: '💡', ar: 'اقتراح' },
  { value: 'complaint', label: 'Complaint', lucideIcon: 'fileText', icon: '📝', ar: 'شكوى' },
  { value: 'other', label: 'Other', lucideIcon: 'pin', icon: '📌', ar: 'أخرى' },
]

export interface CommunityReport {
  id: number | string
  issue_type: string
  title_ar: string
  title_en: string
  description: string
  location_name?: string
  status: 'pending' | 'verified' | 'resolved'
  created_at: string
}

/** Map UI issue ids to backend report_type enum values. */
export const ISSUE_TO_REPORT_TYPE: Record<string, string> = {
  crowded: 'overcrowding',
  delay: 'delay',
  breakdown: 'stop_damage',
  safety: 'safety',
}

export async function submitReport(data: {
  issue_type: string
  description: string
  latitude: number
  longitude: number
  stop_id?: string | number
  station_name?: string
}) {
  const related_stop_id = Number(data.stop_id)
  return await apiRequest(endpoints.reports.create, {
    method: 'POST',
    body: {
      report_type: ISSUE_TO_REPORT_TYPE[data.issue_type] ?? 'other',
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      ...(Number.isFinite(related_stop_id) ? { related_stop_id } : {}),
    },
  })
}

export interface IncidentReport {
  id: number
  user_id: number
  route_id?: number | null
  transit_stop_id?: number | null
  transit_stop?: any
  route?: any
  kind: 'delay' | 'crowd' | 'elevator' | 'safety'
  severity: 'low' | 'med' | 'high'
  status: 'pending' | 'confirmed' | 'dismissed'
  description: string
  latitude?: number | null
  longitude?: number | null
  confirms: number
  denies: number
  trust_score: number
  resolved_at?: string | null
  created_at: string
}

export async function fetchIncidents(params?: { stop_id?: number; route_id?: number }): Promise<IncidentReport[]> {
  try {
    const query = new URLSearchParams()
    if (params?.stop_id) query.set('stop_id', String(params.stop_id))
    if (params?.route_id) query.set('route_id', String(params.route_id))
    const url = `${endpoints.incidents.publicList}?${query.toString()}`
    const res = await apiRequest<any>(url, { auth: false })
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
  } catch {
    return []
  }
}

export async function voteIncident(incidentId: number | string, vote: 'confirm' | 'deny'): Promise<any> {
  return await apiRequest(endpoints.incidents.vote(incidentId), {
    method: 'POST',
    body: { vote },
  })
}

export async function submitIncident(data: {
  transit_stop_id?: number | null
  route_id?: number | null
  kind: 'delay' | 'crowd' | 'elevator' | 'safety'
  severity?: 'low' | 'med' | 'high'
  description: string
  latitude?: number | null
  longitude?: number | null
}): Promise<IncidentReport> {
  const res = await apiRequest<any>(endpoints.incidents.create, {
    method: 'POST',
    body: data,
  })
  return res.data ?? res
}

export async function getReports(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.reports.list, { query })
  return response
}

export async function getPublicReports(query: Record<string, any> = {}) {
  const response = await apiRequest(endpoints.public.publicReports, { query, auth: false })
  return response
}

export async function getReportById(id: number | string) {
  return getData(endpoints.reports.show(id))
}

export async function createReport(payload: any) {
  const response = await apiRequest(endpoints.reports.create, {
    method: 'POST',
    body: payload,
  })
  return response
}

export async function deleteReport(id: number | string) {
  const response = await apiRequest(endpoints.reports.remove(id), {
    method: 'DELETE',
  })
  return response
}

export async function getReportModerations(id: number | string) {
  return getData(endpoints.reports.moderations(id))
}

export async function moderateReport(id: number | string, { action_taken, notes }: { action_taken: string; notes?: string }) {
  const response = await apiRequest(endpoints.reports.moderate(id), {
    method: 'POST',
    body: { action_taken, notes },
  })
  return response
}

export async function getUserTrust(userId: number | string) {
  return getData(endpoints.users.trust(userId))
}
