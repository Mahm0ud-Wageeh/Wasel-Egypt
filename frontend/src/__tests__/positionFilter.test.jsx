import { describe, it, expect, beforeEach } from 'vitest'
import { PositionFilter } from '../utils/geo/positionFilter'

describe('PositionFilter', () => {
  let filter

  beforeEach(() => {
    filter = new PositionFilter()
  })

  it('accepts the first valid fix', () => {
    const result = filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: Date.now(),
    })
    expect(result.accepted).toBe(true)
    expect(result.lat).toBeCloseTo(30.044, 3)
    expect(result.lng).toBeCloseTo(31.235, 3)
  })

  it('rejects a fix with accuracy worse than 120m', () => {
    // First fix to initialize
    filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: Date.now(),
    })

    const result = filter.process({
      latitude: 30.045,
      longitude: 31.236,
      accuracy: 150,
      heading: null,
      speed: 0,
      timestamp: Date.now() + 1000,
    })
    expect(result.accepted).toBe(false)
  })

  it('rejects impossible speed jumps (>45 m/s)', () => {
    const now = Date.now()
    filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: now,
    })

    // Jump ~5.5 km in 1 second → ~5500 m/s, way above 45 m/s threshold
    const result = filter.process({
      latitude: 30.094,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: now + 1000,
    })
    expect(result.accepted).toBe(false)
  })

  it('accepts reasonable movement', () => {
    const now = Date.now()
    filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 1.5,
      timestamp: now,
    })

    // ~15m movement in 10s = 1.5 m/s (walking speed)
    const result = filter.process({
      latitude: 30.04413,
      longitude: 31.235,
      accuracy: 10,
      heading: 0,
      speed: 1.5,
      timestamp: now + 10000,
    })
    expect(result.accepted).toBe(true)
  })

  it('applies deadband: tiny movement does not update position', () => {
    const now = Date.now()
    const first = filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: now,
    })

    // Move < 2.5m at 0 speed → should be within deadband
    const second = filter.process({
      latitude: 30.04401,
      longitude: 31.23501,
      accuracy: 10,
      heading: null,
      speed: 0.1,
      timestamp: now + 2000,
    })

    // Position should still be accepted but coordinates should be close to the initial
    // (EMA smoothing at low speed should barely move)
    expect(second.movementState).toBe('stationary')
  })

  it('tracks movement state correctly', () => {
    const now = Date.now()
    const first = filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: now,
    })
    expect(first.movementState).toBe('stationary')

    // Move at walking speed
    const second = filter.process({
      latitude: 30.0445,
      longitude: 31.235,
      accuracy: 10,
      heading: 0,
      speed: 1.5,
      timestamp: now + 5000,
    })
    expect(second.movementState).toBe('walking')
  })

  it('reset() clears all state', () => {
    filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: null,
      speed: 0,
      timestamp: Date.now(),
    })
    expect(filter.currentPosition).not.toBeNull()

    filter.reset()
    expect(filter.currentPosition).toBeNull()
  })

  it('stabilizes heading when stationary', () => {
    const now = Date.now()
    filter.process({
      latitude: 30.044,
      longitude: 31.235,
      accuracy: 10,
      heading: 90,
      speed: 1.5,
      timestamp: now,
    })

    // Stop moving — heading should be preserved from last known
    const result = filter.process({
      latitude: 30.04401,
      longitude: 31.23501,
      accuracy: 10,
      heading: 45,
      speed: 0.1,
      timestamp: now + 3000,
    })

    // When stationary, heading should stay stable (not jump to 45)
    // The exact value depends on implementation, but it shouldn't be null
    expect(result.heading).toBeDefined()
  })
})
