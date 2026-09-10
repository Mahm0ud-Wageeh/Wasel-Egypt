import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StopPanel } from '../components/ui/StopPanel'
import { LanguageProvider } from '../i18n/LanguageContext'

// Stop info panel (design v3 §10) — real API contract only:
// serving routes from /stops/{id}?with_routes=1 and departures from
// /stops/{id}/departures. No invented times when data is missing.

vi.mock('../api/client', () => ({
  apiRequest: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({
  endpoints: {
    public: {
      stopWithRoutes: (id) => `/stops/${id}?with_routes=1`,
      stopDepartures: (id) => `/stops/${id}/departures`,
    },
  },
}))

import { apiRequest } from '../api/client'

function renderPanel(props = {}) {
  return render(
    <LanguageProvider>
      <StopPanel
        stop={{ id: 42, name: 'Attaba', lat: 30.05, lng: 31.24 }}
        onClose={() => {}}
        {...props}
      />
    </LanguageProvider>,
  )
}

describe('StopPanel (stop information, design v3 §10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders stop name, serving lines, and real departure times', async () => {
    apiRequest.mockImplementation((url) => {
      if (url.includes('with_routes')) {
        return Promise.resolve({
          data: {
            id: 42,
            name: 'Attaba',
            serving_routes: [
              { route_id: 1, short_name: 'M1', long_name: 'Line 1', color: '#c62828', modes: ['metro'], variants_count: 2 },
            ],
          },
        })
      }
      if (url.includes('departures')) {
        const soon = new Date(Date.now() + 5 * 60000).toISOString()
        const later = new Date(Date.now() + 12 * 60000).toISOString()
        return Promise.resolve({
          data: {
            departures: [
              {
                route_variant_id: 7,
                headsign: 'Helwan',
                mode: 'metro',
                route_id: 1,
                route_short_name: 'M1',
                route_long_name: 'Line 1',
                route_color: null,
                has_timetable: true,
                departures: [{ time: soon, source: 'frequency' }, { time: later, source: 'frequency' }],
              },
            ],
          },
        })
      }
      return Promise.resolve({})
    })

    renderPanel()

    expect(await screen.findByText('Attaba')).toBeInTheDocument()
    expect(await screen.findByText('Helwan')).toBeInTheDocument()
    // Serving line chip M1 (line chip + departure row both show it)
    expect(screen.getAllByText('M1').length).toBeGreaterThan(0)
    // Minutes-away formatting for the first departure ("5 min" — real times only)
    await waitFor(() => {
      expect(screen.getByText(/\b5\b/)).toBeInTheDocument()
    })
  })

  it('lists lines without timetable data honestly — no invented times', async () => {
    apiRequest.mockImplementation((url) => {
      if (url.includes('with_routes')) {
        return Promise.resolve({
          data: {
            id: 42,
            name: 'Microbus Stand',
            serving_routes: [
              { route_id: 9, short_name: 'Microbus', long_name: 'Ring Rd', color: null, modes: ['microbus'], variants_count: 1 },
            ],
          },
        })
      }
      if (url.includes('departures')) {
        return Promise.resolve({
          data: {
            departures: [
              {
                route_variant_id: 3,
                headsign: 'Nahda',
                mode: 'microbus',
                route_id: 9,
                route_short_name: 'Microbus',
                route_long_name: 'Ring Rd',
                route_color: null,
                has_timetable: false,
                departures: [],
              },
            ],
          },
        })
      }
      return Promise.resolve({})
    })

    renderPanel()

    expect(await screen.findByText(/No timetable data for this line/i)).toBeInTheDocument()
  })

  it('shows the honest empty state when no departures exist', async () => {
    apiRequest.mockImplementation((url) => {
      if (url.includes('with_routes')) {
        return Promise.resolve({ data: { id: 42, name: 'Quiet Stop', serving_routes: [] } })
      }
      if (url.includes('departures')) {
        return Promise.resolve({ data: { departures: [] } })
      }
      return Promise.resolve({})
    })

    renderPanel()

    expect(await screen.findByText(/No upcoming departures right now/i)).toBeInTheDocument()
  })

  it('renders nothing without a selected stop', () => {
    const { container } = render(
      <LanguageProvider>
        <StopPanel stop={null} onClose={() => {}} />
      </LanguageProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('survives a failing serving-routes fetch (departures still render)', async () => {
    apiRequest.mockImplementation((url) => {
      if (url.includes('with_routes')) return Promise.reject(new Error('down'))
      if (url.includes('departures')) {
        const soon = new Date(Date.now() + 3 * 60000).toISOString()
        return Promise.resolve({
          data: {
            departures: [
              {
                route_variant_id: 7,
                headsign: 'Helwan',
                mode: 'metro',
                route_id: 1,
                route_short_name: 'M1',
                route_long_name: 'Line 1',
                route_color: null,
                has_timetable: true,
                departures: [{ time: soon, source: 'frequency' }],
              },
            ],
          },
        })
      }
      return Promise.resolve({})
    })

    renderPanel()
    expect(await screen.findByText('Helwan')).toBeInTheDocument()
  })
})
