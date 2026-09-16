import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchPlaces } from '../api/places'

/**
 * places/search request hygiene (autocomplete burst protection):
 * - an AbortSignal passed by the caller reaches fetch, so superseded
 *   keystrokes cancel instead of racing and tripping the server throttle.
 * - omission of signal keeps working (legacy callers unaffected).
 */

function mockFetchOnce(json, { ok = true, status = 200 } = {}) {
  const mock = vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(json)),
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('searchPlaces signal forwarding', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    mockFetchOnce({ success: true, data: { stops: [], places: [] } })
  })

  it('forwards an AbortSignal to fetch', async () => {
    const controller = new AbortController()
    await searchPlaces('october', { lat: 30.05, lng: 31.23 }, { signal: controller.signal })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, init] = global.fetch.mock.calls[0]
    expect(init.signal).toBe(controller.signal)
  })

  it('works without a signal (legacy callers unaffected)', async () => {
    const res = await searchPlaces('tahrir', { lat: 30.05, lng: 31.23 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, init] = global.fetch.mock.calls[0]
    expect(init.signal).toBeUndefined()
    expect(res).toEqual({ stops: [], places: [] })
  })

  it('surfaces an aborted request as an aborted ApiError', async () => {
    const controller = new AbortController()
    controller.abort()
    // Aborted fetch rejects with an AbortError DOMException.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    )
    await expect(
      searchPlaces('october', { lat: 30.05, lng: 31.23 }, { signal: controller.signal })
    ).rejects.toMatchObject({ aborted: true, status: 0 })
  })
})
