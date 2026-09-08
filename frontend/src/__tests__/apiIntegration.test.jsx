import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { JourneySearchPage } from '../pages/JourneySearch'
import { JourneyResultsPage } from '../pages/JourneyResults'
import * as client from '../api/client'
import * as journeyApi from '../api/journeys'
import * as placesApi from '../api/places'
import { renderWithProviders, mockJourneyPlan, mockStops } from '../test/test-utils'

/**
 * API contract integration: the frontend must call the real Laravel
 * endpoints with the exact contracts the backend defines.
 */
describe('Journey API Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const openDetails = async () => {
    renderWithProviders(<JourneyResultsPage />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: {
          origin_lat: 30.0617,
          origin_lng: 31.2464,
          destination_lat: 30.0444,
          destination_lng: 31.2357,
          requested_at: '2026-09-05T12:00:00Z',
          max_transfers: 1,
          max_walk_distance_per_leg: 1000,
          alternatives: 3,
          avoided_modes: [],
        },
        searchResults: mockJourneyPlan.options,
      },
    })

    const cards = screen.getAllByRole('button')
    const optionCard = cards.find((c) => c.className.includes('journey-option'))
    fireEvent.click(optionCard)
    await screen.findByRole('dialog', { name: 'Journey details' })
  }

  it('calls searchJourneys with exact parameters matching the backend JourneySearchRequest', async () => {
    // No journeyApi mocks here: the component must flow through the real
    // api module into the (spied) HTTP layer.
    const apiRequestSpy = vi.spyOn(client, 'apiRequest').mockImplementation(async (url) => {
      if (String(url).includes('/journeys/search')) {
        return { success: true, data: mockJourneyPlan }
      }
      return { data: mockStops }
    })

    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    fireEvent.change(screen.getByTestId('origin-picker'), {
      target: { value: '30.0617, 31.2464' },
    })
    fireEvent.change(screen.getByTestId('destination-picker'), {
      target: { value: '30.0444, 31.2357' },
    })

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(apiRequestSpy).toHaveBeenCalledWith(
        '/journeys/search',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            origin_lat: 30.0617,
            origin_lng: 31.2464,
            destination_lat: 30.0444,
            destination_lng: 31.2357,
            max_transfers: 1,
            max_walk_distance_per_leg: 1000,
            alternatives: 3,
            avoided_modes: [],
          }),
        })
      )
    })
  })

  it('place+stop autocomplete hits GET /places/search server-side without auth', async () => {
    const apiRequestSpy = vi.spyOn(client, 'apiRequest').mockResolvedValue({
      data: { query: 'Shohadaa', stops: mockStops, places: [] },
    })

    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    fireEvent.change(screen.getByTestId('origin-picker'), {
      target: { value: 'Shohadaa' },
    })

    await waitFor(
      () => {
        expect(apiRequestSpy).toHaveBeenCalledWith(
          expect.stringContaining('/places/search?q=Shohadaa'),
          expect.objectContaining({ auth: false })
        )
      },
      { timeout: 2500 }
    )
  })

  it('calls saveJourney with POST /journeys containing searchPayload and option_index', async () => {
    const getDataSpy = vi.spyOn(client, 'getData').mockResolvedValue({
      data: { id: 99, status: 'planned' },
    })

    await openDetails()

    fireEvent.click(screen.getByRole('button', { name: /save journey/i }))

    await waitFor(() => {
      expect(getDataSpy).toHaveBeenCalledWith(
        '/journeys',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            origin_lat: 30.0617,
            origin_lng: 31.2464,
            destination_lat: 30.0444,
            destination_lng: 31.2357,
            option_index: 0,
          }),
        })
      )
    })
  })

  it('does not create duplicate saves from repeated clicks', async () => {
    const getDataSpy = vi.spyOn(client, 'getData').mockResolvedValue({
      data: { id: 99, status: 'planned' },
    })

    await openDetails()

    const saveBtn = screen.getByRole('button', { name: /save journey/i })
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(screen.getByText(/Saved to your trips/i)).toBeInTheDocument()
    })

    // second click (button is now disabled, but assert the API was called once)
    fireEvent.click(saveBtn)

    await waitFor(() => {
      const calls = getDataSpy.mock.calls.filter(([url]) => url === '/journeys')
      expect(calls).toHaveLength(1)
    })
  })

  it('starts a saved journey via POST /journeys/{id}/start after saving', async () => {
    vi.spyOn(client, 'getData').mockResolvedValue({
      data: { id: 99, status: 'planned' },
    })
    const apiRequestSpy = vi.spyOn(client, 'apiRequest').mockResolvedValue({
      data: { id: 7, status: 'active', journey: { id: 99 } },
    })

    await openDetails()

    fireEvent.click(screen.getByRole('button', { name: /save journey/i }))
    await waitFor(() => {
      expect(screen.getByText(/Saved to your trips/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /start journey/i }))

    await waitFor(() => {
      expect(apiRequestSpy).toHaveBeenCalledWith(
        '/journeys/99/start',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
