import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import AdminDashboard from '../legacy-pages/AdminDashboard'
import AdminModeration from '../legacy-pages/AdminModeration'
import AdminUsers from '../legacy-pages/AdminUsers'
import * as adminApi from '../api/admin'
import * as reportsApi from '../api/reports'
import { renderWithProviders } from '../test/test-utils'

describe('Admin Operations & Governance Module', () => {
  const mockDashboard = {
    period: { from: null, to: null },
    totals: {
      users: 320,
      journeys_created: 1420,
      active_journeys_in_flight: 38,
      journey_searches: 5000,
      deviations: 12,
      community_reports: 60,
      pending_reports: 5,
      notifications_sent: 512,
    },
    journey_completion_rate: 94,
    journey_cancellation_rate: 6,
    report_approval_rate: 88,
    average_user_trust_score: 86,
  }

  const mockAdminReports = [
    {
      id: 101,
      user_id: 5,
      report_type: 'delay',
      description: 'Major signal delay on Metro Line 2 near Opera.',
      status: 'pending',
      created_at: '2026-09-05T12:00:00Z',
    },
  ]

  const mockAdminUsers = [
    {
      id: 1,
      name: 'Admin Master',
      email: 'admin@wasel.eg',
      roles: [{ id: 1, name: 'admin' }],
    },
    {
      id: 2,
      name: 'Normal Passenger',
      email: 'passenger@example.com',
      roles: [{ id: 2, name: 'user' }],
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(adminApi, 'getAdminDashboard').mockResolvedValue(mockDashboard)
    vi.spyOn(reportsApi, 'getReports').mockResolvedValue({ data: mockAdminReports })
    vi.spyOn(adminApi, 'getAdminUsers').mockResolvedValue(mockAdminUsers)
  })

  it('renders Admin Dashboard operational KPI metrics and rates', async () => {
    renderWithProviders(<AdminDashboard />, {
      route: '/admin',
      user: mockAdminUsers[0],
    })

    await waitFor(() => {
      expect(screen.getByText('Admin Operations Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/1[,.]?420/)).toBeInTheDocument()
      expect(screen.getByText('38')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('allows moderator to verify a pending report with notes in moderation queue', async () => {
    const modSpy = vi.spyOn(reportsApi, 'moderateReport').mockResolvedValue({
      success: true,
      message: 'Moderation action applied successfully',
    })
    vi.spyOn(reportsApi, 'getUserTrust').mockResolvedValue({ score: 90 })
    vi.spyOn(reportsApi, 'getReportModerations').mockResolvedValue({ data: [] })

    renderWithProviders(<AdminModeration />, {
      route: '/admin/moderation',
      user: mockAdminUsers[0],
    })

    await waitFor(() => {
      expect(screen.getByText('Reports Moderation Queue')).toBeInTheDocument()
      expect(screen.getByText(/Major signal delay on Metro Line 2/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^moderate$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^moderate$/i }))

    expect(screen.getByText('Moderate Report #101')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /confirm moderation action/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(modSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ action_taken: 'verify' })
      )
    })
  })

  it('lists users and allows admin to delete a user profile', async () => {
    const deleteUserSpy = vi.spyOn(adminApi, 'deleteAdminUser').mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<AdminUsers />, {
      route: '/admin/users',
      user: mockAdminUsers[0],
    })

    await waitFor(() => {
      expect(screen.getByText('User Directory & Roles')).toBeInTheDocument()
      expect(screen.getByText('Normal Passenger')).toBeInTheDocument()
      expect(screen.getByText(/passenger@example\.com/)).toBeInTheDocument()
    })

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteBtns[0])

    await waitFor(() => {
      expect(deleteUserSpy).toHaveBeenCalledWith(2)
    })
  })
})
