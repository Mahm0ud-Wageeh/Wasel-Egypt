import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useGeolocation — real browser geolocation with complete state handling.
 *
 * States: idle → locating → (located | denied | unavailable | timeout | error)
 * - `locate()`: explicit user intent only (never automatic — avoids
 *   surprise permission prompts).
 * - `status`: 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'error'
 * - `position`: { lat, lng, accuracy } once resolved.
 * - Only the last call wins (stale resolutions are dropped).
 * - Never throws; consumers render states via `status` + `message`.
 */

const GEO_TIMEOUT_MS = 12000
const GEO_MAX_AGE_MS = 30000

export function useGeolocation() {
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(null)
  const [message, setMessage] = useState(null)
  const requestSeq = useRef(0)

  useEffect(() => () => { requestSeq.current += 1 }, [])

  const locate = useCallback(() => {
    const seq = ++requestSeq.current

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setMessage('Geolocation is not available on this device or browser.')
      return
    }

    setStatus('locating')
    setMessage(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (seq !== requestSeq.current) return
        const { latitude, longitude, accuracy } = pos.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setStatus('error')
          setMessage('The device returned an invalid position.')
          return
        }
        setPosition({ lat: latitude, lng: longitude, accuracy })
        setStatus('granted')
      },
      (err) => {
        if (seq !== requestSeq.current) return
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatus('denied')
            setMessage('Location permission was denied. You can still pick a stop or place manually.')
            break
          case err.POSITION_UNAVAILABLE:
            setStatus('unavailable')
            setMessage('Your position could not be determined right now.')
            break
          case err.TIMEOUT:
            setStatus('timeout')
            setMessage('Locating took too long. Please try again.')
            break
          default:
            setStatus('error')
            setMessage(err.message || 'Geolocation failed.')
        }
      },
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS },
    )
  }, [])

  const clearMessage = useCallback(() => setMessage(null), [])

  return { status, position, message, locate, clearMessage }
}

/**
 * Fold a geolocation position into a location-picker selection value
 * (same shape the planner expects: id/name/lat/lng + isCurrent flag).
 * Reverse-geocoding for a human-readable name happens in the consumer.
 */
export function positionToSelection(position) {
  if (!position) return null
  return {
    id: `geo_${position.lat.toFixed(5)}_${position.lng.toFixed(5)}`,
    name: 'My current location',
    latitude: position.lat,
    longitude: position.lng,
    isCurrent: true,
    accuracy: position.accuracy,
  }
}
