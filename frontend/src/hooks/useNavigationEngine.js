import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PositionFilter } from '../utils/geo/positionFilter'
import { RouteMatcher } from '../utils/geo/routeMatcher'

const POST_MIN_INTERVAL_MS = 10000 // Throttled backend ping interval
const POST_MIN_DISTANCE_M = 25 // 25 meters minimum movement for backend ping
// Tunnel detection: N consecutive GPS errors (timeout/unavailable — never
// permission denial) after at least one good fix means the rider is most
// likely in a metro tunnel / dead zone.
const TUNNEL_CONSECUTIVE_ERRORS = 3

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
  const [retryCounter, setRetryCounter] = useState(0)
  const [rawPosition, setRawPosition] = useState(null)
  const [visualPosition, setVisualPosition] = useState(null)
  const [heading, setHeading] = useState(null)
  const [speed, setSpeed] = useState(0)
  const [movementState, setMovementState] = useState('stationary')
  const [routeMatch, setRouteMatch] = useState(null)
  const [isOffRoute, setIsOffRoute] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [tunnelMode, setTunnelMode] = useState(false)
  const lastFixAtRef = useRef(null)
  const consecutiveErrorsRef = useRef(0)

  const filterRef = useRef(new PositionFilter())
  const matcherRef = useRef(new RouteMatcher())
  const watchIdRef = useRef(null)
  const lastPostRef = useRef(null)
  const lastOffRouteRef = useRef(false)
  const lastLegCompleteRef = useRef(false)
  const updateCallbackRef = useRef(onLocationUpdate)
  updateCallbackRef.current = onLocationUpdate
  const deviationCallbackRef = useRef(onDeviationDetected)
  deviationCallbackRef.current = onDeviationDetected

  // Reset when itinerary or leg changes drastically
  useEffect(() => {
    matcherRef.current.reset()
    lastOffRouteRef.current = false
    lastLegCompleteRef.current = false
  }, [currentLegIndex])

  const stop = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    filterRef.current.reset()
    matcherRef.current.reset()
    lastOffRouteRef.current = false
    lastLegCompleteRef.current = false
    consecutiveErrorsRef.current = 0
    setTunnelMode(false)
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

      lastFixAtRef.current = Date.now()
      setIsStale(false)
      // A good fix clears the consecutive-error run (tunnel over / glitch passed).
      consecutiveErrorsRef.current = 0
      setTunnelMode(false)
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

      // Throttled honest posting to backend API: 10s / 25m, force immediate on newly off-route or leg complete
      const now = Date.now()
      const last = lastPostRef.current
      const movedM = last
        ? Math.hypot((raw.lat - last.lat) * 111320, (raw.lng - last.lng) * 111320 * Math.cos((raw.lat * Math.PI) / 180))
        : Infinity

      const isNewOffRoute = match.isOffRoute && !lastOffRouteRef.current
      const isNewLegComplete = match.isLegComplete && !lastLegCompleteRef.current
      lastOffRouteRef.current = match.isOffRoute
      lastLegCompleteRef.current = match.isLegComplete

      const forcePost = isNewOffRoute || isNewLegComplete
      if (
        !last ||
        forcePost ||
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
        if (lastFixAtRef.current) {
          setIsStale(true)
        }
        // Count consecutive GPS errors INSIDE the callback: the status state
        // stays 'error' across repeated failures, so counting from status
        // transitions outside would stall at 1 and tunnel mode would never
        // engage. Permission denial is terminal intent — never a tunnel.
        if (err.code === err.PERMISSION_DENIED) {
          consecutiveErrorsRef.current = 0
          setTunnelMode(false)
        } else if (lastFixAtRef.current) {
          consecutiveErrorsRef.current += 1
          if (consecutiveErrorsRef.current >= TUNNEL_CONSECUTIVE_ERRORS) {
            setTunnelMode(true)
          }
        }
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
  }, [enabled, stop, processCoordinates, retryCounter])

  const retry = useCallback(() => {
    consecutiveErrorsRef.current = 0
    setTunnelMode(false)
    setRetryCounter((c) => c + 1)
  }, [])

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
    isStale,
    tunnelMode,
    retry,
    simulateLocation,
    stop,
  }
}
