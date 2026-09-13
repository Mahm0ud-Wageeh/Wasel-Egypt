import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import Deviation from '../pages/Deviation'
import * as activeApi from '../api/activeJourneys'
import { renderWithProviders } from '../test/test-utils'

/**
 * Deviation & recovery — an incident state of the Journey Cockpit.
 * Map-first (current position + original route + recovery route), fully
 * i18n-ized incident facts, and a singular recommended recovery option.
 */

let mapProps = null
vi.mock('../components/map/LazyMapPanel', () => ({
  MapPanel: (props) => {
    mapProps = props
    return <div data-testid="map-stub" aria-label="Map" />
  },
}))

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

  const renderDeviation = () =>
    renderWithProviders(<Deviation />, {
      route: '/active-journeys/55/deviation',
      user: { id: 1 },
    })

  beforeEach(() => {
    vi.restoreAllMocks()
    mapProps = null
    vi.spyOn(activeApi, 'getActiveJourneyById').mockResolvedValue({ id: 55, status: 'deviated' })
    vi.spyOn(activeApi, 'getJourneyDeviations').mockResolvedValue({ data: mockDeviations })
    vi.spyOn(activeApi, 'listRecoveryOptions').mockResolvedValue({ data: mockRecoveryOptions })
  })

  it('renders the incident summary: type, severity label, off-route distance, expected stop', async () => {
    renderDeviation()

    await waitFor(() => {
      expect(screen.getByText('Route deviation')).toBeInTheDocument()
      expect(screen.getByText('We detected that you left the planned route')).toBeInTheDocument()
      expect(screen.getByText('Moderate deviation')).toBeInTheDocument()
      expect(screen.getByText(/Off route by 450 m/i)).toBeInTheDocument()
      expect(screen.getByText(/Expected stop: Dokki Station/i)).toBeInTheDocument()
      expect(screen.getByText(/Safe to continue on the original route/i)).toBeInTheDocument()
      // No raw backend English or technical severity values leak into the UI.
      expect(document.body).not.toHaveTextContent('planned bus corridor')
      expect(document.body).not.toHaveTextContent(/(^|\s)high(\s|$)/)
    })
  })

  it('previews the recovery route map-first and keeps deviation position on the map', async () => {
    renderDeviation()

    await waitFor(() => {
      expect(mapProps).not.toBeNull()
      // The recommended recovery legs are the primary itinerary…
      expect(mapProps.itinerary.legs[0].from_lat).toBe(30.0378)
      // …with the deviation pin and live position…
      expect(mapProps.deviation).toMatchObject({ lat: 30.0378, lng: 31.2205, severity: 'medium' })
      expect(mapProps.userLocation).toMatchObject({ lat: 30.0378, lng: 31.2205 })
      // …and the fit contract untouched (no per-ping camera inputs).
      expect(mapProps.fitTo).toBe('route')
    })
  })

  it('resumes journey when the resume action is clicked', async () => {
    const resumeSpy = vi.spyOn(activeApi, 'resumeJourney').mockResolvedValue({ success: true })

    renderDeviation()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue on original route/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /continue on original route/i }))

    await waitFor(() => {
      expect(resumeSpy).toHaveBeenCalledWith(55)
      expect(screen.getByText('Journey resumed on the original route')).toBeInTheDocument()
    })
  })

  it('blocks resume by severity with an honest reason', async () => {
    vi.spyOn(activeApi, 'getJourneyDeviations').mockResolvedValue({
      data: [{ ...mockDeviations[0], severity: 'high', can_continue: false }],
    })

    renderDeviation()

    await waitFor(() => {
      expect(screen.getByText('Severe deviation')).toBeInTheDocument()
      const blocked = screen.getByRole('button', { name: /continuing is not available/i })
      expect(blocked).toBeDisabled()
      expect(screen.getByText(/Rerouting required/i)).toBeInTheDocument()
    })
  })

  it('generates recovery reroute options and accepts the recommended route', async () => {
    const genSpy = vi.spyOn(activeApi, 'generateRecoveryOptions').mockResolvedValue({
      data: mockRecoveryOptions,
    })
    const acceptSpy = vi.spyOn(activeApi, 'acceptRecoveryOption').mockResolvedValue({
      success: true,
      message: 'Journey rerouted successfully',
    })

    renderDeviation()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find a new route/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /find a new route/i }))

    await waitFor(() => {
      expect(genSpy).toHaveBeenCalledWith(55, 3)
      // Singular recommendation: the top-sorted option is labeled Recommended.
      expect(screen.getByText('Recommended')).toBeInTheDocument()
      expect(screen.getByText('+7 min delay')).toBeInTheDocument()
    })

    // Exact-name match: the selectable card is itself a button whose
    // accessible name contains this text — only the inner action accepts.
    fireEvent.click(screen.getByRole('button', { name: 'Use this route' }))

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith(55, 201)
      expect(screen.getByText(/Recovery route accepted/i)).toBeInTheDocument()
    })
  })

  it('shows the honest empty state when no alternatives can be calculated', async () => {
    vi.spyOn(activeApi, 'generateRecoveryOptions').mockResolvedValue({ data: [] })

    renderDeviation()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /find a new route/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /find a new route/i }))

    await waitFor(() => {
      expect(screen.getByText(/No recovery alternatives could be calculated/i)).toBeInTheDocument()
    })
  })
})
