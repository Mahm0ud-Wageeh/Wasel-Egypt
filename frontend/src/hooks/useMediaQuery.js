import { useEffect, useState } from 'react'

/**
 * useMediaQuery — tracks a CSS media query in JS.
 *
 * Used to keep rendered output in sync with CSS-gated layouts (e.g. render
 * the desktop navbar only when its breakpoint matches). The initial state
 * is read synchronously so real browsers paint correctly on first paint;
 * environments without matchMedia (jsdom) stay mobile-first.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (e) => setMatches(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    // Legacy Safari (<14) listener API.
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [query])

  return matches
}
