import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { JourneySearchPage } from '../legacy-pages/JourneySearch'
import * as journeyApi from '../api/journeys'
import * as placesApi from '../api/places'
import { renderWithProviders, mockStops } from '../test/test-utils'

/**
 * Journey Search form: validation, server-side stop autocomplete,
 * coordinate input, swap, clear, constraints.
 */
describe('Journey Search — validation & pickers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(placesApi, 'searchPlaces').mockImplementation(async (q) => ({
      stops: mockStops,
      places: [{ id: 'photon-1', name: 'Tahrir Square', detail: 'Cairo', lat: 30.0444, lng: 31.2357, source: 'photon' }],
    }))
    vi.spyOn(journeyApi, 'searchJourneys').mockResolvedValue({ options: [] })
  })

  const pickStop = async (input, name, kind) => {
    fireEvent.change(input, { target: { value: name } })
    // Scope to this picker's suggestion listbox — option names also appear
    // in the other picker's "Selected:" status line.
    const listbox = await screen.findByRole(
      'listbox',
      { name: new RegExp(`${kind} suggestions`, 'i') },
      { timeout: 2500 }
    )
    // Match the option role — the in-flight empty-state message also
    // contains the query text and must not be clicked.
    const option = await within(listbox).findByRole(
      'option',
      { name: new RegExp(name, 'i') },
      { timeout: 2500 }
    )
    fireEvent.mouseDown(option)
  }

  it('renders the planner with pickers, departure, and search CTA', () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    expect(screen.getByText('Find your journey')).toBeInTheDocument()
    expect(screen.getByTestId('origin-picker')).toBeInTheDocument()
    expect(screen.getByTestId('destination-picker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find journeys/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/swap origin and destination/i)).toBeInTheDocument()
  })

  it('validates required origin and destination on empty submission', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(screen.getByText('Please choose an origin.')).toBeInTheDocument()
      expect(screen.getByText('Please choose a destination.')).toBeInTheDocument()
    })
    expect(journeyApi.searchJourneys).not.toHaveBeenCalled()
  })

  it('validates that origin and destination cannot be the same stop', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    const originInput = screen.getByTestId('origin-picker')
    await pickStop(originInput, 'Al-Shohadaa', 'Origin')
    const destInput = screen.getByTestId('destination-picker')
    await pickStop(destInput, 'Al-Shohadaa', 'Destination')

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(screen.getByText('Origin and destination cannot be the same stop.')).toBeInTheDocument()
    })
  })

  it('selects an origin from server-side stop autocomplete', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    const originInput = screen.getByTestId('origin-picker')
    await pickStop(originInput, 'Shohadaa', 'Origin')

    await waitFor(() => {
      expect(screen.getByText(/Selected: Al-Shohadaa/)).toBeInTheDocument()
    })
    // server-side search hit the places endpoint with the typed query
    // (3rd arg carries the AbortSignal for superseded-keystroke cancels)
    expect(placesApi.searchPlaces).toHaveBeenCalledWith('Shohadaa', expect.anything(), expect.anything())
  })

  it('selects a destination from server-side stop autocomplete', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    const destInput = screen.getByTestId('destination-picker')
    await pickStop(destInput, 'Sadat', 'Destination')

    await waitFor(() => {
      expect(screen.getByText(/Selected: Sadat/)).toBeInTheDocument()
    })
  })

  it('swaps origin and destination', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    await pickStop(screen.getByTestId('origin-picker'), 'Al-Shohadaa', 'Origin')
    await pickStop(screen.getByTestId('destination-picker'), 'Sadat', 'Destination')

    fireEvent.click(screen.getByLabelText(/swap origin and destination/i))

    expect(screen.getByTestId('origin-picker')).toHaveValue('Sadat')
    expect(screen.getByTestId('destination-picker')).toHaveValue('Al-Shohadaa')
  })

  it('parses manual coordinate input into a selected location', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    const originInput = screen.getByTestId('origin-picker')
    fireEvent.change(originInput, { target: { value: '30.0617, 31.2464' } })

    await waitFor(() => {
      expect(screen.getByText(/Selected: Location \(30\.0617, 31\.2464\)/)).toBeInTheDocument()
    })
  })

  it('clear button resets both selections', async () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    await pickStop(screen.getByTestId('origin-picker'), 'Al-Shohadaa', 'Origin')
    await pickStop(screen.getByTestId('destination-picker'), 'Sadat', 'Destination')

    fireEvent.click(screen.getByRole('button', { name: 'Clear', exact: true }))

    expect(screen.getByTestId('origin-picker')).toHaveValue('')
    expect(screen.getByTestId('destination-picker')).toHaveValue('')
  })

  it('searches with a geocoded place origin and a coordinate destination', async () => {
    const searchSpy = vi.spyOn(journeyApi, 'searchJourneys').mockResolvedValue({
      options: [{ total_duration_sec: 900, total_transfers: 0, walk_distance_meters: 100, score: 1, legs: [], transfers: [] }],
    })

    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    // geocoded place as origin (place has lat/lng, no stop id)
    fireEvent.change(screen.getByTestId('origin-picker'), { target: { value: 'Tahrir Square' } })
    const list = await screen.findByRole('listbox', { name: /origin suggestions/i }, { timeout: 2500 })
    fireEvent.mouseDown(await within(list).findByRole('option', { name: /Tahrir/i }, { timeout: 2500 }))

    // coordinate destination
    fireEvent.change(screen.getByTestId('destination-picker'), { target: { value: '29.9773, 31.1325' } })

    fireEvent.click(screen.getByRole('button', { name: /find journeys/i }))

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(expect.objectContaining({
        origin_lat: 30.0444,
        origin_lng: 31.2357,
        destination_lat: 29.9773,
        destination_lng: 31.1325,
      }))
    })
  })

  it('updates advanced constraints: avoided modes, transfers, walk, alternatives', () => {
    renderWithProviders(<JourneySearchPage />, { route: '/search' })

    fireEvent.click(screen.getByRole('button', { name: /preferences & constraints/i }))

    fireEvent.click(screen.getByRole('button', { name: /metro/i }))

    const transfers = screen.getByLabelText(/max transfers/i)
    fireEvent.change(transfers, { target: { value: '2' } })
    const walk = screen.getByLabelText(/max walk \/ leg/i)
    fireEvent.change(walk, { target: { value: '1500' } })
    const alts = screen.getByLabelText(/alternatives/i)
    fireEvent.change(alts, { target: { value: '5' } })

    expect(transfers).toHaveValue(2)
    expect(walk).toHaveValue(1500)
    expect(alts).toHaveValue(5)
  })
})
