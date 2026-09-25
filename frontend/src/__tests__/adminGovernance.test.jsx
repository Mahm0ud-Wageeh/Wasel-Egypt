import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import AdminData from '../legacy-pages/AdminData'
import AdminStopTimes from '../legacy-pages/AdminStopTimes'
import AdminGeometry from '../legacy-pages/AdminGeometry'
import * as client from '../api/client'
import { renderWithProviders } from '../test/test-utils'

// apiRequest is the single transport the new admin consoles use.
vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client')
  return { ...actual, apiRequest: vi.fn() }
})

import { apiRequest } from '../api/client'

describe('Admin data governance consoles', () => {
  const mockAdmin = {
    id: 1,
    name: 'Admin Master',
    email: 'admin@wasel.eg',
    roles: [{ id: 1, name: 'admin' }],
  }

  const mockQuality = {
    stops: { total: 3032, outside_egypt_bbox: 0, missing_name: 0, no_area_assigned: 0, duplicate_names_same_coords: 5 },
    routes: { total: 1016, active: 1016, without_variants: 0 },
    schedules: { total: 1794, active: 1700 },
    geometry: { variants_total: 1794, variants_without_geometry: 2, suspicious_length: 0, empty_or_single_point: 0 },
    fares: { total: 7, real: 4, demo_estimated: 3 },
    imports: { logged_imports: 8, failed_imports: 0, stale_datasets: 0, last_import_at: '2026-09-13T09:00:00Z' },
    summary: { critical_issues: 0, warnings: 7, note: 'informational' },
  }

  const mockImports = {
    data: [
      {
        id: 8,
        source: 'fayoum_pack:demo',
        dataset_version: '1.0-demo',
        license: null,
        status: 'completed',
        imported_at: '2026-09-12T12:00:00Z',
        counts: { stops_created: 7, routes_created: 2 },
        validation: { status: 'passed', issues: 0, message: 'ok' },
        rollbackable: true,
      },
      {
        id: 7,
        source: 'mobilitydb:mdb-3354-fares',
        status: 'completed',
        imported_at: '2026-09-11T08:00:00Z',
        counts: {},
        validation: { status: 'passed', issues: 0 },
        rollbackable: false,
      },
    ],
    meta: { total: 2, current_page: 1, last_page: 1 },
  }

  const mockAudit = {
    data: [
      {
        id: 1,
        user: { id: 1, name: 'Admin Master', email: 'admin@wasel.eg' },
        action: 'import.rollback',
        resource_type: 'data_import_log',
        resource_id: 8,
        changes: { deleted: { routes: 1 } },
        occurred_at: '2026-09-13T10:00:00Z',
      },
    ],
    meta: { total: 1, current_page: 1, last_page: 1 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockReset()
  })

  it('shows live quality indicators from the backend report (no fabrication)', async () => {
    apiRequest.mockImplementation((path) => {
      if (path.includes('/admin/data/quality')) return Promise.resolve({ data: mockQuality })
      if (path.includes('/admin/data/imports')) return Promise.resolve(mockImports)
      if (path.includes('/admin/data/audit')) return Promise.resolve(mockAudit)
      return Promise.resolve({})
    })

    renderWithProviders(<AdminData />, { route: '/admin/data', user: mockAdmin })

    await waitFor(() => {
      expect(screen.getByText('Data governance')).toBeInTheDocument()
      // Real backend numbers render, not placeholders.
      expect(screen.getAllByText('3032').length).toBeGreaterThan(0)
      expect(screen.getAllByText('1016').length).toBeGreaterThan(0)
      expect(screen.getAllByText('4').length).toBeGreaterThan(0)
    })
  })

  it('lists import history and previews rollback before confirming', async () => {
    apiRequest.mockImplementation((path) => {
      if (path.includes('rollback-preview')) {
        return Promise.resolve({
          data: {
            import: { id: 8, source: 'fayoum_pack:demo', status: 'completed' },
            affected: { transit_stops: 7, routes: 2 },
            warnings: ['Deletion is permanent.'],
            reversible: false,
          },
        })
      }
      if (path.includes('/admin/data/quality')) return Promise.resolve({ data: mockQuality })
      if (path.includes('/admin/data/imports')) return Promise.resolve(mockImports)
      if (path.includes('/admin/data/audit')) return Promise.resolve(mockAudit)
      return Promise.resolve({})
    })

    renderWithProviders(<AdminData />, { route: '/admin/data', user: mockAdmin })

    fireEvent.click(screen.getByRole('tab', { name: /imports/i }))

    await waitFor(() => {
      expect(screen.getByText('fayoum_pack:demo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /preview rollback/i }))

    await waitFor(() => {
      expect(document.querySelector('.modal-card').textContent).toContain('fayoum_pack:demo')
      expect(screen.getByText(/Deletion is permanent/i)).toBeInTheDocument()
      expect(screen.getByText('Rollback permanently')).toBeInTheDocument()
    })
  })

  it('audit tab shows actor, action and before/after changes', async () => {
    apiRequest.mockImplementation((path) => {
      if (path.includes('/admin/data/quality')) return Promise.resolve({ data: mockQuality })
      if (path.includes('/admin/data/imports')) return Promise.resolve(mockImports)
      if (path.includes('/admin/data/audit')) return Promise.resolve(mockAudit)
      return Promise.resolve({})
    })

    renderWithProviders(<AdminData />, { route: '/admin/data', user: mockAdmin })

    fireEvent.click(screen.getByRole('tab', { name: /audit history/i }))

    await waitFor(() => {
      expect(screen.getByText('admin@wasel.eg')).toBeInTheDocument()
      expect(screen.getByText('import.rollback')).toBeInTheDocument()
      expect(screen.getByText('View changes')).toBeInTheDocument()
    })
  })

  it('stop times console lists rows and validates times before save', async () => {
    apiRequest.mockImplementation((path) => {
      if (path.startsWith('/stop-times')) {
        return Promise.resolve({
          data: [
            {
              id: 11,
              schedule: { id: 3, gtfs_trip_id: 'T1' },
              transit_stop: { id: 9, name: 'Fayoum Terminal' },
              sequence: 1,
              arrival_time: '08:00:00',
              departure_time: '08:00:00',
              timepoint: 1,
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1 },
        })
      }
      return Promise.resolve({})
    })

    renderWithProviders(<AdminStopTimes />, { route: '/admin/stop-times', user: mockAdmin })

    await waitFor(() => {
      expect(screen.getByText('Fayoum Terminal')).toBeInTheDocument()
      expect(screen.getByText('T1')).toBeInTheDocument()
    })

    // Open edit, type an invalid time, expect the client-side validator.
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const arrivalInput = screen.getByLabelText(/arrival/i)
    fireEvent.change(arrivalInput, { target: { value: '25:99:00' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText(/HH:MM:SS/)).toBeInTheDocument()
    })
  })

  it('geometry console lists polylines and refuses sub-2-point saves', async () => {
    apiRequest.mockImplementation((path) => {
      if (path.startsWith('/route-geometry')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              route_variant_id: 5,
              geometry: [[30.05, 31.23], [30.06, 31.24]],
              length_meters: 2600,
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1 },
        })
      }
      return Promise.resolve({})
    })

    renderWithProviders(<AdminGeometry />, { route: '/admin/geometry', user: mockAdmin })

    await waitFor(() => {
      expect(screen.getByText(/2 pts/)).toBeInTheDocument()
      expect(screen.getByText('2.6 km')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit'))

    // Remove points down to one → save must refuse with min-points message.
    const removeBtns = Array.from(document.querySelectorAll('button[aria-label^="Close"]'))
    removeBtns.slice(0, 2).forEach((b) => fireEvent.click(b))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText(/at least 2 points/i)).toBeInTheDocument()
    })
  })
})
