import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notifications'

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInbox = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = unreadOnly ? { unread: true } : {}
      const res = await getNotifications(query)
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setNotifications(list)
      const count = res?.meta?.unread_count ?? list.filter((n) => !n.read_at).length
      setUnreadCount(count)
    } catch (err) {
      setError(err.message || 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [unreadOnly])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  const handleMarkRead = async (item) => {
    if (item.read_at) return
    try {
      await markNotificationRead(item.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    setActionLoading(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      alert(err.message || 'Could not delete notification.')
    }
  }

  const handleItemClick = (item) => {
    handleMarkRead(item)
    // Deep linking if data payload exists
    const payload = item.data_payload || {}
    if (payload.active_journey_id) {
      if (payload.type === 'deviation_detected' || payload.type === 'recovery_available') {
        navigate(`/active-journeys/${payload.active_journey_id}/deviation`)
      } else {
        navigate(`/active-journeys/${payload.active_journey_id}`)
      }
    } else if (payload.report_id) {
      navigate('/reports')
    }
  }

  const getPriorityBadge = (priority) => {
    if (priority === 'urgent') return <Badge value="urgent" />
    if (priority === 'high') return <Badge value="high" />
    return <Badge value="normal" />
  }

  const getTypeIconName = (type) => {
    switch (type) {
      case 'deviation_detected':
        return 'warning'
      case 'recovery_available':
        return 'recover'
      case 'journey_started':
        return 'navigate'
      case 'journey_completed':
        return 'success'
      case 'report_verified':
      case 'report_status_change':
        return 'reports'
      case 'service_alert':
        return 'globe'
      default:
        return 'alerts'
    }
  }

  return (
    <div className="app-shell__page">
      {/* Header */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <h1 className="t-h1" style={{ color: 'var(--p900)', margin: 0 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--e700)',
                  color: '#fff',
                  borderRadius: 'var(--r-pill)',
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}>
            Real-time updates on your journeys, transit alerts, and reports
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            loading={actionLoading}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={`btn btn--sm ${!unreadOnly ? 'btn--primary' : 'btn--secondary'}`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={`btn btn--sm ${unreadOnly ? 'btn--primary' : 'btn--secondary'}`}
        >
          Unread only ({unreadCount})
        </button>
      </div>

      {error && (
        <Alert severity="error" title="Notification Error">
          {error}
        </Alert>
      )}

      {/* List */}
      {loading ? (
        <div className="stack">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : notifications.length === 0 ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="alerts" size={22} aria-hidden="true" />}
            title={unreadOnly ? 'No unread notifications' : 'Inbox is empty'}
            message={
              unreadOnly
                ? 'You are all caught up on your active trips and alerts.'
                : 'When you take trips or submit reports, updates will appear here.'
            }
          />
        </Card>
      ) : (
        <div className="stack">
          {notifications.map((item) => {
            const isUnread = !item.read_at
            const payload = item.data_payload || {}
            const iconName = getTypeIconName(payload.type || item.type)

            return (
              <Card
                key={item.id}
                interactive
                flat={!isUnread}
                onClick={() => handleItemClick(item)}
                style={{
                  background: isUnread ? 'var(--p50)' : 'var(--surface)',
                  borderLeft: isUnread ? '4px solid var(--p600)' : '1px solid var(--line)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name={iconName} size={18} aria-hidden='true' style={{ flexShrink: 0 }} />
                    <b style={{ fontSize: 13.5, color: isUnread ? 'var(--p900)' : 'var(--ink900)' }}>
                      {item.title || 'Transit Alert'}
                    </b>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {getPriorityBadge(item.priority)}
                    <button
                      type="button"
                      aria-label="Delete notification"
                      onClick={(e) => handleDelete(e, item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ink300)',
                        fontSize: 14,
                        padding: '2px 4px',
                      }}
                    >
                      <Icon name='close' size={14} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: 'var(--ink700)', margin: 0, lineHeight: 1.4 }}>
                  {item.body || item.message}
                </p>

                <div className="row-between" style={{ marginTop: 2 }}>
                  <span className="t-caption">
                    {item.sent_at
                      ? new Date(item.sent_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </span>
                  {isUnread && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--p600)',
                        fontWeight: 700,
                      }}
                    >
                      Tap to view & mark read
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
