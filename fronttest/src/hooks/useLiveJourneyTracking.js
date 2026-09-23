import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useLiveJourneyTracking — real device GPS for the Journey Cockpit.
 *
 * When `enabled`, watches the device position (high accuracy) and:
 *  - updates local state immediately (position + heading + accuracy),
 *  - posts to the journey API only when it matters (≥ POST_MIN_INTERVAL_MS
 *    AND ≥ POST_MIN_DISTANCE_M of movement) — honest, throttled pings.
 *
 * Heading comes from the device (coords.heading, degrees clockwise from
 * true north) and is null when the device does not report one — the UI
 * falls back to a stable, non-directional marker. NEVER fabricated.
 *
 * States: 'off' | 'starting' | 'live' | 'denied' | 'unavailable' | 'error'
 * Never throws; consumers render honest states.
 */

const WATCH_TIMEOUT_MS = 15000
const POST_MIN_INTERVAL_MS = 10000
const POST_MIN_DISTANCE_M = 30

export function useLiveJourneyTracking({ enabled, postPosition }) {
  const [status, setStatus] = useState('off')
  const [position, setPosition] = useState(null)
  const [heading, setHeading] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const watchIdRef = useRef(null)
  const lastPostRef = useRef(null) // { at, lat, lng }
  const postRef = useRef(postPosition)
  postRef.current = postPosition

  const stop = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    setStatus('off')
  }, [])

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
        const { latitude, longitude, accuracy: acc, heading: rawHeading } = pos.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

        const fix = {
          lat: latitude,
          lng: longitude,
          accuracy: Number.isFinite(acc) ? acc : null,
          heading: Number.isFinite(rawHeading) ? rawHeading : null,
          at: Date.now(),
        }
        setPosition({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy })
        setHeading(fix.heading)
        setAccuracy(fix.accuracy)
        setStatus('live')

        // Throttled honest posting: only real movement after a cooldown.
        const last = lastPostRef.current
        const movedM = last
          ? Math.hypot((fix.lat - last.lat) * 111_320, (fix.lng - last.lng) * 111_320 * Math.cos(fix.lat * Math.PI / 180))
          : Infinity
        if (!last || (fix.at - last.at >= POST_MIN_INTERVAL_MS && movedM >= POST_MIN_DISTANCE_M)) {
          lastPostRef.current = { at: fix.at, lat: fix.lat, lng: fix.lng }
          postRef.current?.({ latitude: fix.lat, longitude: fix.lng, accuracy: fix.accuracy, heading: fix.heading, recorded_at: new Date().toISOString() })
        }
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatus('denied')
            break
          case err.POSITION_UNAVAILABLE:
            setStatus('error')
            break
          default:
            setStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: WATCH_TIMEOUT_MS, maximumAge: 2000 },
    )

    return () => {
      if (watchIdRef.current != null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [enabled, stop])

  return { status, position, heading, accuracy }
}
