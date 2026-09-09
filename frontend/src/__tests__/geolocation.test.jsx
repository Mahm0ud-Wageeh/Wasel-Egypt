import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation, positionToSelection } from '../hooks/useGeolocation'

/**
 * useGeolocation: real browser geolocation behind explicit user
 * intent, with every terminal state (granted / denied / unavailable /
 * timeout / error) surfaced — never throws, never auto-prompts.
 */
describe('useGeolocation', () => {
  const realGeolocation = navigator.geolocation

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: realGeolocation,
      configurable: true,
    })
  })

  const mockGeolocation = (impl) => {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: impl },
      configurable: true,
    })
  }

  it('starts idle with no position', () => {
    const { result } = renderHook(() => useGeolocation())
    expect(result.current.status).toBe('idle')
    expect(result.current.position).toBeNull()
    expect(result.current.message).toBeNull()
  })

  it('resolves granted with coordinates on success', async () => {
    let resolvePosition
    mockGeolocation((success) => {
      resolvePosition = () => success({ coords: { latitude: 30.0444, longitude: 31.2357, accuracy: 25 } })
    })
    const { result } = renderHook(() => useGeolocation())

    act(() => { result.current.locate() })
    expect(result.current.status).toBe('locating')

    await act(async () => { resolvePosition() })
    expect(result.current.status).toBe('granted')
    expect(result.current.position).toEqual({ lat: 30.0444, lng: 31.2357, accuracy: 25 })
  })

  it.each([
    ['denied', 1, 'denied'],
    ['unavailable', 2, 'unavailable'],
    ['timeout', 3, 'timeout'],
  ])('maps error code %i to status %s', async (_label, code, status) => {
    mockGeolocation((_success, failure) => {
      failure({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 })
    })
    const { result } = renderHook(() => useGeolocation())

    act(() => { result.current.locate() })
    await act(async () => {})

    expect(result.current.status).toBe(status)
    expect(typeof result.current.message).toBe('string')
  })

  it('reports unavailable when the API is missing', () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
    const { result } = renderHook(() => useGeolocation())

    act(() => { result.current.locate() })

    expect(result.current.status).toBe('unavailable')
  })

  it('folds a position into a planner-ready selection', () => {
    const selection = positionToSelection({ lat: 30.0444, lng: 31.2357, accuracy: 25 })
    expect(selection).toMatchObject({
      latitude: 30.0444,
      longitude: 31.2357,
      isCurrent: true,
      accuracy: 25,
    })
    expect(positionToSelection(null)).toBeNull()
  })
})
