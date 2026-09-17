import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { TramFront, TriangleAlert, CircleCheck, Ticket, Info, Clock3, Zap, ArrowLeftRight } from 'lucide-react'
import { MODE_COLORS } from '../components/icons'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

// Verified LRT stations (12) — Ministry of Transport / Al-Masry Al-Youm, Sep 2026.
const lrtStations = [
  { id: 1, name_ar: 'عدلي منصور', name_en: 'Adly Mansour', zone: 1, isInterchange: true, interchangeWith_ar: 'مترو خط ٣ + BRT + قطار السويس', interchangeWith_en: 'Metro L3 + BRT + Suez rail' },
  { id: 2, name_ar: 'العبور', name_en: 'Obour', zone: 1, isInterchange: false },
  { id: 3, name_ar: 'المستقبل', name_en: 'Mostakbal', zone: 1, isInterchange: false },
  { id: 4, name_ar: 'الشروق', name_en: 'El Shorouk', zone: 2, isInterchange: false },
  { id: 5, name_ar: 'نيو هليوبوليس', name_en: 'New Heliopolis', zone: 2, isInterchange: false },
  { id: 6, name_ar: 'بدر', name_en: 'Badr', zone: 2, isInterchange: false },
  { id: 7, name_ar: 'الروبيكي', name_en: 'El Roubiki', zone: 2, isInterchange: false },
  { id: 8, name_ar: 'حدائق العاصمة', name_en: 'Capital Gardens', zone: 3, isInterchange: false },
  { id: 9, name_ar: 'مطار العاصمة', name_en: 'Capital Airport', zone: 3, isInterchange: false },
  { id: 10, name_ar: 'مدينة الفنون والثقافة', name_en: 'Arts & Culture City', zone: 3, isInterchange: false },
  { id: 11, name_ar: 'المنطقة الصناعية', name_en: 'Industrial Zone', zone: 3, isInterchange: false },
  { id: 12, name_ar: 'مدينة المعرفة (العبور الجديدة)', name_en: 'Knowledge City (New Obour)', zone: 3, isInterchange: false },
]

const alerts = [
  { id: 1, type: 'info', msg_ar: 'خدمة LRT تعمل بشكل طبيعي على جميع المحطات', msg_en: 'LRT service operating normally at all stations' },
  { id: 2, type: 'warning', msg_ar: 'ازدحام في محطة عدلي منصور — التبادل مع المترو مكتظ', msg_en: 'Crowding at Adly Mansour — Metro interchange busy' },
]

