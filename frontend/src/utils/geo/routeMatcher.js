/**
 * routeMatcher.js — Production map-matching, road snapping, and route progression engine.
 *
 * Snaps user GPS position onto the active route leg geometry, tracks cumulative
 * progress, determines stop proximity, and reliably detects off-route deviations
 * over multiple consecutive fixes.
 */

import {
  haversineDistance,
  snapToPolyline,
  polylineLength,
  distanceAlongPolyline,
} from './navigationMath'

export class RouteMatcher {
  constructor(options = {}) {
    this.walkingToleranceMeters = options.walkingToleranceMeters ?? 50
    this.transitToleranceMeters = options.transitToleranceMeters ?? 90
    this.offRouteConsecutiveFixesRequired = options.offRouteConsecutiveFixesRequired ?? 3
    this.offRouteMinDurationMs = options.offRouteMinDurationMs ?? 6000

    this.consecutiveOffRouteCount = 0
    this.firstOffRouteTimestamp = null
    this.lastMatchedSegmentIndex = 0
  }

  /** Reset matcher state. */
  reset() {
    this.consecutiveOffRouteCount = 0
    this.firstOffRouteTimestamp = null
    this.lastMatchedSegmentIndex = 0
  }

  /**
   * Extract polyline from an itinerary leg.
   * Uses leg.geometry ([[lat, lng], ...]) if available, falling back to [from, to].
   * @param {object} leg
   * @returns {Array<[number, number]>}
   */
  static getLegPolyline(leg) {
    if (!leg) return []
    if (Array.isArray(leg.geometry) && leg.geometry.length >= 2) {
      return leg.geometry.map((p) => [Number(p[0]), Number(p[1])])
    }
    const fromLat = Number(leg.from_lat ?? leg.from_stop?.latitude)
    const fromLng = Number(leg.from_lng ?? leg.from_stop?.longitude)
    const toLat = Number(leg.to_lat ?? leg.to_stop?.latitude)
    const toLng = Number(leg.to_lng ?? leg.to_stop?.longitude)

    if (Number.isFinite(fromLat) && Number.isFinite(toLat)) {
      return [
        [fromLat, fromLng],
        [toLat, toLng],
      ]
    }
    return []
  }

