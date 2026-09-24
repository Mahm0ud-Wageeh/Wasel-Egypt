import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * User Profile & Preferences API.
 */

export async function getUserProfile(userId) {
  const response = await apiRequest(endpoints.users.show(userId))
  return response.data ?? response
}

export async function updateUserProfile(userId, data) {
  const response = await apiRequest(endpoints.users.update(userId), {
    method: 'PUT',
    body: data,
  })
  return response.data ?? response
}

export async function getUserPreferences(userId) {
  const response = await apiRequest(endpoints.users.preferences(userId))
  return response.data ?? response
}

export async function updateUserPreferences(userId, preferences) {
  const response = await apiRequest(endpoints.users.updatePreferences(userId), {
    method: 'PUT',
    body: preferences,
  })
  return response.data ?? response
}

export async function getUserTrustScore(userId) {
  const response = await apiRequest(endpoints.users.trust(userId))
  return response.data ?? response
}
