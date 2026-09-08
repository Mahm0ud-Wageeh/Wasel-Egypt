import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * Community Reports API.
 * Endpoints used:
 *   GET    /api/v1/reports             → User's reports (or all for staff)
 *   POST   /api/v1/reports             → Create a community report
 *   GET    /api/v1/reports/{id}        → Show report detail
 *   DELETE /api/v1/reports/{id}        → Delete own pending report (or admin any)
 *   GET    /api/v1/reports/{id}/moderations → Moderation history for report
 *   POST   /api/v1/reports/{id}/moderate    → Moderate report (moderator/admin)
 *   GET    /api/v1/community-reports   → Public verified/resolved reports
 *   GET    /api/v1/community-reports/{id} → Public single report
 *   GET    /api/v1/users/{id}/trust    → User trust score
 */

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

export async function getReports(query = {}) {
  const response = await apiRequest(endpoints.reports.list, { query })
  return response
}

export async function getPublicReports(query = {}) {
  const response = await apiRequest(endpoints.public.publicReports, { query, auth: false })
  return response
}

export async function getReportById(id) {
  return getData(endpoints.reports.show(id))
}

export async function createReport(payload) {
  const response = await apiRequest(endpoints.reports.create, {
    method: 'POST',
    body: payload,
  })
  return response
}

export async function deleteReport(id) {
  const response = await apiRequest(endpoints.reports.remove(id), {
    method: 'DELETE',
  })
  return response
}

export async function getReportModerations(id) {
  return getData(endpoints.reports.moderations(id))
}

export async function moderateReport(id, { action_taken, notes }) {
  const response = await apiRequest(endpoints.reports.moderate(id), {
    method: 'POST',
    body: { action_taken, notes },
  })
  return response
}

export async function getUserTrust(userId) {
  return getData(endpoints.users.trust(userId))
}
