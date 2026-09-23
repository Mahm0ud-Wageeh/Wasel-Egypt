import React, { useEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { useNavigationEngine } from '../hooks/useNavigationEngine'

/**
 * Tunnel detection lives INSIDE useNavigationEngine's error callback.
 *
 * Regression: counting GPS errors from status transitions outside the hook
 * stalls at 1 — the status stays 'error' across repeated failures, so the
 * transition effect runs once and tunnel mode never engages.
 */

const GEO_CODES = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
let geoHandlers = null
let watchId = 0

function installGeolocationMock() {
  geoHandlers = null
  const mock = {
    watchPosition: vi.fn((success, error) => {
      geoHandlers = { success, error }
      watchId += 1
      return watchId
    }),
    clearWatch: vi.fn(),
  }
  vi.stubGlobal('navigator', { geolocation: mock })
  return mock
}

function successFix(overrides = {}) {
  return {
    coords: {
      latitude: 30.0444,
      longitude: 31.2357,
      accuracy: 10,
      heading: null,
      speed: 1.2,
      ...overrides,
    },
    timestamp: Date.now(),
  }
}

function errorFix(code) {
  return { code, ...GEO_CODES }
}

let latest = null
function Probe(props) {
  const engine = useNavigationEngine({ enabled: true, itinerary: null, currentLegIndex: 0, ...props })
  useEffect(() => {
    latest = engine
  })
  return null
}

function renderEngine(props) {
  latest = null
  render(<Probe {...props} />)
}

describe('useNavigationEngine tunnel detection', () => {
  beforeEach(() => {
    installGeolocationMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('engages tunnel mode after 3 consecutive GPS errors following a good fix', async () => {
    renderEngine()
    expect(geoHandlers).not.toBeNull()

    await act(async () => {
      geoHandlers.success(successFix())
    })
    expect(latest.status).toBe('live')
    expect(latest.tunnelMode).toBe(false)

    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    expect(latest.status).toBe('error')
    expect(latest.tunnelMode).toBe(false)

    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    expect(latest.tunnelMode).toBe(false)

    // Third consecutive error — tunnel engages even though status never changed.
    await act(async () => {
      geoHandlers.error(errorFix(2))
    })
    expect(latest.tunnelMode).toBe(true)
  })

  it('never tunnels on permission denial, even repeatedly', async () => {
    renderEngine()

    await act(async () => {
      geoHandlers.success(successFix())
    })

    await act(async () => {
      geoHandlers.error(errorFix(1))
    })
    await act(async () => {
      geoHandlers.error(errorFix(1))
    })
    await act(async () => {
      geoHandlers.error(errorFix(1))
    })

    expect(latest.status).toBe('denied')
    expect(latest.tunnelMode).toBe(false)
  })

  it('never tunnels when errors arrive with no prior fix', async () => {
    renderEngine()

    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    await act(async () => {
      geoHandlers.error(errorFix(3))
    })

    expect(latest.status).toBe('error')
    expect(latest.tunnelMode).toBe(false)
  })

  it('clears tunnel mode on the next good fix (auto-resume)', async () => {
    renderEngine()

    await act(async () => {
      geoHandlers.success(successFix())
    })
    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    await act(async () => {
      geoHandlers.error(errorFix(3))
    })
    expect(latest.tunnelMode).toBe(true)

    await act(async () => {
      geoHandlers.success(successFix({ latitude: 30.05 }))
    })
    expect(latest.status).toBe('live')
    expect(latest.tunnelMode).toBe(false)
  })
})
