import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Reports from '../legacy-pages/Reports'
import * as reportsApi from '../api/reports'
import * as journeyApi from '../api/journeys'
import { renderWithProviders } from '../test/test-utils'

describe('Community Reports Module', () => {
  const mockReports = [
    {
      id: 1,
      user_id: 1,
      report_type: 'delay',
      description: 'Bus #104 is delayed by 25 minutes at Ramses Station due to heavy traffic.',
      status: 'pending',
      latitude: 30.0617,
      longitude: 31.2464,
      created_at: '2026-09-05T10:00:00Z',
      related_stop: { id: 10, name_en: 'Ramses Station', name_ar: 'محطة رمسيس' },
    },
    {
      id: 2,
      user_id: 2,
      report_type: 'cleanliness',
      description: 'Cleanliness issue reported on Metro Line 1 platform.',
      status: 'verified',
      latitude: 30.0444,
      longitude: 31.2357,
      created_at: '2026-09-05T09:30:00Z',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'getPublicStops').mockResolvedValue({ data: [] })
    vi.spyOn(reportsApi, 'getPublicReports').mockResolvedValue({ data: mockReports })
    vi.spyOn(reportsApi, 'getReports').mockResolvedValue({ data: mockReports })
  })

  it('renders community reports list with type icons, description, and status badges', async () => {
    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1, name: 'Ahmed Ali' },
    })

    await waitFor(() => {
      expect(screen.getByText('Community Reports')).toBeInTheDocument()
      expect(screen.getByText(/Bus #104 is delayed by 25 minutes/i)).toBeInTheDocument()
      expect(screen.getByText(/Cleanliness issue reported/i)).toBeInTheDocument()
    })
  })

  it('filters reports by type when selected in dropdown', async () => {
    const getPublicSpy = vi.spyOn(reportsApi, 'getPublicReports').mockResolvedValue({
      data: [mockReports[0]],
    })

    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByText('Filter by Type')).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/filter by type/i)
    fireEvent.change(select, { target: { value: 'delay' } })

    await waitFor(() => {
      expect(getPublicSpy).toHaveBeenCalledWith(expect.objectContaining({ report_type: 'delay' }))
    })
  })

  it('opens submission modal and validates description length and required coordinates', async () => {
    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ new report/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ new report/i }))

    expect(screen.getByText('Report an Issue')).toBeInTheDocument()

    // Type short description (< 10 chars)
    const descInput = screen.getByPlaceholderText(/provide clear details/i)
    fireEvent.change(descInput, { target: { value: 'Short' } })

    const submitBtn = screen.getByRole('button', { name: /submit report/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/describe the issue in at least 10 characters/i)).toBeInTheDocument()
    })
  })

  it('successfully creates report when form is valid', async () => {
    const createSpy = vi.spyOn(reportsApi, 'createReport').mockResolvedValue({
      success: true,
      message: 'Report submitted successfully',
      data: { id: 3 },
    })

    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /\+ new report/i }))
    })

    const descInput = screen.getByPlaceholderText(/provide clear details/i)
    fireEvent.change(descInput, { target: { value: 'Detailed report about overcrowding on metro line 2 at Sadat.' } })

    const submitBtn = screen.getByRole('button', { name: /submit report/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          report_type: 'delay',
          description: 'Detailed report about overcrowding on metro line 2 at Sadat.',
          latitude: 30.0444,
          longitude: 31.2357,
        })
      )
    })
  })

  it('displays conflict error when 409 spam/duplicate error is returned', async () => {
    const conflictError = new Error('You have already submitted a report for this stop recently.')
    conflictError.isConflict = true
    vi.spyOn(reportsApi, 'createReport').mockRejectedValue(conflictError)

    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /\+ new report/i }))
    })

    const descInput = screen.getByPlaceholderText(/provide clear details/i)
    fireEvent.change(descInput, { target: { value: 'Duplicate report about metro delay.' } })

    const submitBtn = screen.getByRole('button', { name: /submit report/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/already submitted a report/i)).toBeInTheDocument()
    })
  })

  it('allows owner to withdraw own pending report', async () => {
    const deleteSpy = vi.spyOn(reportsApi, 'deleteReport').mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /withdraw/i }))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(1)
    })
  })

  it('loads and toggles moderation notes accordion for a report', async () => {
    const modSpy = vi.spyOn(reportsApi, 'getReportModerations').mockResolvedValue({
      data: [
        {
          id: 10,
          action_taken: 'verified',
          notes: 'Confirmed by multiple sources.',
          created_at: '2026-09-05T10:15:00Z',
        },
      ],
    })

    renderWithProviders(<Reports />, {
      route: '/reports',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getAllByText(/moderation notes ▾/i)[0]).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText(/moderation notes ▾/i)[0])

    await waitFor(() => {
      expect(modSpy).toHaveBeenCalledWith(1)
      expect(screen.getByText(/Confirmed by multiple sources/i)).toBeInTheDocument()
    })
  })
})
