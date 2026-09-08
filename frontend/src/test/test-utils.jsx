import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { JourneyProvider } from '../contexts/JourneyContext'
import { LanguageProvider } from '../i18n/LanguageContext'

export const mockUser = {
  id: 1,
  name: 'Amr Hassan',
  email: 'amr@example.com',
  roles: [{ name: 'user' }],
}

export const mockStops = [
  {
    id: 1,
    name: 'Al-Shohadaa',
    latitude: 30.0617,
    longitude: 31.2464,
    lat: 30.0617,
    lng: 31.2464,
    area: { name: 'Ramses', governorate: { name: 'Cairo' } },
  },
  {
    id: 2,
    name: 'Sadat',
    latitude: 30.0444,
    longitude: 31.2357,
    lat: 30.0444,
    lng: 31.2357,
    area: { name: 'Tahrir', governorate: { name: 'Cairo' } },
  },
  {
    id: 3,
    name: 'Cairo University',
    latitude: 30.0261,
    longitude: 31.2114,
    lat: 30.0261,
    lng: 31.2114,
    area: { name: 'Dokki', governorate: { name: 'Giza' } },
  },
]

export const mockJourneyPlan = {
  origin: { lat: 30.0617, lng: 31.2464 },
  destination: { lat: 30.0444, lng: 31.2357 },
  requested_at: '2026-09-05T12:00:00Z',
  options: [
    {
      total_duration_sec: 1200,
      total_transfers: 0,
      walk_distance_meters: 250,
      score: 1.05,
      fare: { amount: 8, currency: 'EGP' },
      legs: [
        {
          type: 'walking',
          mode: 'walking',
          duration_sec: 180,
          distance_meters: 150,
          departure_time: '2026-09-05T12:00:00Z',
          arrival_time: '2026-09-05T12:03:00Z',
          from_stop: null,
          to_stop: { id: 1, name: 'Al-Shohadaa', lat: 30.0617, lng: 31.2464 },
        },
        {
          type: 'transit',
          mode: 'metro',
          route_variant_id: 12,
          route: { id: 10, short_name: 'Line 1', long_name: 'Helwan - El Marg', type: 1 },
          duration_sec: 840,
          distance_meters: 3500,
          departure_time: '2026-09-05T12:04:00Z',
          arrival_time: '2026-09-05T12:18:00Z',
          from_stop: { id: 1, name: 'Al-Shohadaa', lat: 30.0617, lng: 31.2464 },
          to_stop: { id: 2, name: 'Sadat', lat: 30.0444, lng: 31.2357 },
        },
        {
          type: 'walking',
          mode: 'walking',
          duration_sec: 180,
          distance_meters: 100,
          departure_time: '2026-09-05T12:18:00Z',
          arrival_time: '2026-09-05T12:21:00Z',
          from_stop: { id: 2, name: 'Sadat', lat: 30.0444, lng: 31.2357 },
          to_stop: null,
        },
      ],
      transfers: [],
    },
    {
      total_duration_sec: 1800,
      total_transfers: 1,
      walk_distance_meters: 500,
      score: 1.85,
      fare: { amount: 12, currency: 'EGP' },
      legs: [
        {
          type: 'transit',
          mode: 'bus',
          route_variant_id: 45,
          route: { id: 11, short_name: 'Bus 104', long_name: 'Ramses - Tahrir', type: 3 },
          duration_sec: 900,
          distance_meters: 3200,
          departure_time: '2026-09-05T12:05:00Z',
          arrival_time: '2026-09-05T12:20:00Z',
          from_stop: { id: 1, name: 'Al-Shohadaa', lat: 30.0617, lng: 31.2464 },
          to_stop: { id: 4, name: 'Attaba', lat: 30.0525, lng: 31.2472 },
        },
        {
          type: 'transit',
          mode: 'metro',
          route_variant_id: 18,
          route: { id: 12, short_name: 'Line 3', long_name: 'Attaba - Kit Kat', type: 1 },
          duration_sec: 600,
          distance_meters: 1500,
          departure_time: '2026-09-05T12:25:00Z',
          arrival_time: '2026-09-05T12:35:00Z',
          from_stop: { id: 4, name: 'Attaba', lat: 30.0525, lng: 31.2472 },
          to_stop: { id: 2, name: 'Sadat', lat: 30.0444, lng: 31.2357 },
        },
      ],
      transfers: [
        {
          from_leg_index: 0,
          to_leg_index: 1,
          transfer_type: 'walk',
          transfer_duration_sec: 300,
          from_lat: 30.0525,
          from_longitude: 31.2472,
          to_lat: 30.0525,
          to_longitude: 31.2472,
        },
      ],
    },
  ],
}

export function renderWithProviders(
  ui,
  {
    user = mockUser,
    route = '/',
    journeyState = null,
    ...renderOptions
  } = {}
) {
  const authValue = {
    user,
    status: 'authenticated',
    isAuthenticated: Boolean(user),
    roles: user?.roles?.map((r) => r.name) ?? ['user'],
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    hasRole: (r) => user?.roles?.some((role) => role.name === r) ?? false,
  }

  if (journeyState?.searchParams) {
    sessionStorage.setItem('wasel.journey.search', JSON.stringify(journeyState.searchParams))
  }
  if (journeyState?.searchResults) {
    sessionStorage.setItem('wasel.journey.results', JSON.stringify(journeyState.searchResults))
  }
  if (journeyState?.lastSavedJourney) {
    sessionStorage.setItem('wasel.journey.lastSaved', JSON.stringify(journeyState.lastSavedJourney))
  }

  function Wrapper({ children }) {
    return (
      <LanguageProvider>
        <AuthContext.Provider value={authValue}>
          <JourneyProvider>
            <MemoryRouter initialEntries={[route]}>
              <Routes>
                {/* Register the component on its real path pattern so
                    useParams() resolves like production routing. */}
                <Route path="/active-journeys/:id/deviation" element={children} />
                <Route path="/active-journeys/:id" element={children} />
                <Route path="*" element={children} />
              </Routes>
            </MemoryRouter>
          </JourneyProvider>
        </AuthContext.Provider>
      </LanguageProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
