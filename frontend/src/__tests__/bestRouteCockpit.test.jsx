import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import ActiveJourney from '../legacy-pages/ActiveJourney'
import { JourneyResultsPage } from '../legacy-pages/JourneyResults'
import * as journeyApi from '../api/journeys'
import * as activeApi from '../api/activeJourneys'
import { renderWithProviders, mockJourneyPlan } from '../test/test-utils'

/**
 * Core product behaviors under test:
 * 1. Planning exposes exactly ONE best recommended journey (never a carousel).
 * 2. Start Journey persists the recommended route and activates it.
 * 3. The active journey renders as a map-first Journey Cockpit whose panel
 *    shows the next action, next stop, progress, remaining time and ETA,
 *    with the map receiving leg-progress + next-stop emphasis props.
 * 4. Camera safety: cockpit progress props never feed the map's fit inputs.
 */

let mapProps = null
vi.mock('../components/map/LazyMapPanel', () => ({
  MapPanel: (props) => {
    mapProps = props
    return <div data-testid="map-stub" aria-label="Map" />
  },
}))

const searchParams = {
  origin_lat: 30.0617,
  origin_lng: 31.2464,
  destination_lat: 30.0444,
  destination_lng: 31.2357,
  requested_at: '2026-09-05T12:00:00Z',
  max_transfers: 1,
  max_walk_distance_per_leg: 1000,
}

describe('Single best route — planning contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'searchPublicStops').mockResolvedValue([])
  })

  it('Start Journey auto-saves the recommended route (option_index 0) then activates it', async () => {
    const saveSpy = vi.spyOn(journeyApi, 'saveJourney').mockResolvedValue({ data: { id: 99, status: 'planned' } })
    const startSpy = vi.spyOn(journeyApi, 'startSavedJourney').mockResolvedValue({ id: 7, status: 'active' })

    renderWithProviders(<JourneyResultsPage />, {
      route: '/journeys/results',
      journeyState: { searchParams, searchResults: mockJourneyPlan.options },
    })

    fireEvent.click(screen.getByRole('button', { name: /start journey/i }))

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ optionIndex: 0 }))
      expect(startSpy).toHaveBeenCalledWith(99)
    })
  })

  it('Start Journey reuses an already-saved journey instead of saving twice', async () => {
    const saveSpy = vi.spyOn(journeyApi, 'saveJourney').mockResolvedValue({ data: { id: 99, status: 'planned' } })
    const startSpy = vi.spyOn(journeyApi, 'startSavedJourney').mockResolvedValue({ id: 7, status: 'active' })

    renderWithProviders(<JourneyResultsPage />, {
      route: '/journeys/results',
      journeyState: { searchParams, searchResults: mockJourneyPlan.options },
    })

    fireEvent.click(screen.getByRole('button', { name: /save journey/i }))
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /start journey/i }))

    await waitFor(() => expect(startSpy).toHaveBeenCalledWith(99))
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })
})

