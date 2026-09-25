import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import Landing from '../legacy-pages/Landing'
import * as journeyApi from '../api/journeys'
import * as placesApi from '../api/places'
import { renderWithProviders, mockJourneyPlan } from '../test/test-utils'

function LandingApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/journeys/results" element={<div>Results Page Destination</div>} />
      <Route path="/login" element={<div>Login Page Destination</div>} />
    </Routes>
  )
}

/**
 * Landing hero is a functional journey search: origin/destination
 * entry with validation, real search execution for authenticated
 * users, and a login hand-off preserving the draft for guests.
 */
describe('Landing hero search', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue({ stops: [], places: [] })
  })

  const fillCoordinates = () => {
    fireEvent.change(screen.getByTestId('origin-picker'), {
      target: { value: '30.0617, 31.2464' },
    })
    fireEvent.change(screen.getByTestId('destination-picker'), {
      target: { value: '30.0444, 31.2357' },
    })
  }

  it('renders functional origin/destination fields and a plan CTA in the hero', () => {
    renderWithProviders(<LandingApp />, { route: '/' })

    expect(screen.getByTestId('origin-picker')).toBeInTheDocument()
    expect(screen.getByTestId('destination-picker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /plan your journey/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/swap origin and destination/i)).toBeInTheDocument()
  })

  it('validates required origin and destination on empty submission', async () => {
    vi.spyOn(journeyApi, 'searchJourneys')
    renderWithProviders(<LandingApp />, { route: '/' })

    fireEvent.click(screen.getByRole('button', { name: /plan your journey/i }))

    await waitFor(() => {
      expect(screen.getByText('Please choose an origin.')).toBeInTheDocument()
      expect(screen.getByText('Please choose a destination.')).toBeInTheDocument()
    })
    expect(journeyApi.searchJourneys).not.toHaveBeenCalled()
  })

  it('runs the real search and lands in results for authenticated users', async () => {
    const searchSpy = vi.spyOn(journeyApi, 'searchJourneys').mockResolvedValue({
      options: mockJourneyPlan.options,
    })
    renderWithProviders(<LandingApp />, { route: '/' })

    fillCoordinates()
    fireEvent.click(screen.getByRole('button', { name: /plan your journey/i }))

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(expect.objectContaining({
        origin_lat: 30.0617,
        origin_lng: 31.2464,
        destination_lat: 30.0444,
        destination_lng: 31.2357,
      }))
    })
    await waitFor(() => {
      expect(screen.getByText('Results Page Destination')).toBeInTheDocument()
    })
  })

  it('hands guests to login with the draft preserved for /search', async () => {
    const searchSpy = vi.spyOn(journeyApi, 'searchJourneys')
    renderWithProviders(<LandingApp />, { route: '/', user: null })

    fillCoordinates()
    fireEvent.click(screen.getByRole('button', { name: /plan your journey/i }))

    // Protected endpoint must not be hit for guests…
    await waitFor(() => {
      expect(screen.getByText('Login Page Destination')).toBeInTheDocument()
    })
    expect(searchSpy).not.toHaveBeenCalled()

    // …but the validated draft survives in the journey store.
    const stored = JSON.parse(sessionStorage.getItem('wasel.journey.search'))
    expect(stored.origin_lat).toBe(30.0617)
    expect(stored.destination_lng).toBe(31.2357)
    expect(stored.originStop.name).toMatch(/Location \(30\.0617, 31\.2464\)/)
  })

  it('exposes a current-location affordance on the origin field', () => {
    renderWithProviders(<LandingApp />, { route: '/' })

    expect(
      screen.getByRole('button', { name: /use my current location for origin/i })
    ).toBeInTheDocument()
  })
})
