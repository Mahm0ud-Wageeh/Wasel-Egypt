import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import ActiveJourney from '../legacy-pages/ActiveJourney'
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
      // The next stop appears in the cockpit hero AND the itinerary timeline.
      expect(screen.getAllByText(/Sadat Station/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Next stop: Giza Station/i)).toBeInTheDocument()
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

  it('displays missed-stop advice and auto-reroute countdown when deviated', async () => {
    const deviatedJourney = {
      ...mockActiveJourney,
      status: 'deviated',
      tracking: {
        ...mockActiveJourney.tracking,
        deviation: {
          id: 1,
          type: 'missed_stop',
          severity: 'high',
          description: 'انزل الجاية Giza Station وامشي 150m راجع إلى Sadat Station',
        },
      },
    }

    vi.spyOn(activeApi, 'getActiveJourneyById').mockResolvedValue(deviatedJourney)
    vi.spyOn(activeApi, 'getActiveJourneys').mockResolvedValue({ data: [deviatedJourney] })

    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      // Deviation advice rendered in overlay countdown banner and sheet alert
      expect(screen.getAllByText(/انزل الجاية Giza Station وامشي 150m راجع/i).length).toBeGreaterThan(0)
      // Auto-reroute countdown banner rendered
      expect(screen.getByRole('button', { name: /reroute now/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /keep plan/i })).toBeInTheDocument()
    })
  })

  it('automatically enables live tracking on start for active journey, allowing manual override', async () => {
    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      const liveBtn = screen.getByRole('button', { name: /live gps|live/i })
      expect(liveBtn).toHaveAttribute('aria-pressed', 'true')
    })

    // Rider manually clicks Live toggle to override
    const liveBtn = screen.getByRole('button', { name: /live gps|live/i })
    fireEvent.click(liveBtn)

    await waitFor(() => {
      expect(liveBtn).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('renders honest banner and retry button when GPS permission is denied', async () => {
    const originalGeo = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        watchPosition: vi.fn((_success, error) => {
          error({ code: 1, PERMISSION_DENIED: 1, message: 'User denied geolocation' })
          return 123
        }),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    })

    try {
      renderWithProviders(<ActiveJourney />, {
        route: '/active-journeys/55',
        authState: { isAuthenticated: true, user: { id: 1 } },
      })

      await waitFor(() => {
        expect(screen.getByText(/Location permission was denied/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    } finally {
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeo,
        writable: true,
        configurable: true,
      })
    }
  })

  it('renders pre-fix route and straight-line fallback badge for null-geometry legs', async () => {
    renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    await waitFor(() => {
      // Leg 2 has geometry: null, must render the honesty badge
      expect(screen.getByText('Straight-line estimate')).toBeInTheDocument()
      expect(screen.getByText('Trip #55')).toBeInTheDocument()
    })
  })

  it('freezes puck and shows stale banner when GPS is lost', async () => {
    let errCb = null
    let callCount = 0
    const originalGeo = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        watchPosition: vi.fn((success, error) => {
          callCount++
          errCb = error
          if (callCount === 1) {
            success({
              coords: {
                latitude: 30.0444,
                longitude: 31.2357,
                accuracy: 10,
                heading: 45,
                speed: 2.0,
              },
              timestamp: Date.now(),
            })
          } else {
            error({ code: 2, POSITION_UNAVAILABLE: 2, message: 'Position lost' })
          }
          return 456
        }),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    })

    try {
      renderWithProviders(<ActiveJourney />, {
        route: '/active-journeys/55',
        authState: { isAuthenticated: true, user: { id: 1 } },
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /live gps|live/i })).toHaveAttribute('aria-pressed', 'true')
        expect(errCb).toBeTypeOf('function')
      })

      // Simulate GPS loss / error after first fix
      act(() => {
        errCb({ code: 2, POSITION_UNAVAILABLE: 2, message: 'Position lost' })
      })

      await waitFor(() => {
        expect(screen.getByText(/GPS signal lost · Last known position retained/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    } finally {
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeo,
        writable: true,
        configurable: true,
      })
    }
  })
})

