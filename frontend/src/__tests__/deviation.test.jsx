import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Deviation from '../pages/Deviation'
import * as activeApi from '../api/activeJourneys'
import { renderWithProviders } from '../test/test-utils'

describe('Deviation & Recovery Module', () => {
  const mockDeviations = [
    {
      id: 1,
      active_journey_id: 55,
      deviation_type: 'off_route',
      severity: 'medium',
      description: 'Vehicle drifted 450m away from planned bus corridor.',
      can_continue: true,
      occurred_at: '2026-09-05T12:10:00Z',
      latitude: 30.0378,
      longitude: 31.2205,
      expected_stop: { id: 4, name: 'Dokki Station' },
    },
  ]

  const mockRecoveryOptions = [
    {
      id: 201,
      estimated_delay_sec: 420,
      score: 88,
      alternative_journey: {
        id: 99,
        total_duration_sec: 1800,
        journey_legs: [
          {
            id: 10,
            sequence: 1,
            mode: 'metro',
            from_lat: '30.0378',
            from_lng: '31.2205',
            to_lat: '30.0423',
            to_lng: '31.2315',
            duration_sec: 600,
            geometry: [[30.0378, 31.2205], [30.0423, 31.2315]],
            from_stop: { id: 4, name: 'Dokki Station' },
            to_stop: { id: 2, name: 'Giza Station' },
          },
        ],
      },
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(activeApi, 'getActiveJourneyById').mockResolvedValue({ id: 55, status: 'deviated' })
    vi.spyOn(activeApi, 'getJourneyDeviations').mockResolvedValue({ data: mockDeviations })
    vi.spyOn(activeApi, 'listRecoveryOptions').mockResolvedValue({ data: mockRecoveryOptions })
  })

  it('renders deviation alert, severity, description, and expected stop', async () => {
    renderWithProviders(<Deviation />, {
      route: '/active-journeys/55/deviation',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByText('Route Deviation')).toBeInTheDocument()
      expect(screen.getByText(/Vehicle drifted 450m away/i)).toBeInTheDocument()
      expect(screen.getByText(/Dokki Station/i)).toBeInTheDocument()
      expect(screen.getByText(/Safe to resume without reroute/i)).toBeInTheDocument()
    })
  })

  it('resumes journey when resume button is clicked', async () => {
    const resumeSpy = vi.spyOn(activeApi, 'resumeJourney').mockResolvedValue({ success: true })

    renderWithProviders(<Deviation />, {
      route: '/active-journeys/55/deviation',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resume original plan/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /resume original plan/i }))

    await waitFor(() => {
      expect(resumeSpy).toHaveBeenCalledWith(55)
      expect(screen.getByText('Journey resumed on original plan!')).toBeInTheDocument()
    })
  })

  it('generates recovery reroute options and accepts a new route', async () => {
    const genSpy = vi.spyOn(activeApi, 'generateRecoveryOptions').mockResolvedValue({
      data: mockRecoveryOptions,
    })
    const acceptSpy = vi.spyOn(activeApi, 'acceptRecoveryOption').mockResolvedValue({
      success: true,
      message: 'Journey rerouted successfully',
    })

    renderWithProviders(<Deviation />, {
      route: '/active-journeys/55/deviation',
      user: { id: 1 },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find new routes/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /find new routes/i }))

    await waitFor(() => {
      expect(genSpy).toHaveBeenCalledWith(55, 3)
      expect(screen.getByText('Recovery Option #1')).toBeInTheDocument()
      expect(screen.getByText('+7 min delay')).toBeInTheDocument()
    })

    const acceptBtn = screen.getByRole('button', { name: /use this route/i })
    fireEvent.click(acceptBtn)

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith(55, 201)
      expect(screen.getByText(/New route plan accepted!/i)).toBeInTheDocument()
    })
  })
})
