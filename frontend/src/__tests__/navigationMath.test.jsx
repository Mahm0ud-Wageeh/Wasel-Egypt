import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  calculateBearing,
  shortestAngleDiff,
  interpolateAngle,
  pointToSegmentProjection,
  snapToPolyline,
  polylineLength,
  distanceAlongPolyline,
  forwardOffsetLocation,
} from '../utils/geo/navigationMath'

describe('navigationMath', () => {
  // --- haversineDistance ---
  describe('haversineDistance', () => {
    it('returns 0 for identical points', () => {
      expect(haversineDistance([30.0, 31.0], [30.0, 31.0])).toBe(0)
    })

    it('computes a known Cairo distance (~580 m between Tahrir and Ramses)', () => {
      // Tahrir Square → Ramses Station ≈ 2.4 km
      const d = haversineDistance([30.0444, 31.2357], [30.0623, 31.2467])
      expect(d).toBeGreaterThan(2100)
      expect(d).toBeLessThan(2700)
    })

    it('is symmetric', () => {
      const a = [30.05, 31.24]
      const b = [30.06, 31.25]
      expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 3)
    })
  })

  // --- calculateBearing ---
  describe('calculateBearing', () => {
    it('north direction is ~0°', () => {
      const b = calculateBearing([30.0, 31.0], [30.1, 31.0])
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(5)
    })

    it('east direction is ~90°', () => {
      const b = calculateBearing([30.0, 31.0], [30.0, 31.1])
      expect(b).toBeGreaterThan(85)
      expect(b).toBeLessThan(95)
    })

    it('south direction is ~180°', () => {
      const b = calculateBearing([30.1, 31.0], [30.0, 31.0])
      expect(b).toBeGreaterThan(175)
      expect(b).toBeLessThan(185)
    })

    it('west direction is ~270°', () => {
      const b = calculateBearing([30.0, 31.1], [30.0, 31.0])
      expect(b).toBeGreaterThan(265)
      expect(b).toBeLessThan(275)
    })
  })

  // --- shortestAngleDiff ---
  describe('shortestAngleDiff', () => {
    it('returns 0 for same angle', () => {
      expect(shortestAngleDiff(90, 90)).toBe(0)
    })

    it('wraps across 360° boundary', () => {
      expect(shortestAngleDiff(350, 10)).toBeCloseTo(20, 5)
    })

    it('handles reverse wrap', () => {
      expect(shortestAngleDiff(10, 350)).toBeCloseTo(-20, 5)
    })
  })

  // --- interpolateAngle ---
  describe('interpolateAngle', () => {
    it('t=0 returns from angle', () => {
      expect(interpolateAngle(45, 135, 0)).toBeCloseTo(45, 5)
    })

    it('t=1 returns to angle', () => {
      expect(interpolateAngle(45, 135, 1)).toBeCloseTo(135, 5)
    })

    it('interpolates across 360° boundary', () => {
      const mid = interpolateAngle(350, 10, 0.5)
      expect(mid).toBeCloseTo(0, 1) // Midpoint of 350→10 is 0°
    })
  })

  // --- pointToSegmentProjection ---
  describe('pointToSegmentProjection', () => {
    it('projects onto mid-segment correctly', () => {
      const result = pointToSegmentProjection([30.0, 31.0], [30.0, 31.0], [30.0, 31.1])
      expect(result.t).toBeCloseTo(0, 1)
      expect(result.distanceMeters).toBeLessThan(5) // Point is on the segment start
    })

    it('clamps t to 0 when point is behind segment', () => {
      const result = pointToSegmentProjection([30.0, 30.9], [30.0, 31.0], [30.0, 31.1])
      expect(result.t).toBe(0)
    })

    it('clamps t to 1 when point is ahead of segment', () => {
      const result = pointToSegmentProjection([30.0, 31.2], [30.0, 31.0], [30.0, 31.1])
      expect(result.t).toBe(1)
    })
  })

  // --- snapToPolyline ---
  describe('snapToPolyline', () => {
    const polyline = [
      [30.0, 31.0],
      [30.0, 31.05],
      [30.0, 31.1],
    ]

    it('snaps to the nearest segment', () => {
      const result = snapToPolyline({ lat: 30.001, lng: 31.025 }, polyline)
      expect(result.segmentIndex).toBe(0)
      expect(result.distanceMeters).toBeLessThan(200) // Near first segment
    })

    it('returns a valid snapped point', () => {
      const result = snapToPolyline({ lat: 30.001, lng: 31.075 }, polyline)
      expect(result.snappedPoint).toBeDefined()
      expect(result.snappedPoint.length).toBe(2)
      expect(Number.isFinite(result.snappedPoint[0])).toBe(true)
    })

    it('returns segment bearing', () => {
      const result = snapToPolyline({ lat: 30.0, lng: 31.025 }, polyline)
      expect(Number.isFinite(result.segmentBearing)).toBe(true)
    })
  })

  // --- polylineLength ---
  describe('polylineLength', () => {
    it('returns 0 for single-point polyline', () => {
      expect(polylineLength([[30.0, 31.0]])).toBe(0)
    })

    it('computes a positive length for multi-point polyline', () => {
      const len = polylineLength([
        [30.0, 31.0],
        [30.0, 31.05],
        [30.0, 31.1],
      ])
      expect(len).toBeGreaterThan(9000) // ~9.6 km
    })
  })

  // --- distanceAlongPolyline ---
  describe('distanceAlongPolyline', () => {
    const polyline = [
      [30.0, 31.0],
      [30.0, 31.05],
      [30.0, 31.1],
    ]

    it('returns 0 at the start', () => {
      expect(distanceAlongPolyline(polyline, 0, 0)).toBe(0)
    })

    it('returns full length at the end', () => {
      const total = polylineLength(polyline)
      const atEnd = distanceAlongPolyline(polyline, 1, 1)
      expect(atEnd).toBeCloseTo(total, -1) // within ~10m
    })

    it('returns partial distance mid-segment', () => {
      const d = distanceAlongPolyline(polyline, 0, 0.5)
      const total = polylineLength(polyline)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(total)
    })
  })

  // --- forwardOffsetLocation (returns [lat, lng] array) ---
  describe('forwardOffsetLocation', () => {
    it('returns the same point with 0 offset', () => {
      const result = forwardOffsetLocation(30.0, 31.0, 0, 0)
      expect(result[0]).toBeCloseTo(30.0, 4)
      expect(result[1]).toBeCloseTo(31.0, 4)
    })

    it('shifts north when heading is 0', () => {
      const result = forwardOffsetLocation(30.0, 31.0, 0, 500)
      expect(result[0]).toBeGreaterThan(30.0)
      expect(result[1]).toBeCloseTo(31.0, 3)
    })

    it('shifts east when heading is 90', () => {
      const result = forwardOffsetLocation(30.0, 31.0, 90, 500)
      expect(result[0]).toBeCloseTo(30.0, 3)
      expect(result[1]).toBeGreaterThan(31.0)
    })
  })
})
