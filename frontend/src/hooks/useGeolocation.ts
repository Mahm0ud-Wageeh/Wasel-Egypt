import { useState, useEffect, useCallback, useRef } from 'react'

export interface GeoLocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  heading: number | null
  speed: number | null
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error' | 'simulated'
  error: string | null
}

// Default center: Downtown Cairo (Tahrir / Ramses)
export const DEFAULT_CAIRO_COORDS = { lat: 30.0444, lng: 31.2357 }

export function useGeolocation(autoWatch = true) {
  const [state, setState] = useState<GeoLocationState>({
    lat: DEFAULT_CAIRO_COORDS.lat,
    lng: DEFAULT_CAIRO_COORDS.lng,
    accuracy: null,
    heading: null,
    speed: null,
    status: 'idle',
    error: null,
  })

  const watchId = useRef<number | null>(null)
  const isSimulating = useRef(false)

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, status: 'error', error: 'Geolocation is not supported' }))
      return
    }

    setState(s => ({ ...s, status: 'requesting' }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isSimulating.current) {
          setState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            status: 'granted',
            error: null,
          })
        }
      },
      (err) => {
        if (!isSimulating.current) {
          const isDenied = err.code === err.PERMISSION_DENIED
          setState(s => ({
            ...s,
            status: isDenied ? 'denied' : 'error',
            error: err.message,
          }))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [])

  useEffect(() => {
    if (!autoWatch || !navigator.geolocation) return

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isSimulating.current) {
          setState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            status: 'granted',
            error: null,
          })
        }
      },
      (err) => {
        if (!isSimulating.current) {
          setState(s => ({
            ...s,
            status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
            error: err.message,
          }))
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [autoWatch])

  const setSimulatedLocation = useCallback((lat: number, lng: number) => {
    isSimulating.current = true
    setState({
      lat,
      lng,
      accuracy: 5,
      heading: null,
      speed: 15,
      status: 'simulated',
      error: null,
    })
  }, [])

  const resetToRealLocation = useCallback(() => {
    isSimulating.current = false
    requestPosition()
  }, [requestPosition])

  return {
    ...state,
    requestPosition,
    setSimulatedLocation,
    resetToRealLocation,
  }
}
