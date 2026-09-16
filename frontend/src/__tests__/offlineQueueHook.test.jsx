import React, { useEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { _writeStore, getQueue } from '../utils/offlineQueue'

/**
 * useOfflineQueue sequence contract (server idempotency end-to-end):
 * - allocateSeq() hands out monotonic per-journey sequences without queueing.
 * - enqueue(payload, seq) reuses a pre-allocated seq (live attempt + queued
 *   retry share it, collapsing into one server row via client_seq).
 * - flush() wires each entry's seq as client_seq on the wire payload.
 */

let latest = null
function Probe({ journeyId, poster }) {
  const api = useOfflineQueue({ journeyId, poster })
  useEffect(() => {
    latest = api
  })
  return null
}

function renderHook(journeyId = 7, poster = null) {
  latest = null
  render(<Probe journeyId={journeyId} poster={poster} />)
  if (!latest) throw new Error('hook api not captured')
  return () => latest
}

function mkPayload(ts, lat = 30.0) {
  return { latitude: lat, longitude: 31.0, speed: 1.4, accuracy: 10, heading: null, recorded_at: ts }
}

describe('useOfflineQueue sequence + wire seq', () => {
  beforeEach(() => { _writeStore([]) })
  afterEach(() => { _writeStore([]); vi.restoreAllMocks() })

  it('allocateSeq is monotonic per journey', () => {
    const getApi = renderHook(7)
    expect(getApi().allocateSeq()).toBe(1)
    expect(getApi().allocateSeq()).toBe(2)
    expect(getApi().allocateSeq()).toBe(3)
  })

  it('enqueue(payload, seq) reuses the pre-allocated seq', () => {
    const getApi = renderHook(7)
    const seq = getApi().allocateSeq()
    const item = getApi().enqueue(mkPayload('2026-09-16T09:00:01.000Z'), seq)
    expect(item.seq).toBe(seq)
    const q = getQueue(7)
    expect(q).toHaveLength(1)
    expect(q[0].seq).toBe(1)
  })

  it('enqueue() without seq still allocates (legacy behavior preserved)', () => {
    const getApi = renderHook(7)
    getApi().enqueue(mkPayload('2026-09-16T09:00:01.000Z'))
    getApi().enqueue(mkPayload('2026-09-16T09:00:11.000Z'))
    expect(getQueue(7).map((e) => e.seq)).toEqual([1, 2])
  })

  it('flush sends client_seq matching each entry seq, oldest-first', async () => {
    const calls = []
    const poster = vi.fn().mockImplementation((p) => {
      calls.push({ seq: p.client_seq, ts: p.recorded_at })
      return Promise.resolve({ data: {} })
    })
    const getApi = renderHook(7, poster)
    const s1 = getApi().allocateSeq()
    const s2 = getApi().allocateSeq()
    getApi().enqueue(mkPayload('2026-09-16T09:00:01.000Z', 30.0), s1)
    getApi().enqueue(mkPayload('2026-09-16T09:00:11.000Z', 30.1), s2)

    await getApi().flush()

    expect(poster).toHaveBeenCalledTimes(2)
    expect(calls).toEqual([
      { seq: 1, ts: '2026-09-16T09:00:01.000Z' },
      { seq: 2, ts: '2026-09-16T09:00:11.000Z' },
    ])
    expect(calls[0].ts).not.toBe(calls[1].ts)
    expect(getQueue(7)).toHaveLength(0)
  })

  it('allocateSeq returns null without a journey', () => {
    const getApi = renderHook(null)
    expect(getApi().allocateSeq()).toBeNull()
  })
})
