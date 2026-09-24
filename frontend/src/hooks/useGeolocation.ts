import { useState, useEffect, useCallback, useRef } from 'react'

export interface PositionCoords {
  lat: number
  lng: number
  accuracy?: number | null
}

export type GeolocationStatus =
  | 'idle'
  | 'locating'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error'
  | 'simulated'

export interface GeoLocationState {
  status: GeolocationStatus
  position: PositionCoords | null
  message: string | null
  lat: number | null
  lng: number | null
  accuracy: number | null
  heading: number | null
  speed: number | null
  error: string | null
}

// Default center: Downtown Cairo (Tahrir / Ramses)
export const DEFAULT_CAIRO_COORDS = { lat: 30.0444, lng: 31.2357 }

export function positionToSelection(pos: { lat: number; lng: number; accuracy?: number | null } | null) {
  if (!pos) return null
  return {
    latitude: pos.lat,
    longitude: pos.lng,
    isCurrent: true,
    accuracy: pos.accuracy ?? null,
  }
}

export function useGeolocation(autoWatch = false) {
  const [state, setState] = useState<GeoLocationState>({
    status: 'idle',
    position: null,
    message: null,
    lat: null,
    lng: null,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
  })

  const watchId = useRef<number | null>(null)
  const isSimulating = useRef(false)

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(s => ({
        ...s,
        status: 'unavailable',
        message: 'Geolocation is not supported by your browser',
        error: 'Geolocation is not supported',
      }))
      return
    }

    setState(s => ({ ...s, status: 'locating' }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isSimulating.current) {
          const coords: PositionCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setState({
            status: 'granted',
            position: coords,
            message: null,
            lat: coords.lat,
            lng: coords.lng,
            accuracy: coords.accuracy ?? null,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            error: null,
          })
        }
      },
      (err) => {
        if (!isSimulating.current) {
          let status: GeolocationStatus = 'error'
          let message = err.message || 'Unable to retrieve location'

          if (err.code === 1 || err.code === (err as any).PERMISSION_DENIED) {
            status = 'denied'
            message = 'User denied geolocation request'
          } else if (err.code === 2 || err.code === (err as any).POSITION_UNAVAILABLE) {
            status = 'unavailable'
            message = 'Location information is unavailable'
          } else if (err.code === 3 || err.code === (err as any).TIMEOUT) {
            status = 'timeout'
            message = 'Location request timed out'
          }

          setState(s => ({
            ...s,
            status,
            message,
            error: message,
          }))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [])

  useEffect(() => {
    if (!autoWatch || typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) return

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isSimulating.current) {
          const coords: PositionCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setState({
            status: 'granted',
            position: coords,
            message: null,
            lat: coords.lat,
            lng: coords.lng,
            accuracy: coords.accuracy ?? null,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            error: null,
          })
        }
      },
      (err) => {
        if (!isSimulating.current) {
          let status: GeolocationStatus = 'error'
          let message = err.message || 'Unable to retrieve location'

          if (err.code === 1 || err.code === (err as any).PERMISSION_DENIED) {
            status = 'denied'
            message = 'User denied geolocation request'
          } else if (err.code === 2 || err.code === (err as any).POSITION_UNAVAILABLE) {
            status = 'unavailable'
            message = 'Location information is unavailable'
          } else if (err.code === 3 || err.code === (err as any).TIMEOUT) {
            status = 'timeout'
            message = 'Location request timed out'
          }

          setState(s => ({
            ...s,
            status,
            message,
            error: message,
          }))
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchId.current !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [autoWatch])

  const setSimulatedLocation = useCallback((lat: number, lng: number) => {
    isSimulating.current = true
    const coords: PositionCoords = { lat, lng, accuracy: 5 }
    setState({
      status: 'simulated',
      position: coords,
      message: null,
      lat,
      lng,
      accuracy: 5,
      heading: null,
      speed: 15,
      error: null,
    })
  }, [])

  const resetToRealLocation = useCallback(() => {
    isSimulating.current = false
    locate()
  }, [locate])

  return {
    ...state,
    locate,
    requestPosition: locate,
    setSimulatedLocation,
    resetToRealLocation,
  }
}
