import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RouteDetail from '../legacy-pages/RouteDetail'
import { LanguageProvider } from '../i18n/LanguageContext'

// Route/line page (final-product completion) — renders ONLY real API data:
// identity (operator/mode/color), active variants with headsign, ordered
// stops, GTFS frequency windows, and the stored line shape. Missing
// frequency/geometry render honest empty states.

vi.mock('../api/client', () => ({
  apiRequest: vi.fn(),
  getData: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({
  endpoints: {
    public: {
      routeDetail: (id) => `/public-routes/${id}`,
      routeStops: (id) => `/routes/${id}/stops`,
      variantGeometry: (vid) => `/route-variants/${vid}/geometry`,
    },
  },
}))

// MapLibre is heavy and canvas-bound — the page renders it through the lazy
// panel; tests assert data flows, not pixels.
vi.mock('../components/map/LazyMapPanel', () => ({
  MapPanel: () => <div data-testid="map-panel" />,
}))

import { getData, apiRequest } from '../api/client'

function renderPage(id = '1012') {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[`/routes/${id}`]}>
        {/* useParams only resolves through a matching route declaration */}
        <Routes>
          <Route path="/routes/:id" element={<RouteDetail />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

const ROUTE = {
  id: 1012,
  short_name: 'Line 1',
  long_name: 'New Marg - Helwan Metro',
  color: 'c62828',
  transit_mode: { id: 1, name: 'metro' },
  transit_operator: { id: 1, name: 'Cairo Metro Authority' },
  variants: [
    {
      id: 1785,
      name: 'Main',
      headsign: 'New Marg',
      direction: 'loop',
      active: true,
      reliability_score: 0.95,
      has_geometry: true,
      frequency_windows: [
        { start_time: '05:30:00', end_time: '07:00:00', headway_secs: 420 },
        { start_time: '07:00:00', end_time: '23:00:00', headway_secs: 600 },
      ],
    },
  ],
}

const STOPS = [
  {
    variant_id: 1785,
    variant_name: 'Main',
    headsign: 'New Marg',
    direction: 'loop',
    stops: [
      { id: 1, stop_id: 11, stop_name: 'Helwan Metro', latitude: 29.2, longitude: 31.3, stop_sequence: 1 },
      { id: 2, stop_id: 12, stop_name: 'Ain Helwan', latitude: 29.2, longitude: 31.3, stop_sequence: 2 },
      { id: 3, stop_id: 13, stop_name: 'Maadi', latitude: 29.3, longitude: 31.3, stop_sequence: 3 },
    ],
  },
]

describe('RouteDetail (line information page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getData.mockReset()
    apiRequest.mockReset()
  })

  it('renders line identity, operator, frequency windows and ordered stops from real payloads', async () => {
    getData.mockImplementation((url) => {
      if (url.includes('public-routes/1012')) return Promise.resolve(ROUTE)
      if (url.includes('routes/1012/stops')) return Promise.resolve(STOPS)
      return Promise.resolve(null)
    })
    apiRequest.mockResolvedValue({ data: { geometry: [[29.2, 31.3], [29.3, 31.35]] } })

    renderPage()

    // identity
    expect(await screen.findByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText(/New Marg - Helwan Metro/)).toBeInTheDocument()
    expect(screen.getByText('Cairo Metro Authority')).toBeInTheDocument()
    // frequency windows from GTFS (420s = 7 min; 600s = 10 min)
    expect(await screen.findByText(/Every 7 min/)).toBeInTheDocument()
    expect(screen.getByText(/Every 10 min/)).toBeInTheDocument()
    // ordered stops
    expect(screen.getByText('Helwan Metro')).toBeInTheDocument()
    expect(screen.getByText('Maadi')).toBeInTheDocument()
    expect(screen.getByText(/3 stops/)).toBeInTheDocument()
    // map got the stored geometry
    await waitFor(() => expect(screen.getByTestId('map-panel')).toBeInTheDocument())
  })

  it('shows honest empty states when frequency and geometry are missing', async () => {
    getData.mockImplementation((url) => {
      if (url.includes('public-routes/9')) {
        return Promise.resolve({ ...ROUTE, id: 9, variants: [{ ...ROUTE.variants[0], id: 99, frequency_windows: null, has_geometry: false, reliability_score: null }] })
      }
      if (url.includes('routes/9/stops')) return Promise.resolve(STOPS)
      return Promise.resolve(null)
    })
    apiRequest.mockRejectedValue(new Error('no geometry'))

    renderPage('9')

    expect(await screen.findByText(/No frequency data published/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Line map unavailable/)).toBeInTheDocument())
    // stops still render without a shape
    expect(screen.getByText('Maadi')).toBeInTheDocument()
  })

  it('renders the not-found state when the API fails', async () => {
    getData.mockImplementation((url) => {
      if (url.includes('public-routes/')) return Promise.reject(new Error('404'))
      return Promise.resolve(STOPS)
    })

    renderPage('999')

    expect(await screen.findByText(/does not exist or is no longer active/i)).toBeInTheDocument()
  })
})
