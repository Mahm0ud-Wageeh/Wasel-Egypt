import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { JourneySearchPage } from '../pages/JourneySearch'
import { ApiError } from '../api/client'
import * as journeyApi from '../api/journeys'
import * as placesApi from '../api/places'
import { renderWithProviders } from '../test/test-utils'

/**
 * Real API failure handling on the search screen: stop-search outage,
 * 422 validation, 401 session expiry, network failure.
 */
describe('Journey Error States', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const fillCoordinates = () => {
    fireEvent.change(screen.getByTestId('origin-picker'), {
      target: { value: '30.0617, 31.2464' },
    })
    fireEvent.change(screen.getByTestId('destination-picker'), {
      target: { value: '30.0444, 31.2357' },
    })
  }

  it('displays warning alert when stop search fails', async () => {
    vi.spyOn(placesApi, 'searchPlaces').mockRejectedValue(new Error('Network error'))

    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    fireEvent.change(screen.getByTestId('origin-picker'), { target: { value: 'Tahrir' } })

    await waitFor(() => {
      expect(screen.getByText('Location search unavailable')).toBeInTheDocument()
      expect(
        screen.getByText(/you can paste coordinates/i)
      ).toBeInTheDocument()
    })
  })

  it('displays 422 validation errors returned from the search API', async () => {
    vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue({ stops: [], places: [] })
    vi.spyOn(journeyApi, 'searchJourneys').mockRejectedValue(
      new ApiError(422, 'Validation failed', {
        errors: {
          max_walk_distance_per_leg: ['The max walk distance must not exceed 10000 meters.'],
        },
      })
    )

    renderWithProviders(<JourneySearchPage />, { route: '/search' })
    fillCoordinates()

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument()
      expect(
        screen.getByText('The max walk distance must not exceed 10000 meters.')
      ).toBeInTheDocument()
    })
  })

  it('displays 401 unauthorized session expiry error', async () => {
    vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue({ stops: [], places: [] })
    vi.spyOn(journeyApi, 'searchJourneys').mockRejectedValue(
      new ApiError(401, 'Unauthenticated.')
    )

    renderWithProviders(<JourneySearchPage />, { route: '/search' })
    fillCoordinates()

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument()
      expect(
        screen.getByText('Your session has expired. Please log in again.')
      ).toBeInTheDocument()
    })
  })

  it('displays network failure error alert', async () => {
    vi.spyOn(placesApi, 'searchPlaces').mockResolvedValue({ stops: [], places: [] })
    vi.spyOn(journeyApi, 'searchJourneys').mockRejectedValue(
      new ApiError(0, 'Network unreachable. Check your connection and try again.')
    )

    renderWithProviders(<JourneySearchPage />, { route: '/search' })
    fillCoordinates()

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument()
      expect(
        screen.getByText('Network unreachable. Check your connection and try again.')
      ).toBeInTheDocument()
    })
  })
})
