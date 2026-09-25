import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Notifications from '../legacy-pages/Notifications'
import * as notifApi from '../api/notifications'
import { renderWithProviders } from '../test/test-utils'

describe('Notifications Module', () => {
  const mockNotifications = [
    {
      id: 1,
      user_id: 1,
      title: 'Deviation Alert',
      body: 'Your journey on Metro Line 1 has experienced an off-route deviation.',
      priority: 'high',
      read_at: null,
      sent_at: '2026-09-05T11:00:00Z',
      data_payload: {
        type: 'deviation_detected',
        active_journey_id: 42,
      },
    },
    {
      id: 2,
      user_id: 1,
      title: 'Report Verified',
      body: 'Your community report regarding Ramses Station has been verified.',
      priority: 'normal',
      read_at: '2026-09-05T09:00:00Z',
      sent_at: '2026-09-05T08:30:00Z',
      data_payload: {
        type: 'report_verified',
        report_id: 12,
      },
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      data: mockNotifications,
      meta: { unread_count: 1 },
    })
  })

  it('renders notifications list with unread counter and priority badges', async () => {
    renderWithProviders(<Notifications />, {
      route: '/notifications',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('1 unread')).toBeInTheDocument()
      expect(screen.getByText('Deviation Alert')).toBeInTheDocument()
      expect(screen.getByText('Report Verified')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })
  })

  it('marks a notification as read upon interaction', async () => {
    const markSpy = vi.spyOn(notifApi, 'markNotificationRead').mockResolvedValue({ success: true })

    renderWithProviders(<Notifications />, {
      route: '/notifications',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByText('Deviation Alert')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Deviation Alert'))

    await waitFor(() => {
      expect(markSpy).toHaveBeenCalledWith(1)
    })
  })

  it('marks all notifications as read when button is clicked', async () => {
    const markAllSpy = vi.spyOn(notifApi, 'markAllNotificationsRead').mockResolvedValue({
      success: true,
      data: { marked_read: 1 },
    })

    renderWithProviders(<Notifications />, {
      route: '/notifications',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalled()
      expect(screen.queryByText('1 unread')).not.toBeInTheDocument()
    })
  })

  it('deletes a notification when close button is clicked', async () => {
    const deleteSpy = vi.spyOn(notifApi, 'deleteNotification').mockResolvedValue({ success: true })

    renderWithProviders(<Notifications />, {
      route: '/notifications',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getAllByLabelText('Delete notification')[0]).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByLabelText('Delete notification')[0])

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(1)
    })
  })

  it('renders empty state block when inbox has no items', async () => {
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      data: [],
      meta: { unread_count: 0 },
    })

    renderWithProviders(<Notifications />, {
      route: '/notifications',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByText('Inbox is empty')).toBeInTheDocument()
    })
  })
})
