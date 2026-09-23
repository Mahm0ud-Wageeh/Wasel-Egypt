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
  detectPolylineManeuvers,
  findUpcomingManeuver,
} from './navigationMath'

export class RouteMatcher {
  constructor(options = {}) {
    this.walkingToleranceMeters = options.walkingToleranceMeters ?? 50
    this.transitToleranceMeters = options.transitToleranceMeters ?? 100 // 90-120m corridor
    this.offRouteConsecutiveFixesRequired = options.offRouteConsecutiveFixesRequired ?? 3
    this.offRouteMinDurationMs = options.offRouteMinDurationMs ?? 6000

    this.consecutiveOffRouteCount = 0
    this.firstOffRouteTimestamp = null
    this.lastMatchedSegmentIndex = 0
    this.cachedManeuvers = null
    this.lastManeuverLegIndex = null
  }

  /** Reset matcher state. */
  reset() {
    this.consecutiveOffRouteCount = 0
    this.firstOffRouteTimestamp = null
    this.lastMatchedSegmentIndex = 0
    this.cachedManeuvers = null
    this.lastManeuverLegIndex = null
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

    // Maneuvers caching per leg
    if (this.lastManeuverLegIndex !== currentLegIndex || !this.cachedManeuvers) {
      this.cachedManeuvers = detectPolylineManeuvers(polyline)
      this.lastManeuverLegIndex = currentLegIndex
    }

    const nextLeg = legs[currentLegIndex + 1] || null
    const isTransfer = Boolean(nextLeg && (nextLeg.type ?? nextLeg.mode) !== (leg.type ?? leg.mode))

    // Real Turn-by-Turn Maneuver from Route Geometry
    let nextManeuver = null

    if (isWalking) {
      const turnAhead = findUpcomingManeuver(
        polyline,
        snapResult.segmentIndex,
        snapResult.t,
        this.cachedManeuvers
      )

      if (turnAhead && turnAhead.type !== 'arrive') {
        const d = turnAhead.distanceMeters
        const turnKey = turnAhead.type
        const turnLabelEn = turnKey.replace(/_/g, ' ')
        const instructionEn = d <= 15
          ? `${turnLabelEn.charAt(0).toUpperCase() + turnLabelEn.slice(1)} now`
          : `In ${d}m, ${turnLabelEn}`
        const instructionAr = localizeTurnAr(turnKey, d)

        nextManeuver = {
          instruction: instructionEn,
          instruction_en: instructionEn,
          instruction_ar: instructionAr,
          distanceMeters: d,
          mode: 'walking',
          type: 'walking',
          turnType: turnKey,
          targetStop: leg.to_stop?.name ?? null,
          isTransfer: false,
          isArrival: false,
        }
      } else {
        const d = Math.round(distanceRemainingInLeg)
        const destName = leg.to_stop?.name ?? 'destination'
        const instructionEn = d <= 20
          ? `Arriving at ${destName}`
          : `Walk ${d}m to ${destName}`
        const instructionAr = d <= 20
          ? `الوصول إلى ${destName}`
          : `امشِ ${d}م إلى ${destName}`

        nextManeuver = {
          instruction: instructionEn,
          instruction_en: instructionEn,
          instruction_ar: instructionAr,
          distanceMeters: d,
          mode: 'walking',
          type: 'walking',
          turnType: 'arrive',
          targetStop: leg.to_stop?.name ?? null,
          isTransfer: false,
          isArrival: d <= 20,
        }
      }
    } else {
      // Transit Leg Maneuvers
      const d = Math.round(distanceRemainingInLeg)
      const stopName = leg.to_stop?.name ?? 'next stop'
      const lineName = leg.route_variant?.route?.short_name ? `Line ${leg.route_variant.route.short_name}` : (leg.mode ?? 'transit')

      let instructionEn = `Ride ${lineName} to ${stopName}`
      let instructionAr = `استقل ${lineName} إلى ${stopName}`

      if (distanceToStop <= 300) {
        if (isTransfer) {
          instructionEn = `Prepare to alight at ${stopName} and transfer`
          instructionAr = `استعد للنزول في ${stopName} والتحويل`
        } else {
          instructionEn = `Prepare to alight at ${stopName} in ${Math.round(distanceToStop)}m`
          instructionAr = `استعد للنزول في ${stopName} بعد ${Math.round(distanceToStop)}م`
        }
      }

      nextManeuver = {
        instruction: instructionEn,
        instruction_en: instructionEn,
        instruction_ar: instructionAr,
        distanceMeters: d,
        mode: leg.mode ?? 'transit',
        type: leg.type ?? 'transit',
        turnType: distanceToStop <= 300 ? (isTransfer ? 'transfer' : 'alight') : 'ride',
        targetStop: stopName,
        isTransfer,
        isArrival: distanceToStop <= 40,
      }
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

export function localizeTurnAr(turnKey, distanceMeters) {
  const translations = {
    turn_right: 'انعطف يميناً',
    slight_right: 'انعطف يميناً قليلاً',
    sharp_right: 'انعطف يميناً بشكل حاد',
    turn_left: 'انعطف يساراً',
    slight_left: 'انعطف يساراً قليلاً',
    sharp_left: 'انعطف يساراً بشكل حاد',
    u_turn: 'استدر للخلف',
    straight: 'تابع للأمام',
    arrive: 'الوصول إلى الوجهة',
  }
  const turnText = translations[turnKey] || 'تابع السير'
  if (distanceMeters <= 15) {
    return `${turnText} الآن`
  }
  return `بعد ${distanceMeters}م، ${turnText}`
}