  /**
   * Match filtered position against the active itinerary and leg.
   *
   * @param {{ lat: number, lng: number, heading?: number, speed?: number, timestamp?: number }} userPosition
   * @param {object} itinerary { legs: [...] }
   * @param {number} currentLegIndex
   * @returns {{
   *   isSnapped: boolean,
   *   snappedPosition: { lat: number, lng: number },
   *   rawPosition: { lat: number, lng: number },
   *   snappedBearing: number|null,
   *   distanceToRouteMeters: number,
   *   distanceTraveledInLegMeters: number,
   *   distanceRemainingInLegMeters: number,
   *   totalLegDistanceMeters: number,
   *   legProgressPercent: number,
   *   overallDistanceTraveledMeters: number,
   *   overallDistanceRemainingMeters: number,
   *   overallProgressPercent: number,
   *   isOffRoute: boolean,
   *   isLegComplete: boolean,
   *   approachingStop: object|null,
   *   nextManeuver: { instruction: string, distanceMeters: number, mode: string, type: string }
   * }}
   */
  match(userPosition, itinerary, currentLegIndex = 0) {
    const legs = itinerary?.legs ?? itinerary?.journey_legs ?? []
    const leg = legs[currentLegIndex] || legs[0]
    const rawPos = { lat: userPosition.lat, lng: userPosition.lng }
    const now = userPosition.timestamp ?? Date.now()

    if (!leg) {
      return {
        isSnapped: false,
        snappedPosition: rawPos,
        rawPosition: rawPos,
        snappedBearing: userPosition.heading ?? null,
        distanceToRouteMeters: 0,
        distanceTraveledInLegMeters: 0,
        distanceRemainingInLegMeters: 0,
        totalLegDistanceMeters: 0,
        legProgressPercent: 0,
        overallDistanceTraveledMeters: 0,
        overallDistanceRemainingMeters: 0,
        overallProgressPercent: 0,
        isOffRoute: false,
        isLegComplete: false,
        approachingStop: null,
        nextManeuver: null,
      }
    }

    const polyline = RouteMatcher.getLegPolyline(leg)
    const isWalking = (leg.type ?? leg.mode) === 'walking'
    const tolerance = isWalking ? this.walkingToleranceMeters : this.transitToleranceMeters

    const snapResult = snapToPolyline(rawPos, polyline, this.lastMatchedSegmentIndex)
    const distanceToRoute = snapResult.distanceMeters
    const isSnapped = distanceToRoute <= tolerance

    let visualPos = rawPos
    let visualBearing = userPosition.heading ?? null

    if (isSnapped) {
      visualPos = { lat: snapResult.snappedPoint[0], lng: snapResult.snappedPoint[1] }
      this.lastMatchedSegmentIndex = snapResult.segmentIndex
      // Reset off-route counters
      this.consecutiveOffRouteCount = 0
      this.firstOffRouteTimestamp = null
      if (snapResult.segmentBearing != null) {
        visualBearing = snapResult.segmentBearing
      }
    } else {
      // Off-route tracking
      this.consecutiveOffRouteCount += 1
      if (!this.firstOffRouteTimestamp) {
        this.firstOffRouteTimestamp = now
      }
    }

    const offRouteDuration = this.firstOffRouteTimestamp ? now - this.firstOffRouteTimestamp : 0
    const isOffRoute =
      this.consecutiveOffRouteCount >= this.offRouteConsecutiveFixesRequired &&
      offRouteDuration >= this.offRouteMinDurationMs

    // Leg progress calculations
    const totalLegDistance = polylineLength(polyline)
    const distanceTraveledInLeg = isSnapped
      ? distanceAlongPolyline(polyline, snapResult.segmentIndex, snapResult.t)
      : 0
    const distanceRemainingInLeg = Math.max(0, totalLegDistance - distanceTraveledInLeg)
    const legProgressPercent =
      totalLegDistance > 0 ? Math.min(100, Math.round((distanceTraveledInLeg / totalLegDistance) * 100)) : 0

    // Distance to to_stop
    const toStopPos = leg.to_stop
      ? [Number(leg.to_stop.latitude ?? leg.to_lat), Number(leg.to_stop.longitude ?? leg.to_lng)]
      : polyline[polyline.length - 1]
    const distanceToStop = toStopPos ? haversineDistance([visualPos.lat, visualPos.lng], toStopPos) : 0

    const isLegComplete = distanceToStop <= 35 || distanceRemainingInLeg <= 25

    // Overall progress across all legs
    let completedLegsDist = 0
    let totalAllLegsDist = 0

    legs.forEach((l, idx) => {
      const p = RouteMatcher.getLegPolyline(l)
      const len = polylineLength(p)
      totalAllLegsDist += len
      if (idx < currentLegIndex) {
        completedLegsDist += len
      }
    })

    const overallTraveled = completedLegsDist + distanceTraveledInLeg
    const overallRemaining = Math.max(0, totalAllLegsDist - overallTraveled)
    const overallPercent =
      totalAllLegsDist > 0 ? Math.min(100, Math.round((overallTraveled / totalAllLegsDist) * 100)) : 0

    // Stop proximity
    let approachingStop = null
    if (leg.to_stop && distanceToStop <= 300) {
      approachingStop = {
        ...leg.to_stop,
        distanceMeters: Math.round(distanceToStop),
        status: distanceToStop <= 40 ? 'at_stop' : 'approaching',
      }
    }

    // Next Maneuver
    const nextManeuver = {
      instruction: isWalking
        ? `Walk ${Math.round(distanceRemainingInLeg)}m to ${leg.to_stop?.name ?? 'destination'}`
        : `Ride ${leg.mode ?? 'transit'} to ${leg.to_stop?.name ?? 'next stop'}`,
      distanceMeters: Math.round(distanceRemainingInLeg),
      mode: leg.mode ?? (isWalking ? 'walking' : 'transit'),
      type: leg.type ?? (isWalking ? 'walking' : 'transit'),
      targetStop: leg.to_stop?.name ?? null,
    }

    return {
      isSnapped,
      snappedPosition: visualPos,
      rawPosition: rawPos,
      snappedBearing: visualBearing,
      distanceToRouteMeters: Math.round(distanceToRoute),
      distanceTraveledInLegMeters: Math.round(distanceTraveledInLeg),
      distanceRemainingInLegMeters: Math.round(distanceRemainingInLeg),
      totalLegDistanceMeters: Math.round(totalLegDistance),
      legProgressPercent,
      overallDistanceTraveledMeters: Math.round(overallTraveled),
      overallDistanceRemainingMeters: Math.round(overallRemaining),
      overallProgressPercent: overallPercent,
      isOffRoute,
      isLegComplete,
      approachingStop,
      nextManeuver,
    }
  }
}
