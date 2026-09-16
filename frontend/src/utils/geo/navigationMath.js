/**
 * navigationMath.js — Core geometric & spatial algorithms for Google Maps-grade navigation.
 *
 * Implements geodetic distance, orthogonal segment projection, polyline snapping,
 * bearing calculation, shortest-path angle interpolation, and forward-looking offsets.
 * Coordinates are represented as { lat, lng } or [lat, lng].
 */

const EARTH_RADIUS_METERS = 6371008.8

/** Converts degrees to radians. */
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/** Converts radians to degrees. */
export function toDegrees(radians) {
  return (radians * 180) / Math.PI
}

/** Normalize coordinate object or array to [lat, lng]. */
export function toLatLng(coord) {
  if (!coord) return null
  if (Array.isArray(coord)) return [Number(coord[0]), Number(coord[1])]
  return [Number(coord.lat ?? coord.latitude), Number(coord.lng ?? coord.longitude)]
}

/**
 * Great-circle distance in meters between two coordinates via Haversine formula.
 * @param {[number, number]|{lat: number, lng: number}} p1
 * @param {[number, number]|{lat: number, lng: number}} p2
 * @returns {number} distance in meters
 */
export function haversineDistance(p1, p2) {
  const c1 = toLatLng(p1)
  const c2 = toLatLng(p2)
  if (!c1 || !c2 || !Number.isFinite(c1[0]) || !Number.isFinite(c2[0])) return 0

  const dLat = toRadians(c2[0] - c1[0])
  const dLng = toRadians(c2[1] - c1[1])
  const lat1 = toRadians(c1[0])
  const lat2 = toRadians(c2[0])

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/**
 * Initial compass bearing (azimuth) from p1 to p2 in degrees [0, 360).
 * @param {[number, number]|{lat: number, lng: number}} p1
 * @param {[number, number]|{lat: number, lng: number}} p2
 * @returns {number} bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(p1, p2) {
  const c1 = toLatLng(p1)
  const c2 = toLatLng(p2)
  if (!c1 || !c2) return 0

  const lat1 = toRadians(c1[0])
  const lat2 = toRadians(c2[0])
  const dLng = toRadians(c2[1] - c1[1])

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const initialBearing = toDegrees(Math.atan2(y, x))
  return (initialBearing + 360) % 360
}

/**
 * Minimal signed angle difference in range [-180, 180].
 * Positive means clockwise rotation, negative means counter-clockwise.
 */
export function shortestAngleDiff(fromDeg, toDeg) {
  const diff = ((toDeg - fromDeg + 180) % 360 + 360) % 360 - 180
  return diff
}

/**
 * Shortest-path angular interpolation between two bearings.
 * Prevents 359° spin around true north.
 * @param {number} currentDeg
 * @param {number} targetDeg
 * @param {number} factor [0, 1]
 * @returns {number} interpolated degree in [0, 360)
 */
export function interpolateAngle(currentDeg, targetDeg, factor = 0.25) {
  if (currentDeg == null) return targetDeg
  if (targetDeg == null) return currentDeg
  const diff = shortestAngleDiff(currentDeg, targetDeg)
  const next = currentDeg + diff * Math.min(1, Math.max(0, factor))
  return (next + 360) % 360
}

/**
 * Project point P onto segment AB using local planar projection.
 * Accurate within short urban distances (< 20 km).
 * @param {[number, number]} point [lat, lng]
 * @param {[number, number]} segA [lat, lng]
 * @param {[number, number]} segB [lat, lng]
 * @returns {{ projected: [number, number], distanceMeters: number, t: number }}
 */
export function pointToSegmentProjection(point, segA, segB) {
  const p = toLatLng(point)
  const a = toLatLng(segA)
  const b = toLatLng(segB)
  if (!p || !a || !b) return { projected: p || [0, 0], distanceMeters: Infinity, t: 0 }

  const meanLatRad = toRadians((a[0] + b[0] + p[0]) / 3)
  const kx = 111320 * Math.cos(meanLatRad)
  const ky = 110574

  // Convert to local Cartesian meters relative to A
  const bx = (b[1] - a[1]) * kx
  const by = (b[0] - a[0]) * ky
  const px = (p[1] - a[1]) * kx
  const py = (p[0] - a[0]) * ky

  const segLengthSq = bx * bx + by * by
  if (segLengthSq < 1e-6) {
    const dist = Math.hypot(px, py)
    return { projected: [a[0], a[1]], distanceMeters: dist, t: 0 }
  }

  // Scalar projection t clamped to [0, 1]
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLengthSq))

  const projLat = a[0] + t * (b[0] - a[0])
  const projLng = a[1] + t * (b[1] - a[1])

  const projX = t * bx
  const projY = t * by
  const distanceMeters = Math.hypot(px - projX, py - projY)

  return {
    projected: [projLat, projLng],
    distanceMeters,
    t,
  }
}

