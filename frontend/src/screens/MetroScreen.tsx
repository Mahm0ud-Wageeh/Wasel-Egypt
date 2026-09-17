import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { EGYPT_LINES, EGYPT_STATIONS, Station, calculateMetroTariff } from '../data/egyptTransitData'
import InteractiveMap from '../components/map/InteractiveMap'
import { ModeIcon } from '../components/icons'
import { TrainFront, Ruler, TriangleAlert, CircleCheck, Ticket, Navigation } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  onPrefillPlanner?: (from: string, to: string) => void
  darkMode?: boolean
}

export default function MetroScreen({ lang, t, nav, onPrefillPlanner, darkMode = false }: Props) {
  const metroLines = EGYPT_LINES.filter(l => l.mode === 'metro')
  const [selectedLine, setSelectedLine] = useState<typeof metroLines[0] | null>(null)
  const [tab, setTab] = useState<'lines' | 'map' | 'fares'>('lines')

  if (selectedLine) {
    return (
      <LineDetailView
        line={selectedLine}
        lang={lang}
        t={t}
        darkMode={darkMode}
        onBack={() => setSelectedLine(null)}
        onPlanJourney={() => {
          if (onPrefillPlanner && selectedLine.stations.length > 0) {
            onPrefillPlanner(
              lang === 'ar' ? selectedLine.stations[0].name_ar : selectedLine.stations[0].name_en,
              lang === 'ar' ? selectedLine.stations[selectedLine.stations.length - 1].name_ar : selectedLine.stations[selectedLine.stations.length - 1].name_en
            )
          }
          nav('planner')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 pt-5 pb-4 shadow-xs">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center shadow-xs">
              <TrainFront size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{t('مترو أنفاق القاهرة الكبرى', 'Cairo Metro Network')}</h1>
              <p className="text-xs text-neutral-500">
                {t('٣ خطوط رئيسية • ٨٩ محطة • شريان النقل الأسرع في العاصمة', '3 Main Lines • 89 Stations • Cairo Rapid Transit')}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-neutral-100 rounded-2xl p-1.5">
            {[
              { id: 'lines', ar: 'خطوط المترو', en: 'Lines' },
              { id: 'map', ar: 'الخريطة التفاعلية', en: 'Interactive Map' },
              { id: 'fares', ar: 'تعريفة التذاكر الرسمية', en: 'Official Fares' },
            ].map(tb => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id as any)}
                className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all ${
                  tab === tb.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {lang === 'ar' ? tb.ar : tb.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Tab 1: Lines */}
        {tab === 'lines' && (
          <div className="space-y-3.5">
            {metroLines.map(line => (
              <button
                key={line.id}
                onClick={() => setSelectedLine(line)}
                className="w-full bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:border-neutral-300 hover:shadow-md transition-all text-start group"
              >
                <div className="flex">
                  <div className="w-3 flex-shrink-0" style={{ backgroundColor: line.color }} />
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.code}
                        </span>
                        <h2 className="text-base font-bold text-neutral-900">
                          {lang === 'ar' ? line.name_ar : line.name_en}
                        </h2>
                      </div>
                      <span className="text-neutral-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                        {lang === 'ar' ? '←' : '→'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 mb-3">{lang === 'ar' ? line.route_ar : line.route_en}</p>

                    <div className="flex items-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                      <span className="flex items-center gap-1"><ModeIcon mode="metro" size={14} /> {line.stationsCount} {t('محطة', 'stations')}</span>
                      <span className="flex items-center gap-1"><Ruler size={14} /> {line.lengthKm} {t('كم', 'km')}</span>
                      {line.status === 'delay' ? (
                        <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <TriangleAlert size={12} /> {t('تأخير ٨ دقائق', '8 min delay')}
                        </span>
                      ) : (
                        <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CircleCheck size={12} /> {t('يعمل بانتظام', 'Normal service')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Interactive Map */}
        {tab === 'map' && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl overflow-hidden border border-neutral-200 shadow-sm h-96 relative">
              <InteractiveMap
                darkMode={darkMode}
                center={[31.2497, 30.0617]}
                zoom={12}
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-neutral-400 text-center">
              {t('اضغط على أي محطة على الخريطة لعرض تفاصيلها أو التخطيط منها وإليها.', 'Click any station on the map to view details or plan routes.')}
            </p>
          </div>
        )}

        {/* Tab 3: Fares */}
        {tab === 'fares' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">{t('تعريفة ركوب مترو الأنفاق الرسمية', 'Official Cairo Metro Tariff')}</h3>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">قرار وزاري معتمد</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                {t('الأسعار موحدة على الخطوط الثلاثة ومحددة وفقاً لعدد المحطات — سارية من ٢٧ مارس ٢٠٢٦.', 'Prices are standardized across all 3 lines by station count — effective 27 Mar 2026.')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-600 font-bold">
                    <th className="px-4 py-3 text-start">{t('نطاق المحطات', 'Number of Stations')}</th>
                    <th className="px-4 py-3 text-center">{t('المنطقة', 'Zone')}</th>
                    <th className="px-4 py-3 text-end">{t('سعر التذكرة', 'Ticket Fare')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
                  <tr>
                    <td className="px-4 py-3.5">١ إلى ٩ محطات</td>
                    <td className="px-4 py-3.5 text-center text-neutral-400">منطقة واحدة</td>
                    <td className="px-4 py-3.5 text-end font-bold text-base text-neutral-900">١٠ {t('جنيه', 'EGP')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3.5">١٠ إلى ١٦ محطة</td>
                    <td className="px-4 py-3.5 text-center text-neutral-400">منطقتان</td>
                    <td className="px-4 py-3.5 text-end font-bold text-base text-neutral-900">١٢ {t('جنيه', 'EGP')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3.5">١٧ إلى ٢٣ محطة</td>
                    <td className="px-4 py-3.5 text-center text-neutral-400">٣ مناطق</td>
                    <td className="px-4 py-3.5 text-end font-bold text-base text-neutral-900">١٥ {t('جنيه', 'EGP')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3.5">أكثر من ٢٣ محطة</td>
                    <td className="px-4 py-3.5 text-center text-neutral-400">٤ مناطق فأكثر</td>
                    <td className="px-4 py-3.5 text-end font-bold text-base text-neutral-900">٢٠ {t('جنيه', 'EGP')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => nav('fares')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 text-xs transition-all flex items-center justify-center gap-2"
            >
              <Ticket size={15} />
              <span>{t('فتح حاسبة التذاكر التفاعلية واشتراكات الطلبة', 'Open Interactive Fare & Subscription Calculator')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LineDetailView({ line, lang, t, darkMode, onBack, onPlanJourney }: any) {
  const lineCoords = line.stations.map((s: Station) => ({ lng: s.lng, lat: s.lat }))

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Map Header */}
      <div className="relative h-64 w-full">
        <InteractiveMap
          darkMode={darkMode}
          center={lineCoords.length > 0 ? [lineCoords[0].lng, lineCoords[0].lat] : [31.2497, 30.0617]}
          zoom={12}
          activeRoutePoints={lineCoords}
          className="w-full h-full"
        />

        <button
          onClick={onBack}
          className="absolute top-4 start-4 z-30 bg-white/95 backdrop-blur-md text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 hover:bg-white transition-all"
        >
          <span>←</span>
          <span>{t('رجوع للخطوط', 'Back to Lines')}</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-20 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-neutral-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: line.color }}>
              {line.code}
            </span>
            <h1 className="text-lg font-black text-neutral-900">
              {lang === 'ar' ? line.name_ar : line.name_en}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mb-4">{lang === 'ar' ? line.route_ar : line.route_en}</p>

          <div className="grid grid-cols-3 gap-2 text-center bg-neutral-50 p-3 rounded-2xl mb-4">
            <div>
              <p className="text-base font-black text-neutral-900">{line.stationsCount}</p>
              <p className="text-[10px] text-neutral-400">{t('محطة', 'Stations')}</p>
            </div>
            <div>
              <p className="text-base font-black text-neutral-900">{line.lengthKm} {t('كم', 'km')}</p>
              <p className="text-[10px] text-neutral-400">{t('طول المسار', 'Length')}</p>
            </div>
            <div>
              <p className="text-base font-black text-green-600">~٣.٥ {t('د', 'm')}</p>
              <p className="text-[10px] text-neutral-400">{t('زمن التقاطر', 'Headway')}</p>
            </div>
          </div>

          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
            {t('قائمة المحطات الرئيسية والتبادلية', 'Key & Interchange Stations')}
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {line.stations.map((s: Station, i: number) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{lang === 'ar' ? s.name_ar : s.name_en}</p>
                    <p className="text-[10px] text-neutral-400">{s.zone_ar}</p>
                  </div>
                </div>

                {s.isInterchange && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    {t('محطة تبادلية', 'Interchange')}
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onPlanJourney}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 text-xs transition-all flex items-center justify-center gap-2"
          >
            <Navigation size={15} />
            <span>{t('تخطيط رحلة على هذا الخط', 'Plan Journey on this Line')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
