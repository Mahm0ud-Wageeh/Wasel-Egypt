import { apiRequest } from './client'

const CONSENT_KEY = 'wasel.crowd.consent.v1'

export type CrowdConsent = 'granted' | 'denied' | 'undecided'

export function getCrowdConsent(): CrowdConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    if (v === 'granted' || v === 'denied') return v
  } catch { /* ignore */ }
  return 'undecided'
}

export function setCrowdConsent(v: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, v)
  } catch { /* ignore */ }
}

export interface StopLive {
  stop_id: number | string
  riders_nearby: number
  pings: number
  freshest_ping_seconds_ago: number | null
  window_minutes: number
  radius_meters: number
  generated_at?: string
}

/** Anonymized live presence near a stop. Null when unavailable (never invented). */
export async function fetchStopLive(stopId: number | string): Promise<StopLive | null> {
  try {
    const res = await apiRequest<any>(`/stops/${stopId}/live`, { method: 'GET', auth: false })
    const d = res?.data ?? res
    if (!d || typeof d.riders_nearby !== 'number') return null
    return d as StopLive
  } catch {
    return null
  }
}

export function formatFreshness(secondsAgo: number | null, t: (ar: string, en: string) => string): string {
  if (secondsAgo == null) return ''
  if (secondsAgo < 60) return t('منذ لحظات', 'just now')
  const m = Math.round(secondsAgo / 60)
  return t(`منذ ${m} د`, `${m}m ago`)
}