/**
 * Snap coordinate to polyline (array of [lat, lng]).
 * Searches for closest segment and returns orthogonal projection.
 *
 * @param {[number, number]|{lat: number, lng: number}} point
 * @param {Array<[number, number]>} polyline
 * @param {number} [searchStartIndex=0] optional index to favor forward progress
 * @returns {{
 *   snappedPoint: [number, number],
 *   distanceMeters: number,
 *   segmentIndex: number,
 *   t: number,
 *   segmentBearing: number
 * }}
 */
export function snapToPolyline(point, polyline, searchStartIndex = 0) {
  const p = toLatLng(point)
  if (!p || !Array.isArray(polyline) || polyline.length < 2) {
    return {
      snappedPoint: p || [0, 0],
      distanceMeters: Infinity,
      segmentIndex: -1,
      t: 0,
      segmentBearing: 0,
    }
  }

  let minDistance = Infinity
  let bestResult = null

  const startIdx = Math.max(0, Math.min(searchStartIndex, polyline.length - 2))

  // Search forward first, then backward if needed
  for (let i = 0; i < polyline.length - 1; i++) {
    // Priority to segments near searchStartIndex
    const segIdx = (startIdx + i) % (polyline.length - 1)
    const segA = polyline[segIdx]
    const segB = polyline[segIdx + 1]

    const proj = pointToSegmentProjection(p, segA, segB)
    if (proj.distanceMeters < minDistance) {
      minDistance = proj.distanceMeters
      const bearing = calculateBearing(segA, segB)
      bestResult = {
        snappedPoint: proj.projected,
        distanceMeters: proj.distanceMeters,
        segmentIndex: segIdx,
        t: proj.t,
        segmentBearing: bearing,
      }
      // If very close (< 2 meters), stop early
      if (minDistance < 2) break
    }
  }

  return bestResult || {
    snappedPoint: p,
    distanceMeters: Infinity,
    segmentIndex: -1,
    t: 0,
    segmentBearing: 0,
  }
}

/**
 * Calculate total length of polyline in meters.
 * @param {Array<[number, number]>} polyline
 * @returns {number} total length in meters
 */
export function polylineLength(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) return 0
  let total = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistance(polyline[i], polyline[i + 1])
  }
  return total
}

/**
 * Distance traveled along polyline from start up to (segmentIndex, t).
 * @param {Array<[number, number]>} polyline
 * @param {number} segmentIndex
 * @param {number} t ratio [0, 1] on current segment
 * @returns {number} distance in meters
 */
export function distanceAlongPolyline(polyline, segmentIndex, t = 0) {
  if (!Array.isArray(polyline) || polyline.length < 2 || segmentIndex < 0) return 0
  let traveled = 0
  const maxIdx = Math.min(segmentIndex, polyline.length - 2)

  for (let i = 0; i < maxIdx; i++) {
    traveled += haversineDistance(polyline[i], polyline[i + 1])
  }

  if (segmentIndex < polyline.length - 1) {
    const segDist = haversineDistance(polyline[segmentIndex], polyline[segmentIndex + 1])
    traveled += segDist * Math.max(0, Math.min(1, t))
  }

  return traveled
}

/**
 * Forward-looking camera offset location:
 * Computes a target point offset ahead of the user along the travel bearing.
 * Useful for driving/walking view where user appears in the bottom third of the viewport.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} bearingDeg travel direction
 * @param {number} distanceMeters offset distance (typically 30-100m depending on speed)
 * @returns {[number, number]} [lat, lng] offset center
 */
