import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * Admin Analytics & Management API.
 */

export async function getAdminDashboard(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.dashboard, { query })
  return response.data ?? response
}

export async function getAnalyticsJourneys(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.journeys, { query })
  return response.data ?? response
}

export async function getAnalyticsDeviations(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.deviations, { query })
  return response.data ?? response
}

export async function getAnalyticsUsage(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.usage, { query })
  return response.data ?? response
}

export async function getAnalyticsReports(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.reports, { query })
  return response.data ?? response
}

export async function getAnalyticsTrust(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.trust, { query })
  return response.data ?? response
}

export async function getAnalyticsNotifications(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.notifications, { query })
  return response.data ?? response
}

export async function getAnalyticsModes(query = {}) {
  const response = await apiRequest(endpoints.adminAnalytics.modes, { query })
  return response.data ?? response
}

export async function getAdminUsers() {
  const response = await apiRequest(endpoints.admin.users)
  return response.data ?? response
}

export async function deleteAdminUser(id) {
  const response = await apiRequest(endpoints.admin.user(id), {
    method: 'DELETE',
  })
  return response
}

export async function getAdminRoles() {
  const response = await apiRequest(endpoints.admin.roles)
  return response.data ?? response
}

export async function getAdminPermissions() {
  const response = await apiRequest(endpoints.admin.permissions)
  return response.data ?? response
}
