import { createContext, useContext, useMemo, useState } from 'react'

/**
 * Journey search state — survives navigation between /search and
 * /journeys/results, survives page refresh via sessionStorage.
 */
const JourneyContext = createContext(null)

const SEARCH_KEY = 'wasel.journey.search'
const RESULTS_KEY = 'wasel.journey.results'
const SAVED_KEY = 'wasel.journey.lastSaved'

const read = (key) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function JourneyProvider({ children }) {
  const [searchParams, setSearchParams] = useState(() => read(SEARCH_KEY) ?? null)
  const [searchResults, setSearchResults] = useState(() => read(RESULTS_KEY) ?? null)
  const [lastSavedJourney, setLastSavedJourney] = useState(() => read(SAVED_KEY) ?? null)

  const storeSearch = (params) => {
    setSearchParams(params)
    try { sessionStorage.setItem(SEARCH_KEY, JSON.stringify(params)) } catch {}
  }

  const storeResults = (results) => {
    setSearchResults(results)
    try {
      if (results) sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results))
      else sessionStorage.removeItem(RESULTS_KEY)
    } catch { /* ignore */ }
  }

  const storeSaved = (journey) => {
    setLastSavedJourney(journey)
    try { sessionStorage.setItem(SAVED_KEY, JSON.stringify(journey)) } catch {}
  }

  const clearJourney = () => {
    storeSearch(null)
    storeResults(null)
    storeSaved(null)
  }

  const value = useMemo(() => ({
    searchParams,
    storeSearch,
    searchResults,
    storeResults,
    lastSavedJourney,
    storeSaved,
    clearJourney,
  }), [searchParams, searchResults, lastSavedJourney])

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
}

export function useJourneyContext() {
  const ctx = useContext(JourneyContext)
  if (!ctx) throw new Error('useJourneyContext must be used inside <JourneyProvider>')
  return ctx
}