export default function LRTScreen({ lang, t, nav, darkMode }: Props) {
  const [tab, setTab] = useState<'overview' | 'stations' | 'fares'>('overview')

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
  const COLOR = MODE_COLORS.lrt

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`${headerBg} border-b sticky top-0 z-30`}>
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => nav('network')} className={`${darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'} transition-colors`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLOR }}>
                <TramFront size={18} className="text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary}`}>{t('القطار الخفيف LRT', 'Cairo LRT')}</h1>
                <p className={`text-xs ${textSecondary}`}>{t('عدلي منصور ← العاصمة الإدارية', 'Adly Mansour ← New Capital')}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {(['overview', 'stations', 'fares'] as const).map(tab_ => (
              <button key={tab_} onClick={() => setTab(tab_)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${tab === tab_ ? 'border-emerald-600 text-emerald-600' : `border-transparent ${textSecondary}`}`}>
                {tab_ === 'overview' ? t('نظرة عامة', 'Overview') : tab_ === 'stations' ? t('المحطات', 'Stations') : t('التعرفة', 'Fares')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-6">
        {tab === 'overview' && (
          <div>
            {/* Line map */}
            <div className={`mt-4 mb-4 ${cardBg} border rounded-2xl overflow-hidden`}>
              <div className="px-4 py-3 border-b border-neutral-200/30">
                <p className={`text-sm font-semibold ${textPrimary}`}>{t('خريطة الخط', 'Line Map')}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900">
                <svg viewBox="0 0 300 80" className="w-full">
                  <line x1="20" y1="40" x2="280" y2="40" stroke={COLOR} strokeWidth="4" strokeLinecap="round" />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
                    const x = 20 + (i * 24)
                    const isEnd = i === 0 || i === 11
                    const isInterchange = i === 0 || i === 11
                    return (
                      <g key={i}>
                        <circle cx={x} cy="40" r={isEnd ? 7 : isInterchange ? 6 : 4}
                          fill={isEnd ? COLOR : 'white'} stroke={COLOR} strokeWidth="2" />
                        {i % 3 === 0 && (
                          <text x={x} y="62" textAnchor="middle" fontSize="6"
                            className="fill-emerald-900 dark:fill-emerald-200">
                            {i === 0 ? (lang === 'ar' ? 'عدلي منصور' : 'Adly M.') :
                             i === 6 ? (lang === 'ar' ? 'العاصمة' : 'Capital') :
                             i === 9 ? (lang === 'ar' ? 'م.ناصر' : 'Nasser') :
                             i === 11 ? (lang === 'ar' ? 'CBD' : 'CBD') : ''}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { v: '21', l_ar: 'محطة', l_en: 'stations' },
                { v: '98', l_ar: 'كيلومتر', l_en: 'km' },
                { v: '35', l_ar: 'دقيقة رحلة', l_en: 'min trip' },
              ].map((s, i) => (
                <div key={i} className={`${cardBg} border rounded-xl p-3 text-center`}>
                  <p className="text-xl font-bold" style={{ color: COLOR }}>{s.v}</p>
                  <p className={`text-xs ${textSecondary}`}>{lang === 'ar' ? s.l_ar : s.l_en}</p>
                </div>
              ))}
            </div>

            {/* Alerts */}
            <h3 className={`text-sm font-semibold ${textSecondary} mb-3`}>{t('التنبيهات', 'Alerts')}</h3>
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className={`rounded-xl p-3 flex items-start gap-3 border ${a.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'}`}>
                  {a.type === 'warning' ? <TriangleAlert size={19} className="text-amber-600 flex-shrink-0" /> : <CircleCheck size={19} className="text-emerald-600 flex-shrink-0" />}
                  <p className={`text-sm ${a.type === 'warning' ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                    {lang === 'ar' ? a.msg_ar : a.msg_en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'stations' && (
          <div className="mt-4">
            <div className="relative ps-6">
              {/* Vertical line */}
              <div className="absolute start-2.5 top-3 bottom-3 w-0.5" style={{ background: COLOR }} />
              <div className="space-y-3">
                {lrtStations.map((station, i) => (
                  <div key={station.id} className="relative flex items-start gap-3">
                    <div className={`absolute -start-3.5 mt-3 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 ${station.isInterchange ? 'w-5 h-5 -start-4' : ''}`}
                      style={{ background: station.isInterchange ? COLOR : 'white', borderColor: COLOR }}>
                      {station.isInterchange && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className={`${cardBg} border rounded-xl p-3 flex-1`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? station.name_ar : station.name_en}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-500'}`}>
                          {t('نطاق', 'Zone')} {station.zone}
                        </span>
                      </div>
                      {station.isInterchange && (
                        <p className="text-xs mt-1" style={{ color: COLOR }}>
                          <ArrowLeftRight size={12} className="inline me-1" /> {lang === 'ar' ? station.interchangeWith_ar : station.interchangeWith_en}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'fares' && (
          <div className="mt-4">
            <div className={`${cardBg} border rounded-2xl p-5 mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40">
                  <Ticket size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary}`}>{t('التعرفة الرسمية لقطار العاصمة LRT', 'Official Capital LRT Tariff')}</h3>
                  <p className={`text-[11px] ${textSecondary}`}>{t('وزارة النقل — التشغيل ٦ صباحاً حتى ١١ مساءً • تقاطر الذروة كل ١٠ دقائق', 'Ministry of Transport — 6 AM to 11 PM • peak headway ~10 min')}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { ar: 'حتى ٣ محطات (اشتراك شهري ٣٠٠ ج)', en: 'Up to 3 stations (monthly 300 EGP)', fare: '١٠ ج' },
                  { ar: 'حتى ٧ محطات (اشتراك شهري ٥٠٠ ج)', en: 'Up to 7 stations (monthly 500 EGP)', fare: '١٥ ج' },
                  { ar: 'أكثر من ٧ محطات (اشتراك شهري ٦٠٠ ج)', en: 'More than 7 stations (monthly 600 EGP)', fare: '٢٠ ج' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <span className={`font-semibold ${textPrimary}`}>{lang === 'ar' ? r.ar : r.en}</span>
                    <span className={`font-black text-base ${textPrimary}`}>{r.fare}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
