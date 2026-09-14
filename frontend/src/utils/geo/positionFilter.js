/**
 * positionFilter.js — High-precision GPS noise, jitter, and outlier filter.
 *
 * Employs adaptive exponential smoothing, speed-based jump rejection,
 * stationary deadband suppression, and heading stabilization.
 */

import { haversineDistance, calculateBearing, interpolateAngle } from './navigationMath'

export class PositionFilter {
  constructor(options = {}) {
    this.maxSpeedMps = options.maxSpeedMps ?? 45 // 162 km/h max realistic transit speed
    this.stationarySpeedThreshold = options.stationarySpeedThreshold ?? 0.6 // m/s
    this.stationaryDistanceThreshold = options.stationaryDistanceThreshold ?? 2.5 // meters
    this.maxAccuracyThreshold = options.maxAccuracyThreshold ?? 120 // meters

    this.lastFix = null // last raw fix { lat, lng, accuracy, heading, speed, timestamp }
    this.currentPosition = null // smoothed output { lat, lng, accuracy, heading, speed, movementState, timestamp }
    this.jumpCount = 0
    this.lastStableHeading = null
  }

  /** Reset internal filter state. */
  reset() {
    this.lastFix = null
    this.currentPosition = null
    this.jumpCount = 0
    this.lastStableHeading = null
  }

  /**
   * Process a new raw GPS fix from watchPosition.
   * @param {{
   *   latitude: number,
   *   longitude: number,
   *   accuracy?: number,
   *   heading?: number|null,
   *   speed?: number|null,
   *   timestamp?: number
   * }} rawCoords
   * @returns {{
   *   lat: number,
   *   lng: number,
   *   accuracy: number|null,
   *   heading: number|null,
   *   speed: number,
   *   movementState: 'stationary'|'walking'|'vehicle',
   *   accepted: boolean,
   *   timestamp: number
   * }}
   */
  process(rawCoords) {
    const lat = Number(rawCoords.latitude ?? rawCoords.lat)
    const lng = Number(rawCoords.longitude ?? rawCoords.lng)
    const accuracy = Number.isFinite(Number(rawCoords.accuracy)) ? Number(rawCoords.accuracy) : null
    const timestamp = rawCoords.timestamp ?? Date.now()

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return this.currentPosition || {
        lat: 30.0444,
        lng: 31.2357,
        accuracy: null,
        heading: null,
        speed: 0,
        movementState: 'stationary',
        accepted: false,
        timestamp,
      }
    }

    const currentFix = { lat, lng, accuracy, timestamp }

    // First fix initialisation
    if (!this.lastFix || !this.currentPosition) {
      const initialHeading = Number.isFinite(rawCoords.heading) ? Number(rawCoords.heading) : null
      this.lastFix = currentFix
      this.lastStableHeading = initialHeading
      this.currentPosition = {
        lat,
        lng,
        accuracy,
        heading: initialHeading,
        speed: Math.max(0, Number(rawCoords.speed) || 0),
        movementState: (Number(rawCoords.speed) || 0) > 1 ? 'walking' : 'stationary',
        accepted: true,
        timestamp,
      }
      return this.currentPosition
    }

    const dtSeconds = Math.max(0.2, (timestamp - this.lastFix.timestamp) / 1000)
    const distMeters = haversineDistance(
      [this.lastFix.lat, this.lastFix.lng],
      [currentFix.lat, currentFix.lng]
    )
    const calculatedSpeed = distMeters / dtSeconds

    // 1. Impossible Jump Rejection
    // If user appears to jump > 45 m/s, reject the single spike unless confirmed by next fix
    if (calculatedSpeed > this.maxSpeedMps) {
      this.jumpCount += 1
      if (this.jumpCount < 2 && dtSeconds < 10) {
        // Drop outlier, keep previous position
        return {
          ...this.currentPosition,
          accepted: false,
          timestamp,
        }
      }
      // If repeated, accept the teleporation (user opened app at new location)
      this.jumpCount = 0
    } else {
      this.jumpCount = 0
    }

    // 2. Accuracy Gating:
    // If accuracy is worse than 120m and we have a fresh fix (< 25s), downplay or ignore
    if (accuracy != null && accuracy > this.maxAccuracyThreshold && dtSeconds < 25) {
      return {
        ...this.currentPosition,
        accepted: false,
        timestamp,
      }
    }

    // 3. Speed determination
    let speed = 0
    if (Number.isFinite(rawCoords.speed) && rawCoords.speed >= 0) {
      speed = Number(rawCoords.speed)
    } else {
      speed = calculatedSpeed
    }

    // 4. Movement State & Stationary Deadband
    let movementState = 'stationary'
    if (speed >= 2.5) {
      movementState = 'vehicle'
    } else if (speed >= 0.6) {
      movementState = 'walking'
    }

    // Jitter suppression: if movement is tiny and user is walking/stationary, freeze position
    if (distMeters < this.stationaryDistanceThreshold && speed < this.stationarySpeedThreshold) {
      movementState = 'stationary'
      this.currentPosition = {
        ...this.currentPosition,
        speed: 0,
        movementState,
        accuracy,
        timestamp,
      }
      return this.currentPosition
    }

    // 5. Adaptive Smoothing (Exponential Moving Average)
    // High accuracy (<= 10m) → alpha = 0.7 (quick response)
    // Low accuracy (>= 50m) → alpha = 0.25 (heavy smoothing)
    const accNorm = accuracy != null ? Math.min(60, Math.max(5, accuracy)) : 20
    const alpha = 0.8 - (accNorm / 60) * 0.55

    const smoothedLat = this.currentPosition.lat + alpha * (currentFix.lat - this.currentPosition.lat)
    const smoothedLng = this.currentPosition.lng + alpha * (currentFix.lng - this.currentPosition.lng)

    // 6. Heading determination & stabilization
    let targetHeading = this.lastStableHeading
    const hasDeviceHeading = Number.isFinite(rawCoords.heading) && rawCoords.heading >= 0

    if (hasDeviceHeading && speed > 0.6) {
      targetHeading = Number(rawCoords.heading)
    } else if (distMeters >= 3.0 && speed > 0.8) {
      // Calculate movement-derived bearing between smoothed positions
      targetHeading = calculateBearing(
        [this.currentPosition.lat, this.currentPosition.lng],
        [smoothedLat, smoothedLng]
      )
    }

    let smoothedHeading = this.lastStableHeading
    if (targetHeading != null) {
      smoothedHeading = interpolateAngle(this.lastStableHeading, targetHeading, 0.35)
      this.lastStableHeading = smoothedHeading
    }

    this.lastFix = currentFix
    this.currentPosition = {
      lat: smoothedLat,
      lng: smoothedLng,
      accuracy,
      heading: smoothedHeading,
      speed: Number(speed.toFixed(1)),
      movementState,
      accepted: true,
      timestamp,
    }

    return this.currentPosition
  }
}
