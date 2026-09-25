import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { JourneyResultsPage } from '../legacy-pages/JourneyResults'
import * as journeyApi from '../api/journeys'
import { renderWithProviders, mockJourneyPlan } from '../test/test-utils'

/**
 * Single-best-route planning: the planner exposes exactly ONE recommended
 * journey — metric surface, route strip, honesty labels, disruption status,
 * details timeline, score explanation, map sync — and never a comparison
 * carousel of alternatives.
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
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    return screen.findByRole('dialog', { name: 'Journey details' }, { timeout: 2500 })
  }

  const hero = () => document.querySelector('.bestroute')

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(journeyApi, 'searchPublicStops').mockResolvedValue([])
  })

  it('renders ONE best route with duration, departure-arrival, walking, and fare', () => {
    renderResults()

    // Best option: 1200 sec = 20 min, direct, 250m walking, 8 EGP.
    expect(screen.getByText('20 min')).toBeInTheDocument()
    expect(screen.getByText('Direct')).toBeInTheDocument()
    expect(screen.getByText(/250 m walking/)).toBeInTheDocument()
    expect(screen.getByText(/8 EGP/)).toBeInTheDocument()
    // departure → arrival line (jsdom formats in local TZ — assert the shape)
    expect(screen.getAllByText(/→\s*\d{1,2}:\d{2}/).length).toBeGreaterThan(0)
  })

  it('exposes only the recommended journey — no secondary route cards or option counts', () => {
    renderResults(mockJourneyPlan.options)

    // The second ranked option (30 min) must NOT be rendered anywhere.
    expect(screen.queryByText('30 min')).not.toBeInTheDocument()
    expect(screen.queryByText(/options available/i)).not.toBeInTheDocument()
    expect(document.querySelectorAll('.journey-option')).toHaveLength(0)
    // No language that implies other routes exist.
    expect(screen.queryByText(/route 2/i)).not.toBeInTheDocument()
    // The single hero carries the recommendation badges (page header + badge).
    expect(screen.getAllByText('Best route').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Recommended for you')).toBeInTheDocument()
    // One strong primary action.
    expect(screen.getByRole('button', { name: /start journey/i })).toBeInTheDocument()
  })

  it('is deterministic: the same input renders the same single hero', () => {
    const first = renderResults(mockJourneyPlan.options)
    const firstDuration = hero().textContent
    first.unmount()

    const second = renderResults(mockJourneyPlan.options)
    expect(hero().textContent).toBe(firstDuration)
    second.unmount()
  })

  const datedMetroFare = { amount: 8, currency: 'EGP', source: 'tfc_metro_fares_2024', as_of: '2024-10' }
  const attribution = 'Fare: Cairo Metro, recorded Oct 2024 (TfC via Mobility Database)'

  it('attributes every visible metro fare in the hero and details, including the score', async () => {
    renderResults([{ ...mockJourneyPlan.options[0], fare: datedMetroFare }])
    expect(within(hero()).getByText(/8 EGP/)).toBeInTheDocument()
    expect(within(hero()).getByText(attribution)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(document.body).not.toHaveTextContent('EGP')
    expect(document.body).not.toHaveTextContent('Fare: Cairo Metro')
  })

  it('localizes attribution and its payload date in Arabic without raw keys', () => {
    localStorage.setItem('wasel.lang', 'ar')
    renderResults([{ ...mockJourneyPlan.options[0], fare: datedMetroFare }])
    const arabic = 'الأجرة: مترو القاهرة، مسجلة في أكتوبر ٢٠٢٤ (نقل للقاهرة عبر قاعدة بيانات التنقل)'
    expect(within(hero()).getByText(arabic)).toBeInTheDocument()
    expect(within(hero()).getByText(/8 EGP/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /عرض التفاصيل/i }))
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
    expect(within(hero()).getByText(generic)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(document.body).not.toHaveTextContent('Fare: Cairo Metro')
  })

  it('renders Arabic undated attribution without raw keys or an invented date', () => {
    localStorage.setItem('wasel.lang', 'ar')
    renderResults([{ ...mockJourneyPlan.options[0], fare: { ...datedMetroFare, as_of: null } }])
    const generic = 'الأجرة: مترو القاهرة (نقل للقاهرة عبر قاعدة بيانات التنقل)'
    expect(screen.getByText(generic)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /عرض التفاصيل/i }))
    expect(within(screen.getByRole('dialog')).getAllByText(generic)).toHaveLength(2)
    expect(document.body).not.toHaveTextContent('journey.fare_attribution')
    expect(document.body).not.toHaveTextContent('{date}')
    expect(document.body).not.toHaveTextContent('أكتوبر')
  })

  it('renders the Best route recommendation header on the single hero', () => {
    renderResults()
    // The hero badge (page header shows the same title — both are intended).
    expect(within(hero()).getByText('Best route')).toBeInTheDocument()
    expect(within(hero()).getByText('Recommended for you')).toBeInTheDocument()
  })

  it('renders a semantic route strip (no emoji) on the recommended journey', () => {
    renderResults()

    const strips = screen.getAllByRole('img', { name: /Route: Origin →/ })
    expect(strips.length).toBe(1) // one journey, one strip
    expect(strips[0].getAttribute('aria-label')).toMatch(/→ Destination/)
    const bodyText = document.body.textContent
    expect(bodyText.match(/[\u{1F300}-\u{1FAFF}\u2300-\u27BF]/gu)).toBeNull()
  })

  it('shows the disruption banner for a disrupted recommended route', () => {
    const disrupted = { ...mockJourneyPlan.options[0], disrupted: true, alerts: [{ id: 3, header_text: 'Signal maintenance on Line 1' }] }
    renderResults([disrupted])

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

  it('syncs the map with the recommended journey (map mounts beside the hero)', () => {
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

  it('renders 2 transfers badge for 2-transfer journey options', () => {
    const twoTransferOption = {
      ...mockJourneyPlan.options[0],
      total_transfers: 2,
    }
    renderResults([twoTransferOption])

    expect(screen.getByText('2 transfers')).toBeInTheDocument()
  })

  it('renders turn-by-turn walking steps and straight-line fallback badge in timeline', async () => {
    const optionWithStepsAndFallback = {
      ...mockJourneyPlan.options[0],
      legs: [
        {
          ...mockJourneyPlan.options[0].legs[0],
          geometry_source: 'stop_to_stop',
          leg_steps: [
            { instruction: 'Head north on Al-Gomhoureya', distance: 50, bearing: 10 },
            { instruction: 'Turn right onto Ramses St', distance: 100, bearing: 95 },
          ],
        },
        mockJourneyPlan.options[0].legs[1],
        mockJourneyPlan.options[0].legs[2],
      ],
    }
    renderResults([optionWithStepsAndFallback])
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Journey details' }, { timeout: 2500 })

    expect(within(dialog).getByText('Straight-line estimate')).toBeInTheDocument()
    expect(within(dialog).getByText(/Walking directions/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Head north on Al-Gomhoureya/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Turn right onto Ramses St/)).toBeInTheDocument()
  })
})
