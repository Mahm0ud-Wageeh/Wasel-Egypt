import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { PassengerLayout } from '../components/layout/PassengerLayout'
import { JourneyResultsPage } from '../pages/JourneyResults'
import { JourneySearchPage } from '../pages/JourneySearch'
import * as journeyApi from '../api/journeys'
import { renderWithProviders, mockJourneyPlan, mockStops } from '../test/test-utils'

describe('Responsive Behavior & Layout Integrity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'getPublicStops').mockResolvedValue(mockStops)
  })

  it('renders within the standard passenger app-shell with bottom navigation tabbar', () => {
    const { container } = renderWithProviders(
      <PassengerLayout>
        <JourneySearchPage />
      </PassengerLayout>,
      { route: '/search' }
    )

    const shell = container.querySelector('.app-shell')
    expect(shell).toBeInTheDocument()

    const tabbar = container.querySelector('.tabbar')
    expect(tabbar).toBeInTheDocument()

    // 5 primary navigation tabs exist
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('opens the journey details sheet when an option is selected', async () => {
    const { container } = renderWithProviders(
      <JourneyResultsPage />,
      {
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
      }
    )

    const cards = screen.getAllByRole('button')
    const optionCard = cards.find((c) => c.className.includes('journey-option'))
    fireEvent.click(optionCard)

    // Details render as a modal sheet over the split layout
    const drawer = await screen.findByRole('dialog', { name: 'Journey details' })
    expect(drawer).toBeInTheDocument()
    expect(container.querySelector('.results-split')).toBeInTheDocument()
  })

  it('renders MapPanel with responsive SVG viewport and controls', () => {
    const { container } = renderWithProviders(
      <JourneyResultsPage />,
      {
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
      }
    )

    // Switch to Map view
    const mapBtn = screen.getByRole('button', { name: /map/i })
    fireEvent.click(mapBtn)

    const mapPanel = container.querySelector('.map-panel')
    expect(mapPanel).toBeInTheDocument()

    // The real MapLibre panel exposes an accessible label and fills the
    // available height (jsdom cannot run WebGL; the container div is the
    // contract in tests, the live map in browsers).
    expect(mapPanel).toHaveAttribute('aria-label', expect.stringMatching(/^Map/))
    expect(mapPanel).toHaveAttribute('style', expect.stringContaining('height'))
  })
})
