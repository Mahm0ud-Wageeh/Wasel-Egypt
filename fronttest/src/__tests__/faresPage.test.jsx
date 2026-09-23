import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import Fares from '../pages/Fares'
import * as client from '../api/client'

vi.mock('../api/client', () => ({
  apiRequest: vi.fn(),
}))

// searchPublicStops is used by the pair-pricing autocomplete.
vi.mock('../api/journeys', () => ({
  searchPublicStops: vi.fn().mockResolvedValue([
    { id: 1, name: 'Tahrir Station', lat: 30.04, lng: 31.23 },
    { id: 2, name: 'Giza Station', lat: 30.01, lng: 31.20 },
  ]),
}))

const mockedRequest = vi.mocked(client.apiRequest)

const realFares = {
  data: [
    {
      id: 1,
      label: 'Cairo Metro — Tier 1',
      amount: '8.00',
      currency: 'EGP',
      data_status: 'real',
      effective_from: '2024-10-01',
      transit_mode: { name: 'metro' },
      transit_operator: { name: 'National Authority for Tunnels' },
    },
    {
      id: 2,
      label: 'CTA bus — base fare (estimated)',
      amount: '5.00',
      currency: 'EGP',
      data_status: 'demo_estimated',
      effective_from: null,
      transit_mode: { name: 'bus' },
      transit_operator: null,
    },
  ],
  meta: {},
}

function renderFares() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <Fares />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

/** Resolve /fares rows once, then any further call (pair estimate). */
function mockFares(pairResponse) {
  mockedRequest.mockImplementation(async (path) => {
    if (typeof path === 'string' && path.startsWith('/fares/estimate')) {
      return pairResponse ?? { data: { amount: 8 }, meta: { available: true } }
    }
    return realFares
  })
}

describe('Fares page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists published fares with honest real vs demo labels', async () => {
    mockFares()

    renderFares()

    await waitFor(() => {
      expect(screen.getByText('Cairo Metro — Tier 1')).toBeTruthy()
    })
    // "Official" appears in the legend AND on the real fare row.
    expect(screen.getAllByText('Official').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Demo / Estimated').length).toBeGreaterThanOrEqual(2)
  })

  it('filters fares by mode', async () => {
    mockFares()

    renderFares()
    await waitFor(() => expect(screen.getByText('Cairo Metro — Tier 1')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'bus' }))
    expect(screen.queryByText('Cairo Metro — Tier 1')).toBeNull()
    expect(screen.getByText('CTA bus — base fare (estimated)')).toBeTruthy()
  })

  it('shows an intentional empty state when the network returns no fares', async () => {
    mockedRequest.mockImplementation(async () => ({ data: [], meta: {} }))

    renderFares()

    await waitFor(() => {
      expect(screen.getByText('No published fares')).toBeTruthy()
    })
  })
})

describe('Fares page pair pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Type into a pair field, wait out the real debounce, pick the option. */
  async function pickStation(labelText, query, optionAriaLabel) {
    const input = screen.getByLabelText(labelText)
    fireEvent.change(input, { target: { value: query } })
    const option = await screen.findByRole('button', { name: optionAriaLabel }, { timeout: 4000 })
    fireEvent.click(option)
  }

  it('prices a station pair through the official matrix endpoint', async () => {
    mockFares({ data: { amount: 8, currency: 'EGP', data_status: 'real' }, meta: { available: true } })

    renderFares()
    await waitFor(() => expect(screen.getByText('Cairo Metro — Tier 1')).toBeTruthy())

    await pickStation(/From/i, 'Tahrir', /Pick Tahrir Station as origin/i)
    await pickStation(/^To$/i, 'Giza', /Pick Giza Station as destination/i)

    fireEvent.click(screen.getByRole('button', { name: /Price this trip/i }))

    await waitFor(() => {
      expect(mockedRequest).toHaveBeenCalledWith(
        '/fares/estimate?origin=1&destination=2',
        expect.anything(),
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/8 EGP/i)).toBeTruthy()
    })
  })

  it('shows the honest unavailable state when no verified pair fare exists', async () => {
    mockFares({ data: null, meta: { available: false } })

    renderFares()
    await waitFor(() => expect(screen.getByText('Cairo Metro — Tier 1')).toBeTruthy())

    await pickStation(/From/i, 'Tahrir', /Pick Tahrir Station as origin/i)
    await pickStation(/^To$/i, 'Giza', /Pick Giza Station as destination/i)

    fireEvent.click(screen.getByRole('button', { name: /Price this trip/i }))

    await waitFor(() => {
      expect(screen.getByText(/No verified fare exists for this pair/i)).toBeTruthy()
    })
  })
})
