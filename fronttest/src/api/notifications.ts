import { apiRequest } from './client'
import { endpoints } from './endpoints'

export interface ApiNotification {
  id: number | string
  type?: string
  title?: string
  title_ar?: string
  title_en?: string
  body?: string
  message?: string
  body_ar?: string
  body_en?: string
  read_at?: string | null
  is_read?: boolean
  created_at?: string
  data?: Record<string, any>
}

function unwrapList(res: any): ApiNotification[] {
  if (!res) return []
  const d = res.data ?? res
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.data)) return d.data
  if (Array.isArray(d?.notifications)) return d.notifications
  return []
}

export async function fetchNotifications(): Promise<ApiNotification[]> {
  const res = await apiRequest<any>(endpoints.notifications.list, { method: 'GET' })
  return unwrapList(res)
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await apiRequest<any>(endpoints.notifications.unreadCount, { method: 'GET' })
    const d = res?.data ?? res
    const n = Number(d?.unread_count ?? d?.count ?? d)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export async function markNotificationRead(id: number | string): Promise<void> {
  await apiRequest(endpoints.notifications.markRead(id), { method: 'POST' })
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest(endpoints.notifications.markAllRead, { method: 'POST' })
}

export async function deleteNotification(id: number | string): Promise<void> {
  await apiRequest(endpoints.notifications.remove(id), { method: 'DELETE' })
}