export function forwardOffsetLocation(lat, lng, bearingDeg, distanceMeters) {
  if (distanceMeters <= 0 || !Number.isFinite(bearingDeg)) return [lat, lng]

  const d = distanceMeters / EARTH_RADIUS_METERS
  const brng = toRadians(bearingDeg)
  const latRad = toRadians(lat)
  const lngRad = toRadians(lng)

  const offsetLat = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(brng)
  )
  const offsetLng =
    lngRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(offsetLat)
    )

  return [toDegrees(offsetLat), toDegrees(offsetLng)]
}

/**
 * Classify angular difference between two segments into maneuver type.
 * @param {number} angleDiff signed degree diff [-180, 180]
 * @returns {'straight'|'slight_right'|'turn_right'|'sharp_right'|'u_turn'|'slight_left'|'turn_left'|'sharp_left'}
 */
export function classifyTurnAngle(angleDiff) {
  if (!Number.isFinite(angleDiff)) return 'straight'
  const abs = Math.abs(angleDiff)
  if (abs < 20) return 'straight'
  if (angleDiff > 0) {
    if (angleDiff <= 45) return 'slight_right'
    if (angleDiff <= 135) return 'turn_right'
    if (angleDiff <= 170) return 'sharp_right'
    return 'u_turn'
  } else {
    if (angleDiff >= -45) return 'slight_left'
    if (angleDiff >= -135) return 'turn_left'
    if (angleDiff >= -170) return 'sharp_left'
    return 'u_turn'
  }
}

/**
 * Detect all maneuvers (turns) along a polyline.
 * @param {Array<[number, number]>} polyline
 * @returns {Array<{
 *   vertexIndex: number,
 *   point: [number, number],
 *   turnType: string,
 *   angleDiff: number,
 *   bearingBefore: number,
 *   bearingAfter: number,
 *   distanceFromStartMeters: number
 * }>}
 */
export function detectPolylineManeuvers(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 3) return []
  const maneuvers = []
  let cumulativeDist = 0

  for (let i = 1; i < polyline.length - 1; i++) {
    const prev = polyline[i - 1]
    const curr = polyline[i]
    const next = polyline[i + 1]

    const segLen = haversineDistance(prev, curr)
    cumulativeDist += segLen

    const bearingBefore = calculateBearing(prev, curr)
    const bearingAfter = calculateBearing(curr, next)
    const angleDiff = shortestAngleDiff(bearingBefore, bearingAfter)

    const turnType = classifyTurnAngle(angleDiff)
    if (turnType !== 'straight') {
      maneuvers.push({
        vertexIndex: i,
        point: curr,
        turnType,
        angleDiff,
        bearingBefore,
        bearingAfter,
        distanceFromStartMeters: cumulativeDist,
      })
    }
  }

  return maneuvers
}

/**
 * Find the next upcoming maneuver along polyline ahead of current progress.
 *
 * @param {Array<[number, number]>} polyline
 * @param {number} segmentIndex
 * @param {number} t
 * @param {Array<object>} [precomputedManeuvers]
 * @returns {{
 *   type: string,
 *   distanceMeters: number,
 *   point: [number, number]|null,
 *   bearingAfter: number|null
 * }|null}
 */
export function findUpcomingManeuver(polyline, segmentIndex, t = 0, precomputedManeuvers = null) {
  if (!Array.isArray(polyline) || polyline.length < 2) return null
  const currentTraveled = distanceAlongPolyline(polyline, segmentIndex, t)
  const totalLength = polylineLength(polyline)
  const remainingTotal = Math.max(0, totalLength - currentTraveled)

  const maneuvers = precomputedManeuvers || detectPolylineManeuvers(polyline)

  for (const m of maneuvers) {
    if (m.vertexIndex > segmentIndex || (m.vertexIndex === segmentIndex && t < 0.5)) {
      const distToManeuver = Math.max(0, m.distanceFromStartMeters - currentTraveled)
      return {
        type: m.turnType,
        distanceMeters: Math.round(distToManeuver),
        point: m.point,
        bearingAfter: m.bearingAfter,
      }
    }
  }

  return {
    type: 'arrive',
    distanceMeters: Math.round(remainingTotal),
    point: polyline[polyline.length - 1],
    bearingAfter: null,
  }
}
