import React, { useEffect, useState } from 'react'
import { MapPin, X, Navigation, Flag, Radio } from 'lucide-react'
import type { Lang } from '../../App'
import { fetchStopDetail, fetchStopDepartures, ApiStop, ApiDeparture } from '../../api/stops'
import { fetchStopLive, formatFreshness, StopLive } from '../../api/crowd'

interface Props {
  stop: { id: number | string; name: string; lat?: number; lng?: number } | null
  onClose: () => void
  onSelectOrigin: (stop: { id: number | string; name: string; lat?: number; lng?: number }) => void
  onSelectDestination: (stop: { id: number | string; name: string; lat?: number; lng?: number }) => void
  lang: Lang
  t: (ar: string, en: string) => string
}

export default function StopPanel({
  stop,
  onClose,
  onSelectOrigin,
  onSelectDestination,
  lang,
  t,
}: Props) {
  const [detail, setDetail] = useState<any>(null)
  const [departures, setDepartures] = useState<ApiDeparture[]>([])
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState<StopLive | null>(null)

  useEffect(() => {
    if (!stop?.id) {
      setDetail(null)
      setDepartures([])
      return
    }

    setLoading(true)
    let active = true

    Promise.allSettled([
      fetchStopDetail(stop.id),
      fetchStopDepartures(stop.id, 4),
    ]).then(([detailRes, depRes]) => {
      if (!active) return
      if (detailRes.status === 'fulfilled' && detailRes.value?.data) {
        setDetail(detailRes.value.data)
      }
      if (depRes.status === 'fulfilled' && depRes.value?.departures) {
        setDepartures(depRes.value.departures)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [stop?.id])

  // Live crowdsourced presence (public, anonymous counts; refreshes every 30s)
  useEffect(() => {
    if (stop?.id == null || !Number.isFinite(Number(stop.id))) {
      setLive(null)
      return
    }
    let active = true
    const load = async () => {
      const data = await fetchStopLive(stop.id)
      if (active) setLive(data)
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [stop?.id])

  if (!stop) return null

  const lines = detail?.serving_routes || []

  return (
    <div className="absolute bottom-4 inset-x-4 sm:start-4 sm:end-auto sm:w-96 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-30 p-4 animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <MapPin size={19} />
          </div>
          <div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white leading-tight">
              {stop.name}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {detail?.area?.name || t('محطة ركاب معتمدة', 'Verified Station')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
          aria-label={t('إغلاق', 'Close')}
        >
          <X size={13} />
        </button>
      </div>

      {/* Serving Routes / Lines */}
      {lines.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            {t('الخطوط التي تخدم المحطة', 'Serving Lines')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lines.map((r: any, idx: number) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
              >
                {r.short_name || r.name || r.code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live crowdsourced presence */}
      {live && live.riders_nearby > 0 && (
        <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <Radio size={14} className="text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-[11px] font-bold text-green-700 dark:text-green-300">
            {t('مباشر الآن:', 'Live now:')} {live.riders_nearby} {t('راكب يشارك موقعه بالقرب', 'riders sharing nearby')}
            {live.freshest_ping_seconds_ago != null && (
              <span className="font-normal"> · {formatFreshness(live.freshest_ping_seconds_ago, t)}</span>
            )}
          </p>
        </div>
      )}

      {/* Live Departures */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            ⏱️ {t('الرحلات والمغادرات القادمة', 'Upcoming Departures')}
          </p>
          {loading && (
            <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {departures.length > 0 ? (
          <div className="space-y-1.5">
            {departures.map((dep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-bold text-neutral-800 dark:text-white">
                    {dep.headsign || dep.route_long_name || t('رحلة مجدولة', 'Scheduled')}
                  </span>
                </div>
                <span className="font-black text-blue-600 dark:text-blue-400">
                  {dep.minutes_until != null
                    ? `${dep.minutes_until} ${t('دقيقة', 'min')}`
                    : t('قريباً', 'Soon')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-xl">
            {t('المواعيد الدقيقة متاحة حسب جدول التشغيل اليومي', 'Schedules operate according to daily timetables')}
          </p>
        )}
      </div>

      {/* Action Buttons: Plan From / Plan To */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSelectOrigin(stop)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Navigation size={14} />
          <span>{t('انطلق من هنا', 'From Here')}</span>
        </button>

        <button
          onClick={() => onSelectDestination(stop)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-black transition-all active:scale-95"
        >
          <Flag size={14} />
          <span>{t('الوجهة إلى هنا', 'To Here')}</span>
        </button>
      </div>
    </div>
  )
}
