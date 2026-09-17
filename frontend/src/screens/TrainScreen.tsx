import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { TrainTrack, Route, Clock, MapPin, Users, Map as MapIcon, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { MODE_COLORS } from '../components/icons'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

const routes = [
  {
    id: 'cairo-alex',
    name_ar: 'القاهرة — الإسكندرية',
    name_en: 'Cairo — Alexandria',
    duration_ar: '٢ ساعة',
    duration_en: '2 hrs',
    distance_ar: '٢١٥ كم',
    distance_en: '215 km',
    stations: ['رمسيس', 'بنها', 'طنطا', 'دمنهور', 'الإسكندرية'],
    stations_en: ['Ramses', 'Benha', 'Tanta', 'Damanhour', 'Alexandria'],
    status: 'ok',
    color: MODE_COLORS.train,
  },
  {
    id: 'cairo-luxor',
    name_ar: 'القاهرة — الأقصر',
    name_en: 'Cairo — Luxor',
    duration_ar: '١٠ ساعات',
    duration_en: '10 hrs',
    distance_ar: '٦٧٠ كم',
    distance_en: '670 km',
    stations: ['رمسيس', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر'],
    stations_en: ['Ramses', 'Asyut', 'Sohag', 'Qena', 'Luxor'],
    status: 'ok',
    color: MODE_COLORS.train,
  },
  {
    id: 'cairo-aswan',
    name_ar: 'القاهرة — أسوان',
    name_en: 'Cairo — Aswan',
    duration_ar: '١٣ ساعة',
    duration_en: '13 hrs',
    distance_ar: '٨٨٠ كم',
    distance_en: '880 km',
    stations: ['رمسيس', 'الأقصر', 'إدفو', 'كوم أمبو', 'أسوان'],
    stations_en: ['Ramses', 'Luxor', 'Edfu', 'Kom Ombo', 'Aswan'],
    status: 'delayed',
    color: MODE_COLORS.train,
  },
  {
    id: 'cairo-suez',
    name_ar: 'القاهرة — السويس',
    name_en: 'Cairo — Suez',
    duration_ar: '٢ ساعة',
    duration_en: '2 hrs',
    distance_ar: '١٣٥ كم',
    distance_en: '135 km',
    stations: ['رمسيس', 'عين شمس', 'الزيتون', 'السويس'],
    stations_en: ['Ramses', 'Ain Shams', 'El Zeitoun', 'Suez'],
    status: 'ok',
    color: MODE_COLORS.train,
  },
]

const mainStations = [
  { id: 1, name_ar: 'رمسيس', name_en: 'Ramses', city_ar: 'القاهرة', city_en: 'Cairo', routes: 4, isHub: true },
  { id: 2, name_ar: 'الإسكندرية', name_en: 'Alexandria', city_ar: 'الإسكندرية', city_en: 'Alexandria', routes: 3, isHub: true },
  { id: 3, name_ar: 'الأقصر', name_en: 'Luxor', city_ar: 'الأقصر', city_en: 'Luxor', routes: 2, isHub: false },
  { id: 4, name_ar: 'أسوان', name_en: 'Aswan', city_ar: 'أسوان', city_en: 'Aswan', routes: 1, isHub: false },
  { id: 5, name_ar: 'طنطا', name_en: 'Tanta', city_ar: 'الغربية', city_en: 'Gharbia', routes: 2, isHub: false },
  { id: 6, name_ar: 'السويس', name_en: 'Suez', city_ar: 'السويس', city_en: 'Suez', routes: 1, isHub: false },
]

export default function TrainScreen({ lang, t, nav, darkMode }: Props) {
  const [tab, setTab] = useState<'overview' | 'routes' | 'stations'>('overview')

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'

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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: MODE_COLORS.train }}>
                <TrainTrack size={18} className="text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary}`}>{t('القطارات المصرية', 'Egyptian Railways')}</h1>
                <p className={`text-xs ${textSecondary}`}>{t('الشبكة الوطنية', 'National Network')}</p>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {(['overview', 'routes', 'stations'] as const).map(tab_ => (
              <button key={tab_} onClick={() => setTab(tab_)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${tab === tab_ ? 'border-purple-600 text-purple-600' : `border-transparent ${textSecondary}`}`}>
                {tab_ === 'overview' ? t('نظرة عامة', 'Overview') : tab_ === 'routes' ? t('الخطوط', 'Routes') : t('المحطات', 'Stations')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-6">
        {tab === 'overview' && <OverviewTab lang={lang} t={t} darkMode={darkMode} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />}
        {tab === 'routes' && <RoutesTab lang={lang} t={t} darkMode={darkMode} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />}
        {tab === 'stations' && <StationsTab lang={lang} t={t} darkMode={darkMode} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />}
      </div>
    </div>
  )
}

function OverviewTab({ lang, t, darkMode, cardBg, textPrimary, textSecondary }: any) {
  const stats = [
    { label_ar: 'كيلومتر مسار', label_en: 'km of track', value: '5,085', Icon: Route },
    { label_ar: 'محطة رئيسية', label_en: 'main stations', value: '700+', Icon: MapPin },
    { label_ar: 'خطوط معروضة', label_en: 'featured routes', value: '4', Icon: MapIcon },
    { label_ar: 'راكب يومياً (تقريباً)', label_en: 'daily riders (approx)', value: '800K', Icon: Users },
  ]

  const services = [
    { name_ar: 'قطار مكيف مميز', name_en: 'Premium A/C Express', desc_ar: 'أفضل الخدمات مع تحديد مقاعد', desc_en: 'Best service with reserved seating', color: MODE_COLORS.train, badge_ar: 'مميز', badge_en: 'Premium' },
    { name_ar: 'قطار مكيف عادي', name_en: 'A/C Express', desc_ar: 'خدمة مكيفة مريحة', desc_en: 'Comfortable air-conditioned service', color: MODE_COLORS.train, badge_ar: 'عادي', badge_en: 'Standard' },
    { name_ar: 'قطار سريع', name_en: 'Fast Train', desc_ar: 'أسرع بدون تكييف', desc_en: 'Faster without A/C', color: MODE_COLORS.train, badge_ar: 'سريع', badge_en: 'Fast' },
  ]

  return (
    <div>
      {/* Railway SVG schematic */}
      <div className={`mt-4 mb-4 rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className="px-4 py-3 border-b border-neutral-200/50">
          <p className={`text-sm font-semibold ${textPrimary}`}>{t('خريطة الشبكة', 'Network Map')}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-900">
          <svg viewBox="0 0 300 220" className="w-full" style={{ maxHeight: 220 }}>
            {/* Cairo hub */}
            <circle cx="150" cy="110" r="10" fill={MODE_COLORS.train} />
            <text x="150" y="130" textAnchor="middle" fontSize="8" className="fill-violet-800 dark:fill-violet-200 font-bold">{lang === 'ar' ? 'رمسيس' : 'Ramses'}</text>

            {/* Line to Alexandria (northwest) */}
            <line x1="150" y1="110" x2="40" y2="40" stroke={MODE_COLORS.train} strokeWidth="3" />
            <circle cx="40" cy="40" r="7" fill={MODE_COLORS.train} opacity="0.8" />
            <text x="40" y="28" textAnchor="middle" fontSize="7" className="fill-violet-800 dark:fill-violet-200">{lang === 'ar' ? 'الإسكندرية' : 'Alex'}</text>
            {/* Intermediate - Tanta */}
            <circle cx="95" cy="75" r="4" fill={MODE_COLORS.train} />
            <text x="95" y="68" textAnchor="middle" fontSize="6" className="fill-violet-700 dark:fill-violet-300">{lang === 'ar' ? 'طنطا' : 'Tanta'}</text>

            {/* Line to Luxor/Aswan (south) */}
            <line x1="150" y1="110" x2="150" y2="195" stroke={MODE_COLORS.train} strokeWidth="3" />
            <circle cx="150" cy="195" r="7" fill={MODE_COLORS.train} opacity="0.8" />
            <text x="150" y="210" textAnchor="middle" fontSize="7" className="fill-violet-800 dark:fill-violet-200">{lang === 'ar' ? 'أسوان' : 'Aswan'}</text>
            <circle cx="150" cy="165" r="4" fill={MODE_COLORS.train} />
            <text x="165" y="168" textAnchor="start" fontSize="6" className="fill-violet-700 dark:fill-violet-300">{lang === 'ar' ? 'الأقصر' : 'Luxor'}</text>

            {/* Line to Suez (east) */}
            <line x1="150" y1="110" x2="255" y2="65" stroke={MODE_COLORS.train} strokeWidth="2.5" />
            <circle cx="255" cy="65" r="6" fill={MODE_COLORS.train} opacity="0.8" />
            <text x="265" y="67" textAnchor="start" fontSize="7" className="fill-violet-700 dark:fill-violet-300">{lang === 'ar' ? 'السويس' : 'Suez'}</text>

            {/* Legend */}
            <line x1="10" y1="200" x2="30" y2="200" stroke={MODE_COLORS.train} strokeWidth="3" />
            <text x="35" y="203" fontSize="7" className="fill-violet-700 dark:fill-violet-300">{lang === 'ar' ? 'خط رئيسي' : 'Main Line'}</text>
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((s, i) => (
          <div key={i} className={`${cardBg} border rounded-xl p-3`}>
            <div className="mb-1 text-purple-600"><s.Icon size={22} /></div>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{s.value}</p>
            <p className={`text-xs ${textSecondary}`}>{lang === 'ar' ? s.label_ar : s.label_en}</p>
          </div>
        ))}
      </div>

      {/* Service classes */}
      <h3 className={`text-sm font-semibold ${textSecondary} mb-3`}>{t('فئات الخدمة', 'Service Classes')}</h3>
      <div className="space-y-2">
        {services.map((s, i) => (
          <div key={i} className={`${cardBg} border rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: s.color }}>
              {lang === 'ar' ? s.badge_ar : s.badge_en}
            </div>
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? s.name_ar : s.name_en}</p>
              <p className={`text-xs ${textSecondary}`}>{lang === 'ar' ? s.desc_ar : s.desc_en}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoutesTab({ lang, t, darkMode, cardBg, textPrimary, textSecondary }: any) {
  return (
    <div className="mt-4 space-y-3">
      {routes.map(route => (
        <div key={route.id} className={`${cardBg} border rounded-2xl p-4`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className={`text-base font-bold ${textPrimary}`}>{lang === 'ar' ? route.name_ar : route.name_en}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs ${textSecondary}`}>{lang === 'ar' ? route.duration_ar : route.duration_en}</span>
                <span className={`text-xs ${textSecondary}`}>·</span>
                <span className={`text-xs ${textSecondary}`}>{lang === 'ar' ? route.distance_ar : route.distance_en}</span>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${route.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {route.status === 'ok' ? t('يعمل', 'Operating') : t('تأخير', 'Delayed')}
            </span>
          </div>
          {/* Station dots */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(lang === 'ar' ? route.stations : route.stations_en).map((st: string, i: number) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: route.color, background: i === 0 || i === route.stations.length - 1 ? route.color : 'transparent' }} />
                  <p className="text-[10px] text-neutral-500 whitespace-nowrap">{st}</p>
                </div>
                {i < route.stations.length - 1 && (
                  <div className="w-6 h-0.5 flex-shrink-0" style={{ background: route.color, opacity: 0.5 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StationsTab({ lang, t, darkMode, cardBg, textPrimary, textSecondary }: any) {
  return (
    <div className="mt-4 space-y-2">
      {mainStations.map(station => (
        <div key={station.id} className={`${cardBg} border rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-950">
              <MapPin size={18} className="text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? station.name_ar : station.name_en}</p>
                {station.isHub && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">{t('مركزي', 'Hub')}</span>
                )}
              </div>
              <p className={`text-xs ${textSecondary}`}>{lang === 'ar' ? station.city_ar : station.city_en}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{station.routes}</p>
            <p className={`text-xs ${textSecondary}`}>{t('خطوط', 'routes')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
