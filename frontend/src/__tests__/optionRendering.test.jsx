import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { JourneyResultsPage } from '../pages/JourneyResults'
import * as journeyApi from '../api/journeys'
import { renderWithProviders, mockJourneyPlan } from '../test/test-utils'

/**
 * Journey option rendering: full metric surface, route strip, badges,
 * disruption status, details timeline, score explanation, map sync.
 */
describe('Journey Option Rendering', () => {
  const defaultSearchParams = {
    origin_lat: 30.0617,
    origin_lng: 31.2464,
    destination_lat: 30.0444,
    destination_lng: 31.2357,
    requested_at: '2026-09-05T12:00:00Z',
    max_transfers: 1,
    max_walk_distance_per_leg: 1000,
  }

  const renderResults = (options = mockJourneyPlan.options) =>
    renderWithProviders(<JourneyResultsPage />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: defaultSearchParams,
        searchResults: options,
      },
    })

  const openDetails = async () => {
    renderResults()
    const cards = screen.getAllByRole('button')
    const optionCard = cards.find((c) => c.className.includes('journey-option'))
    fireEvent.click(optionCard)
    return screen.findByRole('dialog', { name: 'Journey details' }, { timeout: 2500 })
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'searchPublicStops').mockResolvedValue([])
  })

  it('renders options with duration, departure-arrival, walking, fare, and score', () => {
    renderResults()

    // Option 1: 1200 sec = 20 min, direct, 250m walking, 8 EGP, score 1.05
    expect(screen.getByText('20 min')).toBeInTheDocument()
    expect(screen.getByText('Direct')).toBeInTheDocument()
    expect(screen.getByText(/250 m walking/)).toBeInTheDocument()
    expect(screen.getByText(/8 EGP/)).toBeInTheDocument()
    // departure → arrival line (jsdom formats in local TZ — assert the shape)
    expect(screen.getAllByText(/→\s*\d{1,2}:\d{2}/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/score 1\.05|score 1\.85/).length).toBeGreaterThan(0)
  })

  it('renders the recommended badge on the top option', () => {
    renderResults()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
  })

  it('renders a semantic route strip (no emoji) on every option card', () => {
    renderResults()

    const strips = screen.getAllByRole('img', { name: /Route: Origin →/ })
    expect(strips.length).toBe(mockJourneyPlan.options.length)
    expect(strips[0].getAttribute('aria-label')).toMatch(/→ Destination/)
    const bodyText = document.body.textContent
    expect(bodyText.match(/[\u{1F300}-\u{1FAFF}\u2300-\u27BF]/gu)).toBeNull()
  })

  it('shows the disruption banner for a disrupted option', () => {
    const disrupted = mockJourneyPlan.options.map((o, i) =>
      i === 1
        ? { ...o, disrupted: true, alerts: [{ id: 3, header_text: 'Signal maintenance on Line 1' }] }
        : o
    )
    renderResults(disrupted)

    expect(screen.getByText('Service alert on this route')).toBeInTheDocument()
    expect(screen.getByText(/Signal maintenance on Line 1/)).toBeInTheDocument()
  })

  it('opens details with a full timeline: origin, legs, transfer, destination', async () => {
    const dialog = await openDetails()

    expect(within(dialog).getByText('Origin')).toBeInTheDocument()
    expect(within(dialog).getByText('Destination')).toBeInTheDocument()
    expect(within(dialog).getAllByText(/Walk/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/Metro · Line 1/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/Al-Shohadaa/).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/Sadat/).length).toBeGreaterThan(0)
  })

  it('explains the score with component contributions inside details', async () => {
    const dialog = await openDetails()

    expect(within(dialog).getByText('Why this ranking')).toBeInTheDocument()
    expect(within(dialog).getByText(/time 40% · walking 20% · transfers 20% · fare 10% · reliability 10%/)).toBeInTheDocument()
    for (const label of ['Time', 'Walking', 'Transfers', 'Fare', 'Reliability']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument()
    }
  })

  it('syncs the map with the itinerary (map mounts beside the list)', () => {
    renderResults()

    expect(screen.getByLabelText('Map')).toBeInTheDocument()
    expect(screen.getByText('20 min')).toBeInTheDocument()
  })

  it('renders an empty state with an "Adjust search" action when no journeys match', () => {
    renderResults([])

    expect(screen.getByText('No journeys found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adjust search/i })).toBeInTheDocument()
  })

  it('closes the details dialog from the close button', async () => {
    const dialog = await openDetails()
    fireEvent.click(within(dialog).getByRole('button', { name: /close journey details/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Journey details' })).not.toBeInTheDocument()
    })
  })
})
