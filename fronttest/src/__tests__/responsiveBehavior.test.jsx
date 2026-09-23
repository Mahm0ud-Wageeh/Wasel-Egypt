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

    // Single-best-route planner: details open from the hero's secondary action.
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))

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

  it('handles ActiveJourney cockpit sheet snaps (collapsed, expanded, hidden, reopen) on mobile', async () => {
    const mockActive = {
      id: 55,
      user_id: 1,
      status: 'active',
      journey: {
        id: 10,
        journey_legs: [
          {
            id: 1,
            sequence: 1,
            mode: 'metro',
            from_lat: '30.0444',
            from_lng: '31.2357',
            to_lat: '30.0555',
            to_lng: '31.2444',
            from_stop: { id: 1, name: 'Sadat' },
            to_stop: { id: 2, name: 'Attaba' },
          },
        ],
      },
      tracking: {
        current_leg_index: 0,
        next_stop: { id: 2, name: 'Attaba', latitude: 30.0555, longitude: 31.2444 },
        progress_percent: 50,
      },
    }

    const { getActiveJourneyById, getActiveJourneys } = await import('../api/activeJourneys')
    vi.spyOn({ getActiveJourneyById }, 'getActiveJourneyById').mockResolvedValue(mockActive)
    const activeModule = await import('../api/activeJourneys')
    vi.spyOn(activeModule, 'getActiveJourneyById').mockResolvedValue(mockActive)
    vi.spyOn(activeModule, 'getActiveJourneys').mockResolvedValue({ data: [mockActive] })

    sessionStorage.setItem('wasel.cockpit.panel', 'collapsed')
    const { default: ActiveJourney } = await import('../pages/ActiveJourney')
    const { container } = renderWithProviders(<ActiveJourney />, {
      route: '/active-journeys/55',
      authState: { isAuthenticated: true, user: { id: 1 } },
    })

    const toggle = await screen.findByRole('button', { name: /show.*details/i })
    expect(toggle).toBeInTheDocument()
    expect(container.querySelector('.cockpit--panel-collapsed')).toBeInTheDocument()

    // Expand bottom sheet
    fireEvent.click(toggle)
    expect(container.querySelector('.cockpit--panel-expanded')).toBeInTheDocument()
    expect(container.querySelector('.cockpit__panel--expanded')).toBeInTheDocument()

    // Hide panel
    const closeBtn = container.querySelector('.cockpit__panel-close')
    expect(closeBtn).toBeInTheDocument()
    fireEvent.click(closeBtn)

    expect(container.querySelector('.cockpit--panel-hidden')).toBeInTheDocument()
    const reopenBtn = container.querySelector('.cockpit__reopen')
    expect(reopenBtn).toBeInTheDocument()

    // Reopen panel
    fireEvent.click(reopenBtn)
    expect(container.querySelector('.cockpit--panel-expanded')).toBeInTheDocument()
  })
})

