import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { JourneySearchPage } from '../pages/JourneySearch'
import { JourneyResultsPage } from '../pages/JourneyResults'
import * as journeyApi from '../api/journeys'
import { renderWithProviders, mockJourneyPlan, mockStops } from '../test/test-utils'

function TestApp() {
  return (
    <Routes>
      <Route path="/search" element={<JourneySearchPage />} />
      <Route path="/journeys/results" element={<JourneyResultsPage />} />
      <Route path="/home" element={<div>Home Page Destination</div>} />
    </Routes>
  )
}

/**
 * Navigation between search and results, layout structure, and the
 * details-drawer entry point.
 */
describe('Journey Navigation & Layout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'searchPublicStops').mockResolvedValue(mockStops)
    vi.spyOn(journeyApi, 'searchJourneys').mockResolvedValue({
      options: mockJourneyPlan.options,
    })
  })

  const searchViaCoordinates = async () => {
    fireEvent.change(screen.getByTestId('origin-picker'), {
      target: { value: '30.0617, 31.2464' },
    })
    fireEvent.change(screen.getByTestId('destination-picker'), {
      target: { value: '30.0444, 31.2357' },
    })
    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))
    await waitFor(() => {
      expect(screen.getByText('Search results')).toBeInTheDocument()
    })
  }

  it('navigates from /search to /journeys/results upon successful search', async () => {
    renderWithProviders(<TestApp />, { route: '/search' })

    await searchViaCoordinates()

    expect(screen.getByText('2 options available')).toBeInTheDocument()
  })

  it('redirects from /journeys/results to /search when searchParams are missing', async () => {
    renderWithProviders(<TestApp />, {
      route: '/journeys/results',
      journeyState: { searchParams: null, searchResults: null },
    })

    await waitFor(() => {
      expect(screen.getByText('Find your journey')).toBeInTheDocument()
    })
  })

  it('navigates back to /search when back button in results header is clicked', async () => {
    renderWithProviders(<TestApp />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: {
          origin_lat: 30.0617,
          origin_lng: 31.2464,
          destination_lat: 30.0444,
          destination_lng: 31.2357,
        },
        searchResults: mockJourneyPlan.options,
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /back to search/i }))

    await waitFor(() => {
      expect(screen.getByText('Find your journey')).toBeInTheDocument()
    })
  })

  it('navigates back to /search when "Adjust search" is clicked in empty state', async () => {
    renderWithProviders(<TestApp />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: {
          origin_lat: 30.0617,
          origin_lng: 31.2464,
          destination_lat: 30.0444,
          destination_lng: 31.2357,
        },
        searchResults: [],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /adjust search/i }))

    await waitFor(() => {
      expect(screen.getByText('Find your journey')).toBeInTheDocument()
    })
  })

  it('selecting an option opens the journey details dialog (details entry point)', async () => {
    renderWithProviders(<TestApp />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: {
          origin_lat: 30.0617,
          origin_lng: 31.2464,
          destination_lat: 30.0444,
          destination_lng: 31.2357,
        },
        searchResults: mockJourneyPlan.options,
      },
    })

    fireEvent.click(screen.getAllByRole('button', { name: /minibus \+ bus|metro/i })[0]
      ?? screen.getAllByRole('button', { name: /1 transfer|Direct/i })[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Journey details' })).toBeInTheDocument()
    })

    // close it again
    fireEvent.click(screen.getByRole('button', { name: /close journey details/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Journey details' })).not.toBeInTheDocument()
    })
  })

  it('renders the split layout structure (map + list, planner + map on search)', async () => {
    // Results: split layout with map and list
    renderWithProviders(<TestApp />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: {
          origin_lat: 30.0617,
          origin_lng: 31.2464,
          destination_lat: 30.0444,
          destination_lng: 31.2357,
        },
        searchResults: mockJourneyPlan.options,
      },
    })

    expect(document.querySelector('.results-split')).toBeInTheDocument()
    expect(document.querySelector('.results-split__map .map-panel')).toBeInTheDocument()
    expect(document.querySelector('.results-split__list')).toBeInTheDocument()

    // Search: planner panel + live map
    fireEvent.click(screen.getByRole('button', { name: /back to search/i }))
    await waitFor(() => {
      expect(document.querySelector('.planner-page')).toBeInTheDocument()
    })
    expect(document.querySelector('.planner-panel')).toBeInTheDocument()
    expect(document.querySelector('.planner-map .map-panel')).toBeInTheDocument()
  })
})
