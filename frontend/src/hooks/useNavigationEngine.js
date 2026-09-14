import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PositionFilter } from '../utils/geo/positionFilter'
import { RouteMatcher } from '../utils/geo/routeMatcher'

const POST_MIN_INTERVAL_MS = 10000 // Throttled backend ping interval
const POST_MIN_DISTANCE_M = 25 // 25 meters minimum movement for backend ping

/**
 * useNavigationEngine — Production live navigation engine for Wasel Egypt.
 *
 * Coordinates:
 *  - Continuous high-accuracy browser geolocation (watchPosition).
 *  - Adaptive GPS noise & outlier filtering (PositionFilter).
 *  - Leg-aware map matching & polyline snapping (RouteMatcher).
 *  - Real-time client progress and maneuver countdowns.
 *  - Multi-fix persistent off-route detection.
 *  - Throttled backend sync via onLocationUpdate.
 */
export function useNavigationEngine({
  enabled = false,
  itinerary = null,
  currentLegIndex = 0,
  onLocationUpdate = null,
  onDeviationDetected = null,
}) {
  const [status, setStatus] = useState('off')
  const [rawPosition, setRawPosition] = useState(null)
  const [visualPosition, setVisualPosition] = useState(null)
  const [heading, setHeading] = useState(null)
  const [speed, setSpeed] = useState(0)
  const [movementState, setMovementState] = useState('stationary')
  const [routeMatch, setRouteMatch] = useState(null)
  const [isOffRoute, setIsOffRoute] = useState(false)

  const filterRef = useRef(new PositionFilter())
  const matcherRef = useRef(new RouteMatcher())
  const watchIdRef = useRef(null)
  const lastPostRef = useRef(null)
  const updateCallbackRef = useRef(onLocationUpdate)
  updateCallbackRef.current = onLocationUpdate
  const deviationCallbackRef = useRef(onDeviationDetected)
  deviationCallbackRef.current = onDeviationDetected

  // Reset when itinerary or leg changes drastically
  useEffect(() => {
    matcherRef.current.reset()
  }, [currentLegIndex])

  const stop = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    filterRef.current.reset()
    matcherRef.current.reset()
    setStatus('off')
  }, [])

  const processCoordinates = useCallback(
    (coords) => {
      const filtered = filterRef.current.process(coords)
      if (!filtered.accepted && !filterRef.current.currentPosition) return

      const raw = {
        lat: filtered.lat,
        lng: filtered.lng,
        accuracy: filtered.accuracy,
      }
      setRawPosition(raw)
      setHeading(filtered.heading)
      setSpeed(filtered.speed)
      setMovementState(filtered.movementState)

      // Map match against current itinerary
      const match = matcherRef.current.match(filtered, itinerary, currentLegIndex)
      setRouteMatch(match)
      setIsOffRoute(match.isOffRoute)

      // Use snapped position for visual display if on-route; otherwise use filtered raw
      const visual = match.isSnapped ? match.snappedPosition : raw
      setVisualPosition(visual)

      if (match.isOffRoute) {
        deviationCallbackRef.current?.(match)
      }

      // Throttled honest posting to backend API
      const now = Date.now()
      const last = lastPostRef.current
      const movedM = last
        ? Math.hypot((raw.lat - last.lat) * 111320, (raw.lng - last.lng) * 111320 * Math.cos((raw.lat * Math.PI) / 180))
        : Infinity

      if (
        !last ||
        match.isOffRoute ||
        match.isLegComplete ||
        (now - last.at >= POST_MIN_INTERVAL_MS && movedM >= POST_MIN_DISTANCE_M)
      ) {
        lastPostRef.current = { at: now, lat: raw.lat, lng: raw.lng }
        updateCallbackRef.current?.({
          latitude: raw.lat,
          longitude: raw.lng,
          accuracy: raw.accuracy,
          heading: filtered.heading,
          speed: filtered.speed,
          recorded_at: new Date().toISOString(),
        })
      }
    },
    [itinerary, currentLegIndex]
  )

  useEffect(() => {
    if (!enabled) {
      stop()
      return undefined
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return undefined
    }

    setStatus('starting')

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('live')
        processCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        })
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatus('denied')
            break
          case err.POSITION_UNAVAILABLE:
          case err.TIMEOUT:
            setStatus('error')
            break
          default:
            setStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      }
    )

    return () => {
      if (watchIdRef.current != null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [enabled, stop, processCoordinates])

  // Allow manual simulation pings (e.g. for testing / demo)
  const simulateLocation = useCallback(
    (lat, lng, speed = 1.4) => {
      processCoordinates({
        latitude: lat,
        longitude: lng,
        accuracy: 8,
        heading: null,
        speed,
        timestamp: Date.now(),
      })
    },
    [processCoordinates]
  )

  return {
    status,
    rawPosition,
    visualPosition,
    heading,
    speed,
    movementState,
    routeMatch,
    isOffRoute,
    simulateLocation,
    stop,
  }
}
