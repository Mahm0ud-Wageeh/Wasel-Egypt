import { apiRequest, getData } from './client'
import { endpoints } from './endpoints'

/**
 * Notifications API.
 * Endpoints used:
 *   GET    /api/v1/notifications              → User's notification inbox
 *   GET    /api/v1/notifications/unread-count → Counter badge number
 *   POST   /api/v1/notifications/{id}/read    → Mark single item as read
 *   POST   /api/v1/notifications/read-all     → Mark all as read
 *   DELETE /api/v1/notifications/{id}         → Delete notification
 */

export async function getNotifications(query = {}) {
  const response = await apiRequest(endpoints.notifications.list, { query })
  return response
}

export async function getUnreadCount() {
  const response = await getData(endpoints.notifications.unreadCount)
  return response?.count ?? 0
}

export async function markNotificationRead(id) {
  const response = await apiRequest(endpoints.notifications.markRead(id), {
    method: 'POST',
  })
  return response
}

export async function markAllNotificationsRead() {
  const response = await apiRequest(endpoints.notifications.markAllRead, {
    method: 'POST',
  })
  return response
}

export async function deleteNotification(id) {
  const response = await apiRequest(endpoints.notifications.remove(id), {
    method: 'DELETE',
  })
  return response
}
