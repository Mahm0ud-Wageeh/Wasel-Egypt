/**
 * Shared formatters (durations, distances). Single source of truth —
 * keep display math identical across results, home, and journey screens.
 */

export function formatDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '—'
  const mins = Math.round(Number(sec) / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatDistance(m) {
  if (m == null || Number.isNaN(Number(m))) return '—'
  const meters = Number(m)
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
