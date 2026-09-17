import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { CableCar, Ruler, Info, Ticket, AlertCircle, ArrowLeft, ArrowRight, Clock, MapPin, CheckCircle } from 'lucide-react'
import { MODE_COLORS } from '../components/icons'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

// Verified East Nile stations (order: Stadium → Justice City).
// Phase 2 (6, opened 27 Jun 2026) + key Phase-1 anchors — Egyptian Streets / Ahram, Jun 2026.
const eastLine = {
  id: 'east',
  name_ar: 'مونوريل شرق النيل (الاستاد — مدينة العدالة)',
  name_en: 'East Nile Monorail (Stadium — Justice City)',
  color: MODE_COLORS.monorail,
  length_ar: '٥٦٫٥ كم — ٢٢ محطة (تعمل بالكامل منذ ٢٧ يونيو ٢٠٢٦)',
  length_en: '56.5 km — 22 stations (fully operating since 27 Jun 2026)',
  note_ar: 'القائمة التالية للمحطات المؤكدة من وزارة النقل — باقي محطات التجمع والعاصمة تُعرض بأسمائها الرسمية فور اعتمادها.',
  note_en: 'Stations below are MoT-confirmed — remaining New Cairo / Capital stations appear under official names once published.',
  stations: [
    { name_ar: 'الاستاد (مدينة نصر)', name_en: 'Cairo Stadium', isInterchange: false },
    { name_ar: 'هشام بركات', name_en: 'Hisham Barakat', isInterchange: false },
    { name_ar: 'جامعة الأزهر', name_en: 'Al-Azhar University', isInterchange: false },
    { name_ar: 'الحي السابع', name_en: 'Seventh District', isInterchange: false },
    { name_ar: 'المشير أحمد إسماعيل', name_en: 'Field Marshal Ahmed Ismail', isInterchange: false },
    { name_ar: 'جيهان السادات', name_en: 'Jehan El-Sadat', isInterchange: false },
    { name_ar: 'المشير طنطاوي (التجمع)', name_en: 'El-Mosheer Tantawy', isInterchange: false },
    { name_ar: 'الحي الحكومي (الوزارات)', name_en: 'Government District', isInterchange: true },
    { name_ar: 'مدينة العدالة', name_en: 'Justice City', isInterchange: false },
  ],
}

const westLine = {
  id: 'west',
  name_ar: 'مونوريل غرب النيل (الجيزة — ٦ أكتوبر)',
  name_en: 'West Nile Monorail (Giza — 6th October)',
  color: MODE_COLORS.monorail,
  length_ar: 'نحو ٤٢ كم — قيد التشغيل التجريبي',
  length_en: '~42 km — trial operations',
  note_ar: 'الخط كان مقرراً افتتاحه سبتمبر ٢٠٢٦ — قائمة المحطات الرسمية ستُنشر مع بدء التشغيل للجمهور.',
  note_en: 'Opening was scheduled Sep 2026 — official station list publishes with public launch.',
  stations: [] as { name_ar: string; name_en: string; isInterchange: boolean }[],
}

