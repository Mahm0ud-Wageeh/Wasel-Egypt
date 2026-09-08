import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import ActiveJourney from '../pages/ActiveJourney'
import * as activeApi from '../api/activeJourneys'
import { renderWithProviders } from '../test/test-utils'

describe('Active Journey & Live Tracking Module', () => {
  const mockActiveJourney = {
    id: 55,
    user_id: 1,
    status: 'active',
    started_at: '2026-09-05T12:00:00Z',
    current_progress_percent: 45,
    current_leg_index: 0,
    journey: {
      id: 10,
      journey_legs: [
        {
          id: 1,
          sequence: 1,
          mode: 'metro',
          route_variant_id: 12,
          from_lat: '30.04440000',
          from_lng: '31.23570000',
          to_lat: '30.04230000',
          to_lng: '31.23150000',
          duration_sec: 1200,
          distance_meters: 3500,
          departure_time: '2026-09-05T12:04:00Z',
          arrival_time: '2026-09-05T12:24:00Z',
          geometry: [[30.0444, 31.2357], [30.0435, 31.2335], [30.0423, 31.2315]],
          geometry_source: 'route_geometry',
          from_stop: { id: 1, name: 'Sadat Station', latitude: '30.0444', longitude: '31.2357' },
          to_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
        },
        {
          id: 2,
          sequence: 2,
          mode: 'bus',
          route_variant_id: 45,
          from_lat: '30.04230000',
          from_lng: '31.23150000',
          to_lat: '30.01000000',
          to_lng: '31.13000000',
          duration_sec: 900,
          distance_meters: 3200,
          departure_time: '2026-09-05T12:30:00Z',
          arrival_time: '2026-09-05T12:45:00Z',
          geometry: null,
          geometry_source: null,
          from_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
          to_stop: { id: 3, name: 'Pyramids Area', latitude: '30.0100', longitude: '31.1300' },
        },
      ],
    },
    tracking: {
      current_progress_percent: 45,
      current_leg_index: 0,
      current_leg: { id: 1, sequence: 1, mode: 'metro' },
      next_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
      nearest_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315', distance_meters: 180 },
      deviation: null,
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(activeApi, 'getActiveJourneys').mockResolvedValue({
      data: [mockActiveJourney],
    })
    vi.spyOn(activeApi, 'getActiveJourneyById').mockResolvedValue(mockActiveJourney)
  })

  it('renders active journey progress, leg itinerary and live map visualizer', async () => {
    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByText('Trip #55')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText(/Leg 1 \/ 2/)).toBeInTheDocument()
      expect(screen.getByText(/Sadat Station/i)).toBeInTheDocument()
      expect(screen.getByText('Itinerary')).toBeInTheDocument()
      expect(screen.getByLabelText('Map')).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: /journey progress/i })).toBeInTheDocument()
    })
  })

  it('sends GPS ping and updates tracking coordinates', async () => {
    const locSpy = vi.spyOn(activeApi, 'updateJourneyLocation').mockResolvedValue({
      data: {
        ...mockActiveJourney,
        current_progress_percent: 60,
      },
    })

    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ping on-route gps/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ping on-route gps/i }))

    await waitFor(() => {
      expect(locSpy).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          speed_mps: 1.4,
        })
      )
    })
  })

  it('completes the journey successfully', async () => {
    const completeSpy = vi.spyOn(activeApi, 'completeJourney').mockResolvedValue({
      data: { ...mockActiveJourney, status: 'completed' },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete journey/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /complete journey/i }))

    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledWith(55)
      expect(screen.getByText('Journey completed! Great trip.')).toBeInTheDocument()
    })
  })

  it('cancels the journey successfully', async () => {
    const cancelSpy = vi.spyOn(activeApi, 'cancelJourney').mockResolvedValue({
      data: { ...mockActiveJourney, status: 'cancelled' },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel trip/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancel trip/i }))

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(55)
      expect(screen.getByText('Journey cancelled.')).toBeInTheDocument()
    })
  })
})
