import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { BusFront, ArrowLeftRight, Clock, MapPin, CheckCircle, Ticket, Info, Clock3, Zap } from 'lucide-react'
import { calculateBRTTariff } from '../data/egyptTransitData'
import { MODE_COLORS } from '../components/icons'
import InteractiveMap from '../components/map/InteractiveMap'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

// Verified Phase-1 stations (14), Police Academy ↔ Alexandria Agricultural Rd,
// 35 km — Presidency of Egypt / Ministry of Transport, Jun 2025.
const phase1Stations = [
  { ar: 'أكاديمية الشرطة', en: 'Police Academy' },
  { ar: 'طريق السويس', en: 'Suez Road' },
  { ar: 'السلام', en: 'El Salam' },
  { ar: 'اللواء إبراهيم العرابي', en: 'Gen. Ibrahim El Oraby' },
  { ar: 'مؤسسة الزكاة', en: 'Zakat Foundation' },
  { ar: 'القلج', en: 'El Qalag' },
  { ar: 'المرج (تبادل مترو خط ١)', en: 'El Marg (Metro L1 interchange)', interchange: true },
  { ar: 'الخصوص', en: 'El Khosous' },
  { ar: 'مسطرد', en: 'Mostorod' },
  { ar: 'طريق شبرا – بنها', en: 'Shubra–Banha Rd' },
  { ar: 'العقيد أحمد عبد الرحيم', en: 'Col. Ahmed Abdel Rahim' },
  { ar: 'بهتيم', en: 'Bahtim' },
  { ar: 'عدلي منصور (تبادل مترو ٣ + LRT)', en: 'Adly Mansour (Metro L3 + LRT hub)', interchange: true },
  { ar: 'طريق الإسكندرية الزراعي', en: 'Alexandria Agricultural Rd' },
]

