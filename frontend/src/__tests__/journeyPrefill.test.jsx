import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { cairoWallTime } from '../api/journeys'
import { JourneySearchPage } from '../legacy-pages/JourneySearch'
import { renderWithProviders } from '../test/test-utils'

/**
 * Planner prefill contract (route page / stop panel hand-off) + Cairo
 * wall-clock defaults (GTFS time frame).
 */
describe('Planner prefill + Cairo wall time', () => {
  it('formats the current time as Cairo wall-clock datetime-local', () => {
    const value = cairoWallTime(new Date('2026-09-10T02:34:00.000Z'))
    // 02:34 UTC == 05:34 Cairo wall (UTC+3, September DST)
    expect(value).toBe('2026-09-10T05:34')
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('fills the destination (not origin) for a destination-targeted prefill', () => {
    const stop = { id: 7, name: 'Sadat', latitude: 30.0444, longitude: 31.2357 }
    renderWithProviders(
      <Routes>
        <Route
          path="/search"
          element={<JourneySearchPage />}
        />
      </Routes>,
      {
        route: { pathname: '/search', state: { prefillStop: stop, prefillTarget: 'destination' } },
      },
    )

    expect(screen.getByTestId('origin-picker')).toHaveValue('')
    expect(screen.getByTestId('destination-picker')).toHaveValue('Sadat')
  })

  it('fills the origin for an origin-targeted prefill', () => {
    const stop = { id: 7, name: 'Sadat', latitude: 30.0444, longitude: 31.2357 }
    renderWithProviders(
      <Routes>
        <Route path="/search" element={<JourneySearchPage />} />
      </Routes>,
      {
        route: { pathname: '/search', state: { prefillStop: stop, prefillTarget: 'origin' } },
      },
    )

    expect(screen.getByTestId('origin-picker')).toHaveValue('Sadat')
    expect(screen.getByTestId('destination-picker')).toHaveValue('')
  })

  it('keeps stored params when no prefill is present', () => {
    renderWithProviders(
      <Routes>
        <Route path="/search" element={<JourneySearchPage />} />
      </Routes>,
      {
        route: '/search',
        journeyState: {
          searchParams: {
            originStop: { id: 1, name: 'Al-Shohadaa', latitude: 30.0617, longitude: 31.2464 },
            destinationStop: null,
          },
        },
      },
    )

    expect(screen.getByTestId('origin-picker')).toHaveValue('Al-Shohadaa')
  })

  it('clears both endpoints with the Clear action', () => {
    const stop = { id: 7, name: 'Sadat', latitude: 30.0444, longitude: 31.2357 }
    renderWithProviders(
      <Routes>
        <Route path="/search" element={<JourneySearchPage />} />
      </Routes>,
      {
        route: { pathname: '/search', state: { prefillStop: stop, prefillTarget: 'origin' } },
      },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear', exact: true }))
    expect(screen.getByTestId('origin-picker')).toHaveValue('')
  })
})
