import { describe, it, expect, beforeEach } from 'vitest'
import { RouteMatcher } from '../utils/geo/routeMatcher'

const makeLeg = (coords, mode = 'metro') => ({
  type: mode === 'walking' ? 'walking' : 'transit',
  mode,
  from_lat: coords[0][0],
  from_lng: coords[0][1],
  to_lat: coords[coords.length - 1][0],
  to_lng: coords[coords.length - 1][1],
  geometry: coords,
  from_stop: { name: 'Start', latitude: coords[0][0], longitude: coords[0][1] },
  to_stop: { name: 'End', latitude: coords[coords.length - 1][0], longitude: coords[coords.length - 1][1] },
})

const sampleItinerary = {
  legs: [
    makeLeg([
      [30.044, 31.235],
      [30.046, 31.237],
      [30.048, 31.239],
    ], 'walking'),
    makeLeg([
      [30.048, 31.239],
      [30.055, 31.245],
      [30.062, 31.247],
    ], 'metro'),
  ],
}

describe('RouteMatcher', () => {
  let matcher

  beforeEach(() => {
    matcher = new RouteMatcher()
  })

  it('snaps a nearby point to the walking leg polyline', () => {
    const result = matcher.match(
      { lat: 30.045, lng: 31.236, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    expect(result.isSnapped).toBe(true)
    expect(result.snappedPosition).toBeDefined()
    expect(result.distanceToRouteMeters).toBeLessThan(50) // within walking tolerance
  })

  it('marks off-route when far from the polyline', () => {
    const now = Date.now()
    // Need consecutive off-route fixes (>= 3 fixes, >= 6s)
    for (let i = 0; i < 4; i++) {
      matcher.match(
        { lat: 30.1, lng: 31.3, heading: null, timestamp: now + i * 3000 },
        sampleItinerary,
        0
      )
    }
    const result = matcher.match(
      { lat: 30.1, lng: 31.3, heading: null, timestamp: now + 12000 },
      sampleItinerary,
      0
    )
    expect(result.isOffRoute).toBe(true)
    expect(result.distanceToRouteMeters).toBeGreaterThan(100)
  })

  it('does not trigger off-route for a single outlier fix', () => {
    const now = Date.now()
    // First, put user on route
    matcher.match(
      { lat: 30.045, lng: 31.236, heading: null, timestamp: now },
      sampleItinerary,
      0
    )
    // One off-route fix should NOT trigger off-route
    const result = matcher.match(
      { lat: 30.1, lng: 31.3, heading: null, timestamp: now + 2000 },
      sampleItinerary,
      0
    )
    expect(result.isOffRoute).toBe(false)
  })

  it('computes leg progress as a percentage', () => {
    const result = matcher.match(
      { lat: 30.047, lng: 31.238, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    expect(result.legProgressPercent).toBeGreaterThan(0)
    expect(result.legProgressPercent).toBeLessThanOrEqual(100)
  })

  it('detects leg completion near the to_stop', () => {
    const result = matcher.match(
      { lat: 30.048, lng: 31.239, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    expect(result.isLegComplete).toBe(true)
  })

  it('detects approaching stop within 300m', () => {
    // Place user ~200m from leg end
    const result = matcher.match(
      { lat: 30.0465, lng: 31.2378, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    expect(result.approachingStop).not.toBeNull()
    expect(result.approachingStop.status).toMatch(/approaching|at_stop/)
  })

  it('generates next maneuver with distance and instruction', () => {
    const result = matcher.match(
      { lat: 30.045, lng: 31.236, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    expect(result.nextManeuver).not.toBeNull()
    expect(result.nextManeuver.distanceMeters).toBeGreaterThan(0)
    expect(result.nextManeuver.instruction).toBeTruthy()
    expect(result.nextManeuver.type).toBe('walking')
  })

  it('computes overall progress across multiple legs', () => {
    const result = matcher.match(
      { lat: 30.055, lng: 31.245, heading: null, timestamp: Date.now() },
      sampleItinerary,
      1 // second leg
    )
    expect(result.overallProgressPercent).toBeGreaterThan(0)
    expect(result.overallDistanceTraveledMeters).toBeGreaterThan(0)
  })

  it('returns snapped bearing on a snapped result', () => {
    const result = matcher.match(
      { lat: 30.045, lng: 31.236, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0
    )
    if (result.isSnapped) {
      expect(Number.isFinite(result.snappedBearing)).toBe(true)
    }
  })

  it('reset() clears off-route state', () => {
    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      matcher.match(
        { lat: 30.1, lng: 31.3, heading: null, timestamp: now + i * 3000 },
        sampleItinerary,
        0
      )
    }
    matcher.reset()
    const result = matcher.match(
      { lat: 30.1, lng: 31.3, heading: null, timestamp: now + 20000 },
      sampleItinerary,
      0
    )
    // After reset, a single fix should not be off-route
    expect(result.isOffRoute).toBe(false)
  })

  it('returns graceful defaults when no leg is available', () => {
    const result = matcher.match(
      { lat: 30.0, lng: 31.0, heading: null, timestamp: Date.now() },
      { legs: [] },
      0
    )
    expect(result.isSnapped).toBe(false)
    expect(result.isOffRoute).toBe(false)
    expect(result.legProgressPercent).toBe(0)
  })

  it('respects per-mode tolerances: walk 50m vs transit 100m', () => {
    // 0.001 degrees lat offset from a diagonal line is ~78m perpendicular distance
    // Walking leg: 78m offset should NOT snap (tolerance 50m)
    const walkResult = matcher.match(
      { lat: 30.046 + 0.001, lng: 31.237, heading: null, timestamp: Date.now() },
      sampleItinerary,
      0 // walking leg
    )
    expect(walkResult.isSnapped).toBe(false)
    expect(walkResult.distanceToRouteMeters).toBeGreaterThan(50)

    // Reset matcher for fresh comparison
    matcher.reset()

    // Transit leg: 78m offset SHOULD snap (tolerance 100m)
    const transitResult = matcher.match(
      { lat: 30.055 + 0.001, lng: 31.245, heading: null, timestamp: Date.now() },
      sampleItinerary,
      1 // transit leg
    )
    expect(transitResult.isSnapped).toBe(true)
    expect(transitResult.distanceToRouteMeters).toBeLessThanOrEqual(100)
  })

  it('snaps accurately along a curved polyline corridor without false positives', () => {
    // S-curve polyline
    const curveItinerary = {
      legs: [
        makeLeg([
          [30.0400, 31.2300],
          [30.0420, 31.2320],
          [30.0430, 31.2350],
          [30.0420, 31.2380],
          [30.0440, 31.2400],
        ], 'walking')
      ]
    }

    // Point near the curve apex
    const result = matcher.match(
      { lat: 30.0431, lng: 31.2351, heading: null, timestamp: Date.now() },
      curveItinerary,
      0
    )
    expect(result.isSnapped).toBe(true)
    expect(result.isOffRoute).toBe(false)
    expect(result.distanceToRouteMeters).toBeLessThan(25)
  })
})
