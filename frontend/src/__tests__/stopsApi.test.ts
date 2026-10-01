import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchStops } from '../api/stops'

describe('fetchStops', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('passes coordinates and radius to the real nearby-stops endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { total: 0 } }), { status: 200 }),
    )

    await fetchStops({ limit: 10, lat: 30.0444, lng: 31.2357, radius: 1200 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/stops?per_page=10&lat=30.0444&lng=31.2357&radius=1200',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})