describe('Journey Cockpit — map-first active journey', () => {
  const cockpitJourney = {
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
          id: 1, sequence: 1, mode: 'metro', route_variant_id: 12,
          from_lat: '30.0444', from_lng: '31.2357', to_lat: '30.0423', to_lng: '31.2315',
          duration_sec: 1200, distance_meters: 3500,
          departure_time: '2026-09-05T12:04:00Z', arrival_time: '2026-09-05T12:24:00Z',
          geometry: [[30.0444, 31.2357], [30.0423, 31.2315]],
          from_stop: { id: 1, name: 'Sadat Station', latitude: '30.0444', longitude: '31.2357' },
          to_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
        },
        {
          id: 2, sequence: 2, mode: 'bus', route_variant_id: 45,
          from_lat: '30.0423', from_lng: '31.2315', to_lat: '30.0100', to_lng: '31.1300',
          duration_sec: 900, distance_meters: 3200,
          departure_time: '2026-09-05T12:30:00Z', arrival_time: '2026-09-05T12:45:00Z',
          geometry: null,
          from_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
          to_stop: { id: 3, name: 'Pyramids Area', latitude: '30.0100', longitude: '31.1300' },
        },
      ],
    },
    tracking: {
      current_progress_percent: 45,
      current_leg_index: 0,
      next_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315' },
      nearest_stop: { id: 2, name: 'Giza Station', latitude: '30.0423', longitude: '31.2315', distance_meters: 180 },
      deviation: null,
    },
  }

  const renderCockpit = (journey = cockpitJourney) => {
    mapProps = null
    vi.spyOn(activeApi, 'getActiveJourneys').mockResolvedValue({ data: [journey] })
    vi.spyOn(activeApi, 'getActiveJourneyById').mockResolvedValue(journey)
    return renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the next action at the top of the hierarchy: next stop, line, boarding, transfer hint', async () => {
    renderCockpit()

    await waitFor(() => {
      // Transit leg: next stop hero from live tracking…
      expect(screen.getByText(/Next stop: Giza Station/i)).toBeInTheDocument()
      // …with boarding/alighting context from the real leg data…
      expect(screen.getByText(/Board at Sadat Station/)).toBeInTheDocument()
      expect(screen.getByText(/Get off at Giza Station/)).toBeInTheDocument()
      // …and a transfer instruction because the next leg changes mode.
      expect(screen.getByText(/Transfer here/i)).toBeInTheDocument()
    })
  })

  it('shows a walking next action for walking legs', async () => {
    const walkingJourney = {
      ...cockpitJourney,
      journey: {
        ...cockpitJourney.journey,
        journey_legs: [{
          ...cockpitJourney.journey.journey_legs[0],
          mode: 'walking',
          type: 'walking',
          distance_meters: 350,
          route_variant_id: null,
          from_stop: { id: 1, name: 'Home', latitude: '30.0444', longitude: '31.2357' },
          to_stop: { id: 2, name: 'Giza Metro', latitude: '30.0423', longitude: '31.2315' },
        }],
      },
    }
    renderCockpit(walkingJourney)

    await waitFor(() => {
      expect(screen.getByText(/Walk 350 m to Giza Metro/i)).toBeInTheDocument()
    })
  })

  it('shows progress, remaining journey and arrival estimate together', async () => {
    renderCockpit()

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText(/Leg 1 \/ 2/)).toBeInTheDocument()
      // Plan-based remainder: metro 1200s + bus 900s = 35 min.
      expect(screen.getByText(/~35 min remaining/i)).toBeInTheDocument()
      expect(screen.getByText(/Arriving ~/i)).toBeInTheDocument()
    })
  })

  it('feeds the map the leg progress and next-stop emphasis without touching fit inputs', async () => {
    renderCockpit()

    await waitFor(() => expect(mapProps).not.toBeNull())
    // Journey-progress styling inputs…
    expect(mapProps.currentLegIndex).toBe(0)
    // …next-stop emphasis on the map…
    expect(mapProps.highlightStop).toEqual({ lat: 30.0423, lng: 31.2315 })
    // …and the camera contract is untouched: fitTo stays a static mode, and
    // no per-ping camera object is passed.
    expect(mapProps.fitTo).toBe('route')
  })

  it('expands and collapses the details sheet without removing content from the document', async () => {
    renderCockpit()

    await waitFor(() => expect(screen.getByText('Itinerary')).toBeInTheDocument())

    const toggle = screen.getByRole('button', { name: /journey details/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // Collapse is presentational (CSS): the itinerary stays in the DOM.
    expect(screen.getByText('Itinerary')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('hides and reopens the whole panel without resetting the camera', async () => {
    renderCockpit()

    await waitFor(() => expect(screen.getByText('Itinerary')).toBeInTheDocument())

    // Desktop/topbar hide toggle: exact localized label (panel_hide).
    const hideBtn = screen.getByRole('button', { name: /hide journey panel/i })
    fireEvent.click(hideBtn)
    expect(document.querySelector('.cockpit__panel--hidden')).not.toBeNull()
    // Floating reopen control appears.
    const reopen = screen.getByRole('button', { name: /show journey panel/i })
    fireEvent.click(reopen)
    expect(document.querySelector('.cockpit__panel--hidden')).toBeNull()
    // Camera contract untouched: fitTo never became a dynamic input.
    expect(mapProps.fitTo).toBe('route')
  })

  it('auto-arms live GPS on start and shows honest reduced tracking', async () => {
    renderCockpit()

    await waitFor(() => expect(screen.getByText('Itinerary')).toBeInTheDocument())

    // Auto-live on Start: jsdom has no geolocation, so the honest
    // reduced-tracking path shows WITHOUT clicking the toggle.
    await waitFor(() => {
      expect(screen.getByText(/Reduced tracking/i)).toBeInTheDocument()
    })
    // The map still receives a follow flag + interrupt hook (wired even when
    // GPS is unavailable, so permission recovery works without remount).
    expect(typeof mapProps.onFollowInterrupt).toBe('function')
    expect(mapProps.follow).toBe(false)

    // Manual override: toggling Live GPS off hides the banner…
    const liveBtn = screen.getByRole('button', { name: /live gps/i })
    fireEvent.click(liveBtn)
    await waitFor(() => {
      expect(screen.queryByText(/Reduced tracking/i)).not.toBeInTheDocument()
    })
    // …and toggling it back on restores honest tracking state.
    fireEvent.click(liveBtn)
    await waitFor(() => {
      expect(screen.getByText(/Reduced tracking/i)).toBeInTheDocument()
    })
  })

  it('surfaces the deviation recovery path inside the cockpit', async () => {
    const deviated = {
      ...cockpitJourney,
      status: 'deviated',
      tracking: { ...cockpitJourney.tracking, deviation: { latitude: 30.05, longitude: 31.24, severity: 'high' } },
    }
    renderCockpit(deviated)

    await waitFor(() => {
      expect(screen.getByText(/Deviation detected/i)).toBeInTheDocument()
      // Map chip leads to the recovery screen…
      expect(screen.getByRole('button', { name: /view recovery options/i })).toBeInTheDocument()
      // …and the panel offers instant reroute vs keep-plan directly.
      expect(screen.getByRole('button', { name: /^reroute now$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^keep plan$/i })).toBeInTheDocument()
    })
  })

  it('completed journeys hide live controls but keep the record visible', async () => {
    renderCockpit({ ...cockpitJourney, status: 'completed', current_progress_percent: 100 })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /complete journey/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel trip/i })).not.toBeInTheDocument()
      expect(screen.getByText('Itinerary')).toBeInTheDocument()
    })
  })
})
