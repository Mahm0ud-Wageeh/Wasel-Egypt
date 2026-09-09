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

  const datedMetroFare = { amount: 8, currency: 'EGP', source: 'tfc_metro_fares_2024', as_of: '2024-10' }
  const attribution = 'Fare: Cairo Metro, recorded Oct 2024 (TfC via Mobility Database)'
  const optionCards = () => screen.getAllByRole('button').filter((c) => c.className.includes('journey-option'))

  it('attributes every visible metro fare in the card and details, including the score', () => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: datedMetroFare }])
    const card = optionCards()[0]
    expect(within(card).getByText(/8 EGP/)).toBeInTheDocument()
    expect(within(card).getByText(attribution)).toBeInTheDocument()
    fireEvent.click(card)
    const dialog = screen.getByRole('dialog', { name: 'Journey details' })
    expect(within(dialog).getAllByText('8 EGP')).toHaveLength(2)
    expect(within(dialog).getAllByText(attribution)).toHaveLength(2)
  })

  it.each(['bus', 'minibus', 'microbus'])('shows neither fare nor attribution for null-fare %s options', (mode) => {
    const ground = { ...mockJourneyPlan.options[1], fare: null,
      legs: mockJourneyPlan.options[1].legs.map((leg) => ({ ...leg, mode })) }
    renderResults([ground])
    expect(document.body).not.toHaveTextContent('EGP')
    expect(document.body).not.toHaveTextContent(attribution)
    fireEvent.click(optionCards()[0])
    expect(document.body).not.toHaveTextContent('EGP')
    expect(document.body).not.toHaveTextContent('Fare: Cairo Metro')
  })

  it('localizes attribution and its payload date in Arabic without raw keys', () => {
    localStorage.setItem('wasel.lang', 'ar')
    renderResults([{ ...mockJourneyPlan.options[0], fare: datedMetroFare }])
    const arabic = 'الأجرة: مترو القاهرة، مسجلة في أكتوبر ٢٠٢٤ (نقل للقاهرة عبر قاعدة بيانات التنقل)'
    expect(within(optionCards()[0]).getByText(arabic)).toBeInTheDocument()
    expect(within(optionCards()[0]).getByText(/8 EGP/)).toBeInTheDocument()
    fireEvent.click(optionCards()[0])
    expect(within(screen.getByRole('dialog')).getAllByText(arabic)).toHaveLength(2)
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.body).not.toHaveTextContent('journey.fare_attribution_metro')
    expect(document.body).not.toHaveTextContent('{date}')
    expect(document.body).not.toHaveTextContent('Fare: Cairo Metro')
  })

  it('formats the supplied month rather than hardcoding October 2024', () => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: { ...datedMetroFare, as_of: '2025-01' } }])
    expect(screen.getByText('Fare: Cairo Metro, recorded Jan 2025 (TfC via Mobility Database)')).toBeInTheDocument()
    expect(screen.queryByText(attribution)).not.toBeInTheDocument()
  })

  it.each([undefined, null, '', '2024-13', 'not-a-date'])('uses undated attribution for missing/invalid as_of: %s', (as_of) => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: { ...datedMetroFare, as_of } }])
    const generic = 'Fare: Cairo Metro (TfC via Mobility Database)'
    expect(screen.getByText(/8 EGP/)).toBeInTheDocument()
    expect(within(optionCards()[0]).getByText(generic)).toBeInTheDocument()
    fireEvent.click(optionCards()[0])
    expect(within(screen.getByRole('dialog')).getAllByText(generic)).toHaveLength(2)
    expect(document.body).not.toHaveTextContent('recorded')
    expect(document.body).not.toHaveTextContent('2024')
    expect(document.body).not.toHaveTextContent('Invalid Date')
  })

  it('credits an unversioned TfC fare without guessing its date or distributor', () => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: { amount: 8, currency: 'EGP', source: 'tfc_metro_fares' } }])
    expect(screen.getByText('Fare: Cairo Metro (TfC)')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('2024')
    expect(document.body).not.toHaveTextContent('Mobility Database')
  })

  it('does not misattribute an unknown source', () => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: { ...datedMetroFare, source: 'unknown' } }])
    expect(screen.getByText(/8 EGP/)).toBeInTheDocument()
    fireEvent.click(optionCards()[0])
    expect(document.body).not.toHaveTextContent('Fare: Cairo Metro')
  })

  it('renders Arabic undated attribution without raw keys or an invented date', () => {
    localStorage.setItem('wasel.lang', 'ar')
    renderResults([{ ...mockJourneyPlan.options[0], fare: { ...datedMetroFare, as_of: null } }])
    const generic = 'الأجرة: مترو القاهرة (نقل للقاهرة عبر قاعدة بيانات التنقل)'
    expect(screen.getByText(generic)).toBeInTheDocument()
    fireEvent.click(optionCards()[0])
    expect(within(screen.getByRole('dialog')).getAllByText(generic)).toHaveLength(2)
    expect(document.body).not.toHaveTextContent('journey.fare_attribution')
    expect(document.body).not.toHaveTextContent('{date}')
    expect(document.body).not.toHaveTextContent('أكتوبر')
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