export default function BRTScreen({ lang, t, nav, darkMode }: Props) {
  const [tab, setTab] = useState<'overview' | 'stations' | 'fares'>('overview')

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
  const COLOR = MODE_COLORS.brt

  const fareTiers = [4, 9, 14].map(n => ({ count: n, ...calculateBRTTariff(n) }))

  return (
    <div className={`min-h-screen ${bg}`}>
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
                <BusFront size={18} className="text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary}`}>{t('حافلات BRT الطريق الدائري', 'Ring Road BRT')}</h1>
                <p className={`text-xs ${textSecondary}`}>{t('المرحلة الأولى تعمل منذ يونيو ٢٠٢٥', 'Phase 1 operating since Jun 2025')}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {(['overview', 'stations', 'fares'] as const).map(tab_ => (
              <button key={tab_} onClick={() => setTab(tab_)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${tab === tab_ ? 'border-cyan-600 text-cyan-600' : `border-transparent ${textSecondary}`}`}>
                {tab_ === 'overview' ? t('نظرة عامة', 'Overview') : tab_ === 'stations' ? t('محطات المرحلة الأولى', 'Phase-1 Stations') : t('التعرفة', 'Fares')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-6">
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
              {[
                { v: '14', l_ar: 'محطة تعمل', l_en: 'stations live' },
                { v: '35', l_ar: 'كم (المرحلة ١)', l_en: 'km (phase 1)' },
                { v: '100', l_ar: 'حافلة كهربائية', l_en: 'e-buses' },
              ].map((s, i) => (
                <div key={i} className={`${cardBg} border rounded-xl p-3 text-center`}>
                  <p className="text-xl font-bold" style={{ color: COLOR }}>{s.v}</p>
                  <p className={`text-xs ${textSecondary}`}>{lang === 'ar' ? s.l_ar : s.l_en}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 rounded-xl p-3 border flex items-start gap-2 bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800">
              <Info size={18} className="flex-shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-300" />
              <p className="text-xs leading-relaxed text-cyan-900 dark:text-cyan-100">
                {t('BRT يسير على ممرات مخصصة بالطريق الدائري بحافلات كهربائية مكيفة (٦٦–٧٠ راكباً) — المخطط الكامل ٤٨ محطة / ١١٣ كم على ٣ مراحل. المرحلة الثانية (٢١ محطة حتى الفيوم والمتحف الكبير) والثالثة (١٣ محطة) قيد الاستكمال.', 'Dedicated Ring-Road lanes with air-conditioned e-buses (66–70 seats) — full plan 48 stations / 113 km in 3 phases. Phase 2 (21 stations) and Phase 3 (13 stations) underway.')}
              </p>
            </div>

            <div className={`${cardBg} border rounded-2xl p-4 mb-4`}>
              <h3 className={`text-sm font-bold ${textPrimary} mb-3 flex items-center gap-2`}>
                <ArrowLeftRight size={15} style={{ color: COLOR }} />
                {t('التبادل مع الشبكة', 'Network interchanges')}
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { ar: 'المرج والزهراء — مترو خط ١', en: 'El Marg & El Zahraa — Metro Line 1' },
                  { ar: 'عدلي منصور وإمبابة — مترو خط ٣', en: 'Adly Mansour & Imbaba — Metro Line 3' },
                  { ar: 'عدلي منصور — قطار العاصمة LRT', en: 'Adly Mansour — Capital LRT' },
                ].map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 py-1.5 border-b border-neutral-100 last:border-0 ${textPrimary}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR }} />
                    {lang === 'ar' ? r.ar : r.en}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardBg} border rounded-2xl overflow-hidden mb-4 h-64`}>
              <InteractiveMap
                darkMode={darkMode}
                center={[31.35, 30.12]}
                zoom={10}
                lang={lang}
                t={t}
                className="w-full h-full"
              />
            </div>

            <div className={`${cardBg} border rounded-2xl p-4 flex items-start gap-2`}>
              <Zap size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                {t('التقاطر المعلن نحو ١٠ دقائق مع شاشات مواعيد بالمحطات. لا توجد بيانات لحظية عامة للحافلات — المواعيد المعروضة استرشادية من التشغيل التجريبي.', 'Advertised headway ~10 min with station displays. No public live bus feed — times shown are schedule-based guidance.')}
              </p>
            </div>
          </div>
        )}

        {tab === 'stations' && (
          <div className="mt-4">
            <div className="relative ps-6">
              <div className="absolute start-2.5 top-3 bottom-3 w-0.5" style={{ background: COLOR }} />
              <div className="space-y-3">
                {phase1Stations.map((st, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className={`absolute -start-3.5 mt-3 w-4 h-4 rounded-full border-2 z-10 ${st.interchange ? '-start-4 w-5 h-5' : ''}`}
                      style={{ background: st.interchange ? COLOR : 'white', borderColor: COLOR }}>
                      {st.interchange && <div className="w-2 h-2 rounded-full bg-white m-auto mt-1" />}
                    </div>
                    <div className={`${cardBg} border rounded-xl p-3 flex-1`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? st.ar : st.en}</p>
                        <span className={`text-[10px] font-mono ${textSecondary}`}>{i + 1}</span>
                      </div>
                      {st.interchange && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          {t('محطة تبادلية', 'Interchange')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className={`text-[11px] mt-4 ${textSecondary}`}>
              {t('المصدر: رئاسة الجمهورية / وزارة النقل — يونيو ٢٠٢٥. محطتا بهتيم وأكاديمية الشرطة بكباري مشاة، و١١ محطة بأنفاق مشاة.', 'Source: Presidency / Ministry of Transport — Jun 2025. Bahtim & Police Academy via footbridges, 11 stations via tunnels.')}
            </p>
          </div>
        )}

        {tab === 'fares' && (
          <div className="mt-4">
            <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
              <div className="p-4 border-b border-neutral-100 flex items-center gap-3 bg-cyan-50 dark:bg-cyan-950">
                <Ticket size={22} style={{ color: COLOR }} />
                <div>
                  <h3 className={`font-bold text-sm ${textPrimary}`}>{t('التعرفة الرسمية (وزارة النقل)', 'Official Tariff (MoT)')}</h3>
                  <p className={`text-[11px] ${textSecondary}`}>{t('أرخص من الميكروباص البديل (١٦ جنيهاً لنفس المسافة)', 'Cheaper than the microbus alternative (EGP 16 same distance)')}</p>
                </div>
              </div>
              <div className="divide-y divide-neutral-100 text-xs">
                {fareTiers.map((f, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock3 size={15} style={{ color: COLOR }} />
                      <span className={`font-semibold ${textPrimary}`}>{lang === 'ar' ? f.label_ar : f.label_en}</span>
                    </div>
                    <span className="font-black text-lg" style={{ color: COLOR }}>{f.fare} {t('ج', 'EGP')}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => { nav('planner') }}
              className="mt-4 w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-md"
              style={{ background: COLOR }}
            >
              {t('خطط رحلة بالـ BRT', 'Plan a BRT trip')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
