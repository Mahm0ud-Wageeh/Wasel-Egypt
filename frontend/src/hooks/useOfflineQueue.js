import { useState, useEffect, useCallback, useRef } from 'react'
import {
  enqueue as enqueueStore,
  ack as ackStore,
  getQueue,
  queuedPayload,
} from '../utils/offlineQueue'

/**
 * Hook for managing the offline location ping queue during an active journey.
 *
 * Flush triggers:
 * 1. window 'online' event
 * 2. After every successful postFix (via notifySuccess)
 * 3. Every 30s while queue is non-empty
 *
 * On 4xx (404/422/403) drops entry and continues to next.
 * On network errors / 5xx / 429 stops and retries later.
 * Original recorded_at / clientTs timestamp is preserved verbatim.
 */
export function useOfflineQueue({ journeyId, poster } = {}) {
  const [queuedCount, setQueuedCount] = useState(() =>
    journeyId ? getQueue(journeyId).length : 0
  )
  const [syncedCount, setSyncedCount] = useState(0)

  const seqRef = useRef(0)
  const isFlushingRef = useRef(false)
  const posterRef = useRef(poster)
  posterRef.current = poster

  // Update queued count whenever journeyId changes
  useEffect(() => {
    if (journeyId) {
      const initialQueue = getQueue(journeyId)
      setQueuedCount(initialQueue.length)
      if (initialQueue.length > 0) {
        // Init seqRef to avoid collisions with any existing items
        const maxSeq = Math.max(0, ...initialQueue.map((item) => item.seq || 0))
        seqRef.current = maxSeq
      }
    } else {
      setQueuedCount(0)
    }
  }, [journeyId])

  const flush = useCallback(async () => {
    if (!journeyId || !posterRef.current || isFlushingRef.current) return
    const queue = getQueue(journeyId)
    if (queue.length === 0) {
      setQueuedCount(0)
      return
    }

    isFlushingRef.current = true
    try {
      for (const item of queue) {
        try {
          // Wire the entry seq as client_seq: a live ping that timed out
          // after being recorded is deduped server-side on retry.
          await posterRef.current(queuedPayload(item))
          ackStore(item.journeyId, item.seq)
          setSyncedCount((c) => c + 1)
        } catch (err) {
          const status = err?.status ?? err?.response?.status ?? err?.statusCode
          if (status && status >= 400 && status < 500 && status !== 429) {
            // 4xx error (400, 404, 422, etc): drop entry and continue to next
            ackStore(item.journeyId, item.seq)
          } else {
            // Network error, 5xx, or 429: stop flushing and retry later
            break
          }
        }
      }
    } finally {
      isFlushingRef.current = false
      setQueuedCount(getQueue(journeyId).length)
    }
  }, [journeyId])

  const enqueue = useCallback(
    (payload, seq = null) => {
      if (!journeyId) return null
      // A pre-allocated seq (same one sent on the live attempt) keeps the
      // live POST and its queued retry deduplicated as one server row.
      let entrySeq = seq
      if (entrySeq == null) {
        if (seqRef.current === 0) {
          const existing = getQueue(journeyId)
          seqRef.current = existing.length > 0
            ? Math.max(0, ...existing.map((item) => item.seq || 0))
            : 0
        }
        seqRef.current += 1
        entrySeq = seqRef.current
      }
      const item = enqueueStore(journeyId, entrySeq, payload)
      setQueuedCount(getQueue(journeyId).length)
      return item
    },
    [journeyId]
  )

  // Allocate the next sequence WITHOUT enqueueing: callers stamp it on the
  // live POST first, so a timeout-then-retry carries the same seq end to end.
  const allocateSeq = useCallback(() => {
    if (!journeyId) return null
    if (seqRef.current === 0) {
      const existing = getQueue(journeyId)
      seqRef.current = existing.length > 0
        ? Math.max(0, ...existing.map((item) => item.seq || 0))
        : 0
    }
    seqRef.current += 1
    return seqRef.current
  }, [journeyId])

  const notifySuccess = useCallback(() => {
    if (journeyId && getQueue(journeyId).length > 0) {
      flush()
    }
  }, [journeyId, flush])

  // Trigger 1: window online event
  useEffect(() => {
    const handleOnline = () => {
      flush()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }
  }, [flush])

  // Trigger 3: Every 30s while queue non-empty
  useEffect(() => {
    if (!journeyId || queuedCount === 0) return
    const interval = setInterval(() => {
      if (getQueue(journeyId).length > 0) {
        flush()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [journeyId, queuedCount, flush])

  return {
    enqueue,
    allocateSeq,
    notifySuccess,
    flush,
    queuedCount,
    syncedCount,
  }
}
