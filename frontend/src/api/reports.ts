import { apiRequest } from './client'
import { endpoints } from './endpoints'

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

export async function fetchCommunityReports() {
  try {
    const reports = await apiRequest<CommunityReport[]>(endpoints.public.publicReports, {
      method: 'GET',
      auth: false,
    })
    return Array.isArray(reports) ? reports : []
  } catch {
    return []
  }
}
