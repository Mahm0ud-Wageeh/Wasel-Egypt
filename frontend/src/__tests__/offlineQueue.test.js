import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  enqueue,
  ack,
  getQueue,
  queueSize,
  clearQueue,
  MAX_ENTRIES,
  _readStore,
  _writeStore,
} from '../utils/offlineQueue'

// Helper: build a minimal payload with a given recorded_at so we can assert it is preserved verbatim.
function mkPayload(ts, lat = 30.0, lng = 31.0) {
  return { latitude: lat, longitude: lng, speed: 1.4, accuracy: 10, heading: null, recorded_at: ts }
}

describe('offlineQueue — store primitives', () => {
  beforeEach(() => {
    // Start from a clean slate each test
    _writeStore([])
  })

  afterEach(() => {
    _writeStore([])
  })

  it('enqueues entries and getQueue returns them oldest-first', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(1, 1, mkPayload('2026-09-16T09:00:10Z'))
    enqueue(1, 2, mkPayload('2026-09-16T09:00:20Z'))

    const q = getQueue(1)
    expect(q.length).toBe(3)
    expect(q[0].seq).toBe(0) // oldest first
    expect(q[1].seq).toBe(1)
    expect(q[2].seq).toBe(2)
  })

  it('preserves payload.recorded_at verbatim — does not re-stamp', () => {
    const ts = '2026-09-16T09:00:05.123Z'
    enqueue(42, 0, mkPayload(ts))
    const q = getQueue(42)
    expect(q[0].payload.recorded_at).toBe(ts)
    expect(q[0].clientTs).toBe(ts)
  })

  it('evicts oldest entries when cap exceeded (MAX_ENTRIES = 50)', () => {
    // Fill to cap
    for (let i = 0; i < MAX_ENTRIES; i++) {
      enqueue(1, i, mkPayload(`2026-09-16T09:00:${String(i).padStart(2, '0')}Z`))
    }
    expect(queueSize()).toBe(MAX_ENTRIES)

    // Add one more — oldest (seq 0) must be evicted
    enqueue(1, MAX_ENTRIES, mkPayload('2026-09-16T09:01:00Z'))
    expect(queueSize()).toBe(MAX_ENTRIES)

    const q = getQueue(1)
    expect(q[0].seq).toBe(1) // seq 0 evicted
    expect(q[q.length - 1].seq).toBe(MAX_ENTRIES)
  })

  it('FIFO: first entry is always oldest after cap eviction', () => {
    const OVER = MAX_ENTRIES + 5
    for (let i = 0; i < OVER; i++) {
      enqueue(1, i, mkPayload('2026-09-16T09:00:00Z'))
    }
    const q = getQueue(1)
    expect(q.length).toBe(MAX_ENTRIES)
    // After 5 evictions the oldest remaining seq is 5
    expect(q[0].seq).toBe(5)
  })

  it('ack removes the acknowledged entry and does not double-remove', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(1, 1, mkPayload('2026-09-16T09:00:10Z'))

    ack(1, 0)
    const q = getQueue(1)
    expect(q.length).toBe(1)
    expect(q[0].seq).toBe(1)

    // Calling ack again on an already-acked entry is a no-op
    expect(() => ack(1, 0)).not.toThrow()
    expect(getQueue(1).length).toBe(1)
  })

  it('deduplicate: enqueue returns null for duplicate (journeyId, seq)', () => {
    enqueue(1, 5, mkPayload('2026-09-16T09:00:00Z'))
    const result = enqueue(1, 5, mkPayload('2026-09-16T09:00:01Z'))
    expect(result).toBeNull()
    expect(getQueue(1).length).toBe(1)
    // Original payload preserved
    expect(getQueue(1)[0].payload.recorded_at).toBe('2026-09-16T09:00:00Z')
  })

  it('getQueue filters by journeyId correctly', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(2, 0, mkPayload('2026-09-16T09:00:01Z'))
    enqueue(1, 1, mkPayload('2026-09-16T09:00:02Z'))

    expect(getQueue(1).length).toBe(2)
    expect(getQueue(2).length).toBe(1)
    // No journeyId returns all
    expect(getQueue().length).toBe(3)
  })

  it('clearQueue(journeyId) removes only that journey', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(2, 0, mkPayload('2026-09-16T09:00:01Z'))

    clearQueue(1)
    expect(getQueue(1).length).toBe(0)
    expect(getQueue(2).length).toBe(1)
  })

  it('clearQueue() with no arg wipes all journeys', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(2, 0, mkPayload('2026-09-16T09:00:01Z'))

    clearQueue()
    expect(queueSize()).toBe(0)
  })

  it('queueSize counts all entries across journeys', () => {
    enqueue(1, 0, mkPayload('2026-09-16T09:00:00Z'))
    enqueue(2, 0, mkPayload('2026-09-16T09:00:01Z'))
    enqueue(2, 1, mkPayload('2026-09-16T09:00:02Z'))
    expect(queueSize()).toBe(3)
  })
})
