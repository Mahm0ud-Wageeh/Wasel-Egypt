export const MAX_ENTRIES = 50
const STORAGE_KEY = 'wasel.offline_queue'

let memoryStore = []

export function _readStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch (_e) {
    // Fallback to memoryStore on storage error
  }
  return memoryStore
}

export function _writeStore(entries) {
  memoryStore = Array.isArray(entries) ? entries : []
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore))
    }
  } catch (_e) {
    // Ignore storage write errors (e.g. quota or security error)
  }
}

/**
 * Enqueue a location ping payload.
 * Deduplicates on (journeyId, seq).
 * Preserves original recorded_at timestamp verbatim.
 * Caps queue at MAX_ENTRIES (FIFO eviction of oldest).
 */
export function enqueue(journeyId, seq, payload) {
  const store = _readStore()
  const exists = store.some((item) => item.journeyId === journeyId && item.seq === seq)
  if (exists) {
    return null
  }

  const clientTs = payload?.recorded_at ?? new Date().toISOString()
  const entry = {
    journeyId,
    seq,
    payload: { ...payload },
    clientTs,
    queuedAt: new Date().toISOString(),
  }

  store.push(entry)

  while (store.length > MAX_ENTRIES) {
    store.shift()
  }

  _writeStore(store)
  return entry
}

/**
 * Acknowledge an entry as sent, removing it from the queue.
 */
export function ack(journeyId, seq) {
  const store = _readStore()
  const filtered = store.filter((item) => !(item.journeyId === journeyId && item.seq === seq))
  _writeStore(filtered)
}

/**
 * Get queued items oldest-first.
 * Optionally filtered by journeyId.
 */
export function getQueue(journeyId) {
  const store = _readStore()
  if (journeyId !== undefined && journeyId !== null) {
    return store.filter((item) => item.journeyId === journeyId)
  }
  return store
}

/**
 * Build the wire payload for a queued entry: original fix fields verbatim
 * plus the entry's sequence as client_seq, so the server can deduplicate a
 * live ping that timed out on the wire but was recorded anyway.
 */
export function queuedPayload(item) {
  return { ...(item?.payload ?? {}), client_seq: item?.seq ?? null };
}

/**
 * Get total number of queued items.
 */
export function queueSize() {
  return _readStore().length
}

/**
 * Clear queue for a given journeyId, or completely if no journeyId passed.
 */
export function clearQueue(journeyId) {
  if (journeyId !== undefined && journeyId !== null) {
    const store = _readStore()
    const remaining = store.filter((item) => item.journeyId !== journeyId)
    _writeStore(remaining)
  } else {
    _writeStore([])
  }
}
