import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { EGYPT_STATIONS, calculateMetroTariff, calculateLRTTariff } from '../data/egyptTransitData'
import { ModeIcon } from '../components/icons'
import { Ticket, TrainFront, TramFront, CableCar, BusFront, Map as MapIcon } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
}

export default function FaresScreen({ lang, t, nav }: Props) {
  const [tab, setTab] = useState<'calc' | 'metro' | 'lrt' | 'monorail' | 'brt' | 'sub'>('calc')
  const [mode, setMode] = useState<'metro' | 'lrt'>('metro')
  const [fromStation, setFromStation] = useState('الشهداء (رمسيس)')
  const [toStation, setToStation] = useState('مدينة الفنون والثقافة (العاصمة)')

  const stations = EGYPT_STATIONS.filter(s => s.modes.includes(mode))

  // Calculate fare
  const fromIdx = stations.findIndex(s => s.name_ar === fromStation || s.name_en === fromStation)
  const toIdx = stations.findIndex(s => s.name_ar === toStation || s.name_en === toStation)
  const stationCount = (fromIdx !== -1 && toIdx !== -1) ? Math.max(1, Math.abs(fromIdx - toIdx)) : 6

  const fareResult = mode === 'metro'
    ? calculateMetroTariff(stationCount)
    : calculateLRTTariff(stationCount)

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center shadow-xs">
              <Ticket size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{t('دليل وحاسبة الأسعار الرسمية', 'Fares & Official Tariff')}</h1>
              <p className="text-xs text-neutral-500">
                {t('تعريفات وزارة النقل المعتمدة للمترو والقطار الكهربائي واشتراكات الطلاب', 'Ministry of Transport official transit tariffs & subscriptions')}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-neutral-100 rounded-2xl p-1.5 overflow-x-auto">
            {[
              { id: 'calc', ar: 'حاسبة التذكرة', en: 'Fare Calc' },
              { id: 'metro', ar: 'جدول المترو', en: 'Metro Tariff' },
              { id: 'lrt', ar: 'قطار LRT', en: 'LRT Fares' },
              { id: 'monorail', ar: 'المونوريل', en: 'Monorail' },
              { id: 'brt', ar: 'BRT الدائري', en: 'BRT Fares' },
              { id: 'sub', ar: 'الاشتراكات والخصومات', en: 'Passes & Discounts' },
            ].map(tb => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id as any)}
                className={`flex-1 whitespace-nowrap text-xs font-bold py-2.5 px-3 rounded-xl transition-all ${
                  tab === tb.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {lang === 'ar' ? tb.ar : tb.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Tab 1: Interactive Fare Calculator */}
        {tab === 'calc' && (
          <div className="space-y-4">
            {/* Mode Select */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('metro')}
                className={`flex-1 p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  mode === 'metro' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-neutral-700 border-neutral-200'
                }`}
              >
                <span><TrainFront size={17} /></span>
                <span>{t('مترو الأنفاق', 'Cairo Metro')}</span>
              </button>
              <button
                onClick={() => setMode('lrt')}
                className={`flex-1 p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  mode === 'lrt' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-neutral-700 border-neutral-200'
                }`}
              >
                <span><TramFront size={17} /></span>
                <span>{t('القطار الخفيف LRT', 'Capital LRT')}</span>
              </button>
            </div>

            {/* Stations Selection Form */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 mb-1.5 block">
                  {t('محطة الركوب (البداية)', 'Boarding Station (Origin)')}
                </label>
                <select
                  value={fromStation}
                  onChange={e => setFromStation(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-bold text-neutral-800 outline-none focus:border-blue-500"
                >
                  {stations.map(st => (
                    <option key={st.id} value={lang === 'ar' ? st.name_ar : st.name_en}>
                      {lang === 'ar' ? st.name_ar : st.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 mb-1.5 block">
                  {t('محطة النزول (الوجهة)', 'Exit Station (Destination)')}
                </label>
                <select
                  value={toStation}
                  onChange={e => setToStation(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-bold text-neutral-800 outline-none focus:border-blue-500"
                >
                  {stations.map(st => (
                    <option key={st.id} value={lang === 'ar' ? st.name_ar : st.name_en}>
                      {lang === 'ar' ? st.name_ar : st.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Fare Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-center">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                  {t('سعر التذكرة الرسمي', 'Official Ticket Price')}
                </p>
                <div className="text-4xl font-black text-blue-900 my-1">
                  {fareResult.fare} <span className="text-base font-bold text-blue-600">{t('جنيه مصري', 'EGP')}</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-xs text-blue-700 mt-2 font-semibold">
                  <span className="flex items-center gap-1"><ModeIcon mode={mode} size={14} /> {stationCount} {t('محطات', 'stations')}</span>
                  <span>•</span>
                  <span>{lang === 'ar' ? fareResult.label_ar : fareResult.label_en}</span>
                </div>
              </div>

              <button
                onClick={() => nav('planner')}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 text-xs transition-all flex items-center justify-center gap-2"
              >
                <MapIcon size={15} />
                <span>{t('تخطيط وعرض المسار بالكامل على الخريطة', 'View Full Journey on Map')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Metro Tariff Table */}
        {tab === 'metro' && (
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-red-900">{t('تعريفة تذاكر المترو الرسمية', 'Cairo Metro Official Tariff')}</h3>
                <p className="text-xs text-red-700">{t('قرار وزارة النقل — ساري من ٢٧ مارس ٢٠٢٦', 'Ministry of Transport decree — effective 27 Mar 2026')}</p>
              </div>
              <span><TrainFront size={22} className="text-red-700" /></span>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">منطقة واحدة (١–٩ محطات)</p>
                  <p className="text-neutral-400">مناسبة للتنقلات القصيرة داخل وسط البلد أو الأحياء المجاورة</p>
                </div>
                <span className="font-black text-lg text-neutral-900">١٠ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">منطقتان (١٠–١٦ محطة)</p>
                  <p className="text-neutral-400">الرحلات المتوسطة بين الجيزة ووسط القاهرة أو مصر الجديدة</p>
                </div>
                <span className="font-black text-lg text-neutral-900">١٢ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">٣ مناطق (١٧–٢٣ محطة)</p>
                  <p className="text-neutral-400">الرحلات الطويلة مثل المرج إلى حلوان أو شبرا للمنيب</p>
                </div>
                <span className="font-black text-lg text-neutral-900">١٥ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">أكثر من ٢٣ محطة (الشبكة كاملة)</p>
                  <p className="text-neutral-400">أي رحلة تزيد عن ٢٣ محطة عبر خطوط المترو</p>
                </div>
                <span className="font-black text-lg text-neutral-900">٢٠ ج</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: LRT Fares */}
        {tab === 'lrt' && (
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-emerald-900">{t('تعريفة القطار الكهربائي الخفيف LRT', 'Capital LRT Tariff')}</h3>
                <p className="text-xs text-emerald-700">{t('يربط عدلي منصور بالعاصمة الإدارية والعاشر من رمضان', 'Connects Adly Mansour with New Capital')}</p>
              </div>
              <span><TramFront size={22} className="text-emerald-700" /></span>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">١ إلى ٣ محطات</p>
                  <p className="text-neutral-400">عدلي منصور إلى العبور أو المستقبل</p>
                </div>
                <span className="font-black text-lg text-emerald-700">١٠ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">٤ إلى ٧ محطات</p>
                  <p className="text-neutral-400">عدلي منصور إلى الشروق أو بدر</p>
                </div>
                <span className="font-black text-lg text-emerald-700">١٥ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">أكثر من ٧ محطات</p>
                  <p className="text-neutral-400">إلى العاصمة الإدارية (مدينة الفنون والثقافة / الحي الحكومي)</p>
                </div>
                <span className="font-black text-lg text-emerald-700">٢٠ ج</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Monorail Fares (official, effective 9 May 2026) */}
        {tab === 'monorail' && (
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-amber-900">{t('تعريفة مونوريل شرق النيل', 'East Nile Monorail Tariff')}</h3>
                <p className="text-xs text-amber-700">{t('وزارة النقل — سارية من ٩ مايو ٢٠٢٦ • ٢٢ محطة (الاستاد – مدينة العدالة)', 'Ministry of Transport — effective 9 May 2026 • 22 stations')}</p>
              </div>
              <span><CableCar size={22} className="text-amber-700" /></span>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">حتى ٥ محطات</p>
                  <p className="text-neutral-400">نصف التذكرة (٦٠+ وذوو الهمم): ١٠ جنيهات</p>
                </div>
                <span className="font-black text-lg text-amber-700">٢٠ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">حتى ١٠ محطات</p>
                  <p className="text-neutral-400">نصف التذكرة: ٢٠ جنيهاً</p>
                </div>
                <span className="font-black text-lg text-amber-700">٤٠ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">حتى ١٥ محطة</p>
                  <p className="text-neutral-400">نصف التذكرة: ٣٠ جنيهاً — تشمل رحلات المرحلة الأولى كاملة</p>
                </div>
                <span className="font-black text-lg text-amber-700">٥٥ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">الخط الكامل (٢٢ محطة)</p>
                  <p className="text-neutral-400">نصف التذكرة: ٤٠ جنيهاً • خصم ٥٠٪ الجمعة والسبت والعطلات</p>
                </div>
                <span className="font-black text-lg text-amber-700">٨٠ ج</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: BRT Fares (official, Phase 1 operating since Jun 2025) */}
        {tab === 'brt' && (
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-cyan-50 border-b border-cyan-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-cyan-900">{t('تعريفة حافلات BRT الدائري', 'Ring Road BRT Tariff')}</h3>
                <p className="text-xs text-cyan-700">{t('وزارة النقل — المرحلة الأولى (١٤ محطة) تعمل منذ يونيو ٢٠٢٥', 'Ministry of Transport — Phase 1 (14 stations) live since Jun 2025')}</p>
              </div>
              <span><BusFront size={22} className="text-cyan-700" /></span>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">حتى ٤ محطات</p>
                  <p className="text-neutral-400">أرخص من الميكروباص البديل (١٦ جنيهاً لنفس المسافة)</p>
                </div>
                <span className="font-black text-lg text-cyan-700">٥ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">حتى ٩ محطات</p>
                  <p className="text-neutral-400">تشمل التبادل مع المترو (المرج، الزهراء، عدلي منصور)</p>
                </div>
                <span className="font-black text-lg text-cyan-700">١٠ ج</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 text-sm">المسار الكامل للمرحلة الأولى (١٤ محطة)</p>
                  <p className="text-neutral-400">أكاديمية الشرطة ↔ طريق الإسكندرية الزراعي (٣٥ كم)</p>
                </div>
                <span className="font-black text-lg text-cyan-700">١٥ ج</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Subscriptions & Special Discounts */}
        {tab === 'sub' && (
          <div className="space-y-3">
            {[
              {
                title_ar: 'اشتراكات الطلاب (ربع سنوي ١٥٠ جنيهاً)',
                title_en: 'Student Pass (150 EGP / quarter)',
                desc_ar: 'اشتراك المترو ربع السنوي للطلبة ١٥٠ جنيهاً — أوفر بكثير من التذكرة اليومية. اشتراك LRT الشهري: ٣٠٠ / ٥٠٠ / ٦٠٠ جنيه.',
                desc_en: 'Quarterly metro student pass is 150 EGP. LRT monthly passes: 300 / 500 / 600 EGP.',
                tag: 'الأوفر للطلبة',
                color: 'bg-blue-100 text-blue-800',
              },
              {
                title_ar: 'كبار السن (فوق ٦٠ سنة)',
                title_en: 'Seniors 60+ (50% Discount)',
                desc_ar: 'خصم ٥٠٪ على كافة التذاكر والاشتراكات بموجب بطاقة الرقم القومي.',
                desc_en: '50% discount on all tickets with national ID.',
                tag: 'خصم ٥٠٪',
                color: 'bg-emerald-100 text-emerald-800',
              },
              {
                title_ar: 'فوق ٧٠ سنة ومحاربو الوطن',
                title_en: 'Seniors 70+ (Free Travel)',
                desc_ar: 'ركوب مجاني بالكامل بجميع خطوط المترو والقطارات بدون أي رسوم.',
                desc_en: '100% Free transit on all metro & rail lines.',
                tag: 'مجاني ١٠٠٪',
                color: 'bg-purple-100 text-purple-800',
              },
              {
                title_ar: 'ذوو الهمم (تذكرة موحدة ٥ جنيهات)',
                title_en: 'People of Determination (flat 5 EGP)',
                desc_ar: 'تذكرة موحدة ٥ جنيهات لأي مسافة بالمترو (وفق جدول ٢٠٢٦) مع خصومات مماثلة على المونوريل (نصف التذكرة).',
                desc_en: 'Flat 5 EGP metro fare any distance (2026 table), with half-fare on the monorail.',
                tag: '٥ جنيهات موحدة',
                color: 'bg-amber-100 text-amber-800',
              },
            ].map((sub, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-sm text-neutral-900">{lang === 'ar' ? sub.title_ar : sub.title_en}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.color}`}>{sub.tag}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{lang === 'ar' ? sub.desc_ar : sub.desc_en}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
