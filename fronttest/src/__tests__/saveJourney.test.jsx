import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { JourneyResultsPage } from '../pages/JourneyResults'
import * as journeyApi from '../api/journeys'
import { renderWithProviders, mockJourneyPlan } from '../test/test-utils'

/**
 * Save journey flow — the details drawer is the save surface.
 * (Dedup + wire format covered in apiIntegration.test.jsx.)
 */
describe('Save Journey Flow', () => {
  const defaultSearchParams = {
    origin_lat: 30.0617,
    origin_lng: 31.2464,
    destination_lat: 30.0444,
    destination_lng: 31.2357,
    requested_at: '2026-09-05T12:00:00Z',
    max_transfers: 1,
    max_walk_distance_per_leg: 1000,
    preferred_modes: [],
    avoided_modes: [],
    alternatives: 3,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const renderAndOpenDetails = async () => {
    renderWithProviders(<JourneyResultsPage />, {
      route: '/journeys/results',
      journeyState: {
        searchParams: defaultSearchParams,
        searchResults: mockJourneyPlan.options,
      },
    })

    // Single-best-route planner: details open from the hero's secondary action.
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    return screen.findByRole('dialog', { name: 'Journey details' }, { timeout: 2500 })
  }

  it('reveals the save surface inside journey details when an option is selected', async () => {
    vi.spyOn(journeyApi, 'saveJourney').mockResolvedValue({
      data: { id: 42, status: 'planned' },
    })

    const dialog = await renderAndOpenDetails()

    expect(within(dialog).getByRole('button', { name: /save journey/i })).toBeInTheDocument()
    // Start Journey is one confident action: it auto-saves when needed, so
    // it is enabled immediately (the auto-save wire contract is covered in
    // bestRouteCockpit.test.jsx).
    expect(within(dialog).getByRole('button', { name: /start journey/i })).toBeEnabled()
  })

  it('successfully saves the selected journey and shows the saved state', async () => {
    const saveSpy = vi.spyOn(journeyApi, 'saveJourney').mockResolvedValue({
      data: { id: 42, status: 'planned' },
    })

    const dialog = await renderAndOpenDetails()
    fireEvent.click(within(dialog).getByRole('button', { name: /save journey/i }))

    await waitFor(() => {
      expect(within(dialog).getByText(/Saved to your trips/i)).toBeInTheDocument()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)

    // after saving, start becomes available
    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: /start journey/i })).toBeEnabled()
    })
  })

  it('displays an error alert when saving fails', async () => {
    vi.spyOn(journeyApi, 'saveJourney').mockRejectedValue(new Error('Could not save your journey.'))

    const dialog = await renderAndOpenDetails()
    fireEvent.click(within(dialog).getByRole('button', { name: /save journey/i }))

    await waitFor(() => {
      expect(screen.getByText('Could not save')).toBeInTheDocument()
      expect(screen.getByText('Could not save your journey.')).toBeInTheDocument()
    })
    // the drawer stays open so the user can retry
    expect(screen.queryByRole('dialog', { name: 'Journey details' })).toBeInTheDocument()
  })
})
