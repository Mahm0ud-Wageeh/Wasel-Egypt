import { useState, useEffect } from 'react'
import type { Screen, Lang } from '../App'
import { fetchMyJourneys } from '../api/journeys'
import { ModeBadge } from '../components/icons'
import { Star, Map as MapIcon, Plus, X } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
  mode?: 'history' | 'saved'
}

interface LocalSavedTrip {
  id: number
  from: string
  to: string
  duration?: number
  fare?: number
  savedAt?: string
}

function loadLocalSaved(): LocalSavedTrip[] {
  try {
    const raw = JSON.parse(localStorage.getItem('wasel.saved_trips') || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

const MODE_LABELS: Record<string, { ar: string; en: string }> = {
  metro: { ar: 'مترو', en: 'Metro' },
  lrt: { ar: 'LRT', en: 'LRT' },
  brt: { ar: 'BRT', en: 'BRT' },
  bus: { ar: 'أوتوبيس', en: 'Bus' },
  train: { ar: 'قطار', en: 'Rail' },
  monorail: { ar: 'مونوريل', en: 'Monorail' },
  walking: { ar: 'مشي', en: 'Walk' },
}

export default function JourneyHistoryScreen({ lang, t, nav, darkMode, mode = 'history' }: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>(mode)
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled'>('all')
  const [serverJourneys, setServerJourneys] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [saved, setSaved] = useState<LocalSavedTrip[]>([])

  useEffect(() => { setActiveTab(mode) }, [mode])

  useEffect(() => {
    let alive = true
    setHistoryLoading(true)
    fetchMyJourneys()
      .then(list => { if (alive) setServerJourneys(list) })
      .finally(() => { if (alive) setHistoryLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (activeTab === 'saved') setSaved(loadLocalSaved())
  }, [activeTab])

  const removeSaved = (id: number) => {
    setSaved(prev => {
      const next = prev.filter(s => s.id !== id)
      try { localStorage.setItem('wasel.saved_trips', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
  const tabBg = darkMode ? 'bg-neutral-800' : 'bg-neutral-100'

  const filteredHistory = serverJourneys.filter(j =>
    filterStatus === 'all' || String(j.status ?? 'completed') === filterStatus
  )

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className={`${headerBg} border-b sticky top-0 z-30 px-4 py-4`}>
        <h1 className={`text-xl font-bold ${textPrimary} mb-3`}>
          {t('رحلاتي', 'My Journeys')}
        </h1>
        <div className={`flex gap-1 ${tabBg} rounded-xl p-1`}>
          {[
            { id: 'history', ar: 'السجل', en: 'History' },
            { id: 'saved', ar: 'محفوظة', en: 'Saved' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${activeTab === tab.id ? (darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900 shadow-sm') : textSecondary}`}>
              {lang === 'ar' ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {activeTab === 'history' && (
          <div>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'all', ar: 'الكل', en: 'All' },
                { id: 'completed', ar: 'مكتملة', en: 'Completed' },
                { id: 'cancelled', ar: 'ملغاة', en: 'Cancelled' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterStatus(f.id as any)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${filterStatus === f.id ? 'bg-blue-600 text-white border-blue-600' : (darkMode ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-white text-neutral-600 border-neutral-200')}`}>
                  {lang === 'ar' ? f.ar : f.en}
                </button>
              ))}
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16 gap-2">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className={`text-xs ${textSecondary}`}>{t('جاري تحميل السجل…', 'Loading history…')}</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <EmptyState
                icon={<MapIcon size={30} className={darkMode ? 'text-neutral-500' : 'text-neutral-400'} />}
                title={t('لا توجد رحلات', 'No journeys')}
                body={t('سجّل الدخول وابدأ رحلة وستظهر هنا — لا نعرض أي بيانات وهمية.', 'Sign in and start a journey and it will appear here — no placeholder data.')}
                actionLabel={t('خطط رحلة', 'Plan a journey')}
                onAction={() => nav('planner')}
                darkMode={darkMode}
              />
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((j: any) => {
                  const status = String(j.status ?? 'completed')
                  const modes: string[] = Array.isArray(j.modes) ? j.modes : j.legs?.map((l: any) => l.mode ?? l.type) ?? []
                  return (
                    <div key={j.id} className={`${cardBg} border rounded-2xl overflow-hidden`}>
                      <div className={`h-1 ${status === 'completed' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs ${textSecondary}`}>
                            {j.created_at ? new Date(j.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {status === 'completed' ? t('مكتملة', 'Completed') : t('ملغاة', 'Cancelled')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
                            <div className="w-px h-4 bg-neutral-200" />
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${textPrimary}`}>{j.origin_name ?? j.from ?? ''}</p>
                            {j.duration_min != null && <p className={`text-xs ${textSecondary} my-1`}>{j.duration_min} {t('دقيقة', 'min')}</p>}
                            <p className={`text-sm font-semibold ${textPrimary}`}>{j.destination_name ?? j.to ?? ''}</p>
                          </div>
                          {j.fare_egp != null && (
                            <div className="text-end">
                              <p className={`text-lg font-black ${textPrimary}`}>{j.fare_egp} <span className={`text-xs font-normal ${textSecondary}`}>{t('ج', 'EGP')}</span></p>
                            </div>
                          )}
                        </div>

                        {modes.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            {modes.map((m, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <ModeBadge mode={m} label={lang === 'ar' ? (MODE_LABELS[m]?.ar ?? m) : (MODE_LABELS[m]?.en ?? m)} />
                                {i < modes.length - 1 && <span className={`text-xs ${textSecondary}`}>›</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {status === 'completed' && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => nav('planner')}
                              className="flex-1 text-xs font-semibold py-2 rounded-xl bg-blue-600 text-white">
                              {t('كرّر الرحلة', 'Repeat Journey')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            <button onClick={() => nav('planner')}
              className={`w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 mb-4 transition-colors ${darkMode ? 'border-neutral-700 text-neutral-500 hover:border-neutral-600' : 'border-neutral-200 text-neutral-400 hover:border-blue-300'}`}>
              <Plus size={18} />
              <span className="text-sm font-medium">{t('إضافة رحلة محفوظة', 'Add saved trip')}</span>
            </button>

            {saved.length === 0 ? (
              <EmptyState
                icon={<MapIcon size={30} className={darkMode ? 'text-neutral-500' : 'text-neutral-400'} />}
                title={t('لا رحلات محفوظة', 'No saved trips')}
                body={t('احفظ أي مسار من شاشة التخطيط بزر الحفظ وستجده هنا.', 'Save any route from the planner and find it here.')}
                actionLabel={t('خطط رحلة', 'Plan a journey')}
                onAction={() => nav('planner')}
                darkMode={darkMode}
              />
            ) : (
              <div className="space-y-3">
                {saved.map(trip => (
                  <div key={trip.id} className={`${cardBg} border rounded-2xl p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-sm font-bold ${textPrimary}`}>{trip.from} → {trip.to}</h3>
                      <button onClick={() => removeSaved(trip.id)} className={`hover:text-red-500 transition-colors ${textSecondary}`} aria-label={t('حذف', 'Delete')}>
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${textSecondary}`}>
                        {trip.duration != null ? `${trip.duration} ${t('دقيقة', 'min')}` : ''}{trip.fare ? ` · ${trip.fare} ${t('ج', 'EGP')}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${textSecondary}`}>
                          {trip.savedAt ? new Date(trip.savedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                        </span>
                        <button onClick={() => nav('planner')}
                          className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-xl">
                          {t('ابدأ', 'Go')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, body, actionLabel, onAction, darkMode }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
        {icon}
      </div>
      <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{title}</h3>
      <p className={`text-sm mb-6 max-w-xs ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>{body}</p>
      <button onClick={onAction} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl text-sm">
        {actionLabel}
      </button>
    </div>
  )
}
