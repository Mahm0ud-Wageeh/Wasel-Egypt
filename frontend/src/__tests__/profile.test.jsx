import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Profile from '../pages/Profile'
import * as usersApi from '../api/users'
import { renderWithProviders } from '../test/test-utils'

describe('Profile & Transit Preferences Module', () => {
  const mockUser = {
    id: 1,
    name: 'Youssef Mansour',
    email: 'youssef@example.com',
    phone: '+201001234567',
    roles: [{ id: 1, name: 'passenger' }],
  }

  const mockTrust = {
    score: 88,
    verified_reports_count: 12,
    rejected_reports_count: 1,
  }

  const mockPrefs = {
    notify_deviation_detected: true,
    notify_recovery_available: true,
    notify_report_status_change: true,
    notify_service_alert_affected: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(usersApi, 'getUserProfile').mockResolvedValue(mockUser)
    vi.spyOn(usersApi, 'getUserTrustScore').mockResolvedValue(mockTrust)
    vi.spyOn(usersApi, 'getUserPreferences').mockResolvedValue(mockPrefs)
  })

  it('renders user details and trust score rank card', async () => {
    renderWithProviders(<Profile />, {
      route: '/profile',
      user: mockUser,
    })

    await waitFor(() => {
      expect(screen.getByText('Youssef Mansour')).toBeInTheDocument()
      expect(screen.getByText('youssef@example.com')).toBeInTheDocument()
      expect(screen.getByText('88')).toBeInTheDocument()
      expect(screen.getByText(/Trusted Scout/i)).toBeInTheDocument()
      expect(screen.getAllByText(/12/).length).toBeGreaterThan(0)
    })
  })

  it('allows user to edit name and phone profile information', async () => {
    const updateSpy = vi.spyOn(usersApi, 'updateUserProfile').mockResolvedValue({
      ...mockUser,
      name: 'Youssef M. Mansour',
    })

    renderWithProviders(<Profile />, {
      route: '/profile',
      user: mockUser,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    const nameInput = screen.getByLabelText(/full name/i)
    fireEvent.change(nameInput, { target: { value: 'Youssef M. Mansour' } })

    const saveBtn = screen.getByRole('button', { name: /save profile/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Youssef M. Mansour' })
      )
      expect(screen.getByText('Profile details updated successfully!')).toBeInTheDocument()
    })
  })

  it('saves updated notification and routing preferences', async () => {
    const updatePrefsSpy = vi.spyOn(usersApi, 'updateUserPreferences').mockResolvedValue({
      ...mockPrefs,
      quiet_hours_enabled: true,
    })

    renderWithProviders(<Profile />, {
      route: '/profile',
      user: mockUser,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save all preferences/i })).toBeInTheDocument()
    })

    const quietCheckbox = screen.getByText(/enable quiet hours/i).closest('label').querySelector('input')
    fireEvent.click(quietCheckbox)

    const saveBtn = screen.getByRole('button', { name: /save all preferences/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updatePrefsSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ quiet_hours_enabled: true })
      )
      expect(screen.getByText('Transit and notification preferences saved!')).toBeInTheDocument()
    })
  })
})