export default function MonorailScreen({ lang, t, nav, darkMode }: Props) {
  const [selectedLine, setSelectedLine] = useState<'east' | 'west'>('east')

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
  const line = selectedLine === 'east' ? eastLine : westLine
  const COLOR = MODE_COLORS.monorail

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`${headerBg} border-b sticky top-0 z-30 px-4 py-4`}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => nav('network')} className={`${darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'} transition-colors`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLOR }}>
              <CableCar size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textPrimary}`}>{t('المونوريل', 'Monorail')}</h1>
              <p className={`text-xs ${textSecondary}`}>{t('خطان — شرق وغرب النيل', '2 Lines — East & West Nile')}</p>
            </div>
          </div>
        </div>

        {/* Line selector */}
        <div className="grid grid-cols-2 gap-2">
          {[{ id: 'east', line: eastLine }, { id: 'west', line: westLine }].map(({ id, line: l }) => (
            <button key={id} onClick={() => setSelectedLine(id as 'east' | 'west')}
              className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selectedLine === id ? 'text-white' : `${textSecondary} border-neutral-200`}`}
              style={selectedLine === id ? { background: l.color, borderColor: l.color } : {}}>
              {lang === 'ar' ? (id === 'east' ? 'شرق النيل' : 'غرب النيل') : (id === 'east' ? 'East Nile' : 'West Nile')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6">
        {/* Line header */}
        <div className={`mt-4 mb-4 ${cardBg} border rounded-2xl p-4`}>
          <p className={`text-base font-bold ${textPrimary} mb-1`}>{lang === 'ar' ? line.name_ar : line.name_en}</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <Ruler size={15} className={textSecondary} />
              <span className={`text-sm ${textSecondary}`}>{lang === 'ar' ? line.length_ar : line.length_en}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CableCar size={15} className={textSecondary} />
              <span className={`text-sm ${textSecondary}`}>{line.stations.length} {t('محطة مؤكدة', 'confirmed stations')}</span>
            </div>
          </div>
          <p className={`text-[11px] mb-3 leading-relaxed ${textSecondary}`}>
            <Info size={12} className="inline me-1" />
            {lang === 'ar' ? line.note_ar : line.note_en}
          </p>

          {/* Visual line */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {line.stations.map((st, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: line.color, background: i === 0 || i === line.stations.length - 1 ? line.color : 'white' }} />
                  <p className="text-[9px] text-neutral-500 max-w-12 text-center leading-tight whitespace-nowrap">
                    {lang === 'ar' ? st.name_ar : st.name_en}
                  </p>
                </div>
                {i < line.stations.length - 1 && (
                  <div className="w-8 h-0.5 flex-shrink-0" style={{ background: line.color }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stations list */}
        <h3 className={`text-sm font-semibold ${textSecondary} mb-3`}>{t('قائمة المحطات', 'Station List')}</h3>
        <div className="relative ps-6">
          <div className="absolute start-2.5 top-3 bottom-3 w-0.5" style={{ background: line.color }} />
          <div className="space-y-3">
            {line.stations.map((station, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className={`absolute -start-3.5 mt-3 w-4 h-4 rounded-full border-2 z-10 ${station.isInterchange ? '-start-4 w-5 h-5' : ''}`}
                  style={{ background: station.isInterchange ? line.color : 'white', borderColor: line.color }}>
                  {station.isInterchange && <div className="w-2 h-2 rounded-full bg-white m-auto mt-1" />}
                </div>
                <div className={`${cardBg} border rounded-xl p-3 flex-1`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? station.name_ar : station.name_en}</p>
                    {station.isInterchange && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t('تقاطع', 'Interchange')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official fares (Ministry of Transport, effective 9 May 2026) */}
        <div className={`${cardBg} border rounded-2xl p-5 mt-6`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
              <Ticket size={24} className="text-amber-600" />
            </div>
            <div>
              <p className={`text-sm font-bold ${textPrimary}`}>{t('التعرفة الرسمية للمونوريل', 'Official Monorail Tariff')}</p>
              <p className={`text-[11px] ${textSecondary}`}>{t('وزارة النقل — سارية من ٩ مايو ٢٠٢٦ • الخط الكامل ٢٢ محطة', 'Ministry of Transport — effective 9 May 2026 • full 22-station line')}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { ar: 'حتى ٥ محطات (منطقة واحدة)', en: 'Up to 5 stations (1 zone)', fare: '٢٠ ج' },
              { ar: 'حتى ١٠ محطات (منطقتان)', en: 'Up to 10 stations (2 zones)', fare: '٤٠ ج' },
              { ar: 'حتى ١٥ محطة (٣ مناطق)', en: 'Up to 15 stations (3 zones)', fare: '٥٥ ج' },
              { ar: 'الخط الكامل (٢٢ محطة)', en: 'Full line (22 stations)', fare: '٨٠ ج' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className={`font-semibold ${textPrimary}`}>{lang === 'ar' ? r.ar : r.en}</span>
                <span className={`font-black text-base ${textPrimary}`}>{r.fare}</span>
              </div>
            ))}
          </div>
          <p className={`text-[11px] mt-3 leading-relaxed ${textSecondary}`}>
            {t('نصف التذكرة (٦٠+ وذوو الهمم): ١٠ / ٢٠ / ٣٠ / ٤٠ جنيهاً. خصم ٥٠٪ أيام الجمعة والسبت والعطلات. التشغيل يومياً ٦ ص – ٩ م.', 'Half fare (60+ & disabilities): 10 / 20 / 30 / 40 EGP. 50% off Fri/Sat & holidays. Daily 6 AM – 9 PM.')}
          </p>
        </div>
      </div>
    </div>
  )
}
