import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/ui/Logo'
import { Skeleton } from '../components/ui/Feedback'
import { PlannerCard } from '../components/journey/PlannerCard'
import { useJourneyPlanner } from '../components/journey/JourneyPlannerForm'
import { LineCard } from '../components/journey/LineCard'
import { MapPanel } from '../components/map/LazyMapPanel'
import { getData, apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Public Landing — Wasel Egypt (واصل مصر).
 *
 * The definitive public product entry point:
 * - Real functional journey planner with live search and geolocation
 * - Real live Cairo transit coverage metrics (stops, routes, active alerts)
 * - Interactive Cairo MapLibre network explorer
 * - Cairo Metro Network live line breakdown (Line 1, 2, 3)
 * - 4-step intelligent mobility cycle (Plan, Track, Detect, Recover)
 * - Multi-modal transit modes (Metro, Public Bus, Microbus, Rail, Nile Ferry)
 * - Intelligent mobility comparison (GTFS timetables, exact fares, offline PWA, multi-criteria scoring)
 * - Community trust and crowdsourced report system
 * - Full EN/AR RTL support and prefers-reduced-motion compliance
 */

const NAV_ANCHORS = [
  { href: '#planner', key: 'landing.nav_planner', fallbackEn: 'Plan Journey', fallbackAr: 'خطط رحلتك' },
  { href: '#network', key: 'landing.nav_network', fallbackEn: 'Network & Map', fallbackAr: 'الشبكة والخريطة' },
  { href: '#how-it-works', key: 'landing.nav_how', fallbackEn: 'How It Works', fallbackAr: 'كيف يعمل' },
  { href: '#modes', key: 'landing.nav_modes', fallbackEn: 'Transit Modes', fallbackAr: 'وسائل النقل' },
  { href: '#intelligence', key: 'landing.nav_intelligence', fallbackEn: 'Why Wasel', fallbackAr: 'لماذا واصل' },
  { href: '#trust', key: 'landing.nav_trust', fallbackEn: 'Community Trust', fallbackAr: 'مجتمع الركاب' },
]

const POPULAR_HUBS = [
  { name: 'Ramses Railway Station', nameAr: 'محطة رمسيس للقطارات', lat: 30.0617, lng: 31.2497, mode: 'modeRail' },
  { name: 'Tahrir Square (Sadat)', nameAr: 'ميدان التحرير (السادات)', lat: 30.0444, lng: 31.2357, mode: 'modeMetro' },
  { name: 'Cairo Int. Airport T3', nameAr: 'مطار القاهرة صالة 3', lat: 30.1219, lng: 31.4056, mode: 'modeBus' },
  { name: 'Smart Village (6th Oct)', nameAr: 'القرية الذكية (6 أكتوبر)', lat: 30.0734, lng: 31.0189, mode: 'modeBus' },
  { name: 'Cairo University (Giza)', nameAr: 'جامعة القاهرة (الجيزة)', lat: 30.0263, lng: 31.2114, mode: 'modeMetro' },
  { name: 'Adly Mansour Transit Hub', nameAr: 'محطة عدلي منصور التبادلية', lat: 30.1475, lng: 31.4206, mode: 'modeMetro' },
]

const STEPS = [
  {
    num: '01',
    icon: 'plan',
    titleKey: 'landing.plan_step',
    bodyKey: 'landing.plan_body',
    fallbackTitleEn: 'Multi-Modal Route Planning',
    fallbackTitleAr: 'تخطيط ذكي متعدد الوسائط',
    fallbackBodyEn: 'Calculate optimal routes combining Cairo Metro, CTA public buses, microbuses, and walking with official fare estimates.',
    fallbackBodyAr: 'حساب أفضل المسارات التي تجمع بين مترو القاهرة، حافلات النقل العام، الميكروباص والمشي مع حساب دقيق للتعريفة.',
  },
  {
    num: '02',
    icon: 'track',
    titleKey: 'landing.track_step',
    bodyKey: 'landing.track_body',
    fallbackTitleEn: 'Live Step-by-Step Guidance',
    fallbackTitleAr: 'إرشاد حي خطوة بخطوة',
    fallbackBodyEn: 'Track your real-time position along the transit corridor with upcoming stop alerts and distance countdowns.',
    fallbackBodyAr: 'تتبع موقعك لحظة بلحظة أثناء الرحلة مع تنبيهات المحطات القادمة والعد التنازلي للمسافة.',
  },
  {
    num: '03',
    icon: 'detect',
    titleKey: 'landing.detect_step',
    bodyKey: 'landing.detect_body',
    fallbackTitleEn: 'Automated Deviation Detection',
    fallbackTitleAr: 'اكتشاف تلقائي لتغيير المسار',
    fallbackBodyEn: 'Smart GPS buffer algorithms instantly notify you if a bus or microbus unexpectedly detours or skips stops.',
    fallbackBodyAr: 'خوارزميات ذكية ترصد فوراً أي انحراف عن المسار المخطط في حال تغيير مسار الحافلة أو الميكروباص.',
  },
  {
    num: '04',
    icon: 'recover',
    titleKey: 'landing.recover_step',
    bodyKey: 'landing.recover_body',
    fallbackTitleEn: 'Instant 1-Click Rerouting',
    fallbackTitleAr: 'استعادة وتعديل المسار بضغطة زر',
    fallbackBodyEn: 'Receive recalculated alternatives from your exact coordinate back to your final destination in seconds.',
    fallbackBodyAr: 'الحصول على بدائل مسارات جديدة ومحدثة من موقعك الحالي مباشرة إلى وجهتك النهائية في ثوانٍ.',
  },
]

const TRANSIT_MODES = [
  {
    id: 'metro',
    icon: 'modeMetro',
    nameEn: 'Cairo Metro',
    nameAr: 'مترو القاهرة',
    descEn: 'Lines 1, 2, and 3 with full station timetables, transfer stations, and official fare zones (8-20 EGP).',
    descAr: 'الخطوط 1 و2 و3 مع مواعيد المحطات الدقيقة، محطات التبادل، ومناطق التعريفة الرسمية (8-20 ج.م).',
    color: 'var(--mode-metro)',
    badge: 'Lines 1, 2, 3',
  },
  {
    id: 'bus',
    icon: 'modeBus',
    nameEn: 'CTA Public Bus',
    nameAr: 'حافلات النقل العام',
    descEn: 'Comprehensive municipal bus routes covering Greater Cairo, Giza, and Qalyubia hubs.',
    descAr: 'شبكة حافلات هيئة النقل العام التي تغطي محاور القاهرة الكبرى والجيزة والقليوبية.',
    color: 'var(--mode-bus)',
    badge: 'Citywide Network',
  },
  {
    id: 'microbus',
    icon: 'modeMicrobus',
    nameEn: 'Minibus & Microbus',
    nameAr: 'ميكروباص وميني باص',
    descEn: 'Neighborhood informal transit and high-frequency feeder routes connecting metro terminals.',
    descAr: 'خطوط النقل الجماعي والميكروباص عالية التردد التي تربط الأحياء بمحطات المترو الرئيسية.',
    color: 'var(--mode-microbus)',
    badge: 'High Frequency',
  },
  {
    id: 'rail',
    icon: 'modeRail',
    nameEn: 'Regional Rail & LRT',
    nameAr: 'القطار والقطار الخفيف',
    descEn: 'ENR suburban railways and the Light Rail Transit network connecting New Cairo and the Capital.',
    descAr: 'قطارات السكك الحديدية وشبكة القطار الكهربائي الخفيف LRT للربط مع المدن الجديدة.',
    color: 'var(--mode-rail)',
    badge: 'Regional Transit',
  },
  {
    id: 'nile',
    icon: 'globe',
    nameEn: 'Nile River Bus',
    nameAr: 'الأتوبيس النهري',
    descEn: 'Scenic water transit along the Nile linking downtown Cairo, Zamalek, Maadi, and Giza docks.',
    descAr: 'النقل النهري على طول مجرى النيل لربط وسط البلد والزمالك والمعادي ومراسي الجيزة.',
    color: 'var(--nile)',
    badge: 'Nile Corridor',
  },
  {
    id: 'walking',
    icon: 'modeWalking',
    nameEn: 'Pedestrian Interchanges',
    nameAr: 'مسارات المشاة',
    descEn: 'Optimized transfer walkways with honest walk times and accessible route options.',
    descAr: 'مسارات المشاة المحسوبة بدقة للتبادل بين المحطات مع مسارات ميسرة لذوي الاحتياجات.',
    color: 'var(--mode-walking)',
    badge: 'Optimized Walks',
  },
]

const INTELLIGENCE_POINTS = [
  {
    icon: 'sparkles',
    titleEn: 'GTFS Timetable Precision',
    titleAr: 'دقة جداول البيانات الموحدة GTFS',
    descEn: 'Standardized transit data derived from official Transport for Cairo specifications, capturing real station headway patterns.',
    descAr: 'بيانات نقل قياسية مبنية على مواصفات النقل للقاهرة الرسمية لتعكس التردد الفعلي للرحلات.',
  },
  {
    icon: 'chart',
    titleEn: 'Multi-Criteria Route Ranking',
    titleAr: 'تقييم شامل ومتوازن للمسارات',
    descEn: 'Algorithmic scoring balancing total travel time (40%), walking (20%), transfers (20%), fare cost (10%), and route reliability (10%).',
    descAr: 'خوارزمية ذكية توازن بين وقت الرحلة (40%)، المشي (20%)، التبديلات (20%)، التكلفة (10%)، والاعتمادية (10%).',
  },
  {
    icon: 'track',
    titleEn: 'GPS Buffer Corridor Tracking',
    titleAr: 'مراقبة المسار بحرم GPS الذكي',
    descEn: 'Dynamic geo-corridor tracking that distinguishes normal traffic stops from unauthorized off-route detours.',
    descAr: 'تتبع ذكي يحدد نطاق المسار بدقة للتمييز بين توقفات الزحام الطبيعية والانحراف الفعلي عن خط السير.',
  },
  {
    icon: 'shield',
    titleEn: 'Trust-Weighted Community Reports',
    titleAr: 'بلاغات مجتمعية بنظام الثقة',
    descEn: 'Crowdsourced incident reporting where frequent, accurate contributors earn higher trust rankings, validated by moderators.',
    descAr: 'منظومة بلاغات من الركاب تمنح نقاط ثقة للأعضاء الموثوقين مع تدقيق إداري لحالة الطرق.',
  },
]

function metroLineSummary(route, stopsPayload) {
  const variant = stopsPayload?.[0]
  const stops = variant?.stops ?? []
  const first = stops[0]?.stop_name
  const last = stops[stops.length - 1]?.stop_name
  if (!first || !last) return null
  const color = route.color && /^#?[0-9a-fA-F]{6}$/.test(route.color)
    ? (route.color.startsWith('#') ? route.color : `#${route.color}`)
    : null
  return {
    id: route.id,
    line: route.short_name,
    name: route.name,
    from: first,
    to: last,
    stopCount: stops.length,
    color,
    operator: route.transit_operator?.name ?? null,
    mode: route.transit_mode?.name ?? 'metro',
  }
}

export default function Landing() {
  const { isAuthenticated, user } = useAuth()
  const { language, setLanguage, isRtl, t } = useI18n()
  const navigate = useNavigate()
  const planner = useJourneyPlanner()

  const [alerts, setAlerts] = useState([])
  const [metroLines, setMetroLines] = useState([])
  const [coverage, setCoverage] = useState({ stops: null, routes: null })
  const [loadingLines, setLoadingLines] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch live network data
  useEffect(() => {
    let active = true

    // Active Service Alerts
    getData(endpoints.public.activeServiceAlerts)
      .then((res) => {
        if (active) setAlerts(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      })
      .catch(() => {})

    // Total Stops
    apiRequest(`${endpoints.public.stops}?per_page=1`)
      .then((res) => {
        const total = res?.meta?.total
        if (active && Number.isFinite(total)) {
          setCoverage((prev) => ({ ...prev, stops: total }))
        }
      })
      .catch(() => {})

    // Total Routes
    apiRequest(`${endpoints.public.routes}?per_page=1`)
      .then((res) => {
        const total = res?.meta?.total
        if (active && Number.isFinite(total)) {
          setCoverage((prev) => ({ ...prev, routes: total }))
        }
      })
      .catch(() => {})

    // Real Metro Lines with variant stops
    getData(`${endpoints.public.routes}?transit_mode_id=1&per_page=6`)
      .then(async (routes) => {
        const list = Array.isArray(routes) ? routes : (routes?.data ?? [])
        const withStops = await Promise.all(
          list.map(async (route) => {
            try {
              const stops = await getData(endpoints.public.routeStops(route.id))
              return metroLineSummary(route, stops)
            } catch {
              return null
            }
          })
        )
        if (active) {
          setMetroLines(withStops.filter(Boolean))
          setLoadingLines(false)
        }
      })
      .catch(() => {
        if (active) setLoadingLines(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Quick destination hub selection
  const selectHub = (hub) => {
    planner.setDestinationStop({
      id: `hub_${hub.lat}_${hub.lng}`,
      name: isRtl ? hub.nameAr : hub.name,
      latitude: hub.lat,
      longitude: hub.lng,
    })
  }

  // Previews for the map
  const originPreview = planner.originStop
    ? { lat: Number(planner.originStop.latitude ?? planner.originStop.lat), lng: Number(planner.originStop.longitude ?? planner.originStop.lng) }
    : null
  const destinationPreview = planner.destinationStop
    ? { lat: Number(planner.destinationStop.latitude ?? planner.destinationStop.lat), lng: Number(planner.destinationStop.longitude ?? planner.destinationStop.lng) }
    : null
  const userPreview = planner.currentLocationContext.selection && planner.originStop?.isCurrent
    ? { lat: Number(planner.originStop.latitude), lng: Number(planner.originStop.longitude), accuracy: planner.originStop.accuracy }
    : null

  return (
    <div className="landing-root" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* ─── Top Navbar ─── */}
      <header className="landing-nav" aria-label="Main Navigation">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand" aria-label="Wasel Egypt home">
            <Logo size={32} subtitle="Egypt" />
          </Link>

          <nav className="landing-nav__links" aria-label="Sections">
            {NAV_ANCHORS.map((anchor) => (
              <a key={anchor.href} href={anchor.href} className="landing-nav__link">
                {isRtl ? anchor.fallbackAr : anchor.fallbackEn}
              </a>
            ))}
          </nav>

          <div className="landing-nav__actions">
            <button
              type="button"
              className="chip"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={`Switch language to ${language === 'en' ? 'Arabic' : 'English'}`}
            >
              <Icon name="language" size={15} aria-hidden="true" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {isAuthenticated ? (
              <Link to="/home" style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="primary">
                  <Icon name="home" size={15} aria-hidden="true" />
                  <span>{t('nav.home')}</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-nav__hide-mobile" style={{ textDecoration: 'none' }}>
                  <Button size="sm" variant="secondary">{t('auth.login')}</Button>
                </Link>
                <Link to="/register" className="landing-nav__hide-mobile" style={{ textDecoration: 'none' }}>
                  <Button size="sm" variant="primary">{t('landing.get_started')}</Button>
                </Link>
              </>
            )}

            <button
              type="button"
              className="landing-nav__menu-btn"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="landing-nav__mobile-drawer anim-rise">
            {NAV_ANCHORS.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className="landing-nav__mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {isRtl ? anchor.fallbackAr : anchor.fallbackEn}
              </a>
            ))}
            <div className="landing-nav__mobile-auth">
              {isAuthenticated ? (
                <Link to="/home" className="btn btn--primary btn--block" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.home')}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn--secondary btn--block" onClick={() => setMobileMenuOpen(false)}>
                    {t('auth.login')}
                  </Link>
                  <Link to="/register" className="btn btn--primary btn--block" onClick={() => setMobileMenuOpen(false)}>
                    {t('landing.get_started')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero: Headline + Journey Planner + Real Map ─── */}
      <section id="planner" className="landing-hero anim-rise">
        <div className="landing-hero__grid">
          {/* Left Column: Heading, Planner & Presets */}
          <div className="landing-hero__content">
            <div className="landing-hero__eyebrow-row">
              <span className="eyebrow" style={{ color: 'var(--p600)', background: 'var(--p50)', padding: '4px 10px', borderRadius: 'var(--r-pill)' }}>
                {isRtl ? 'واصل مصر · شبكة المواصلات الذكية' : 'Wasel Egypt · Intelligent Transit Network'}
              </span>
              {coverage.stops && (
                <span className="live-pulse-badge">
                  <span className="live-pulse" aria-hidden="true" />
                  <span>{isRtl ? `${coverage.stops.toLocaleString()} محطة نشطة` : `${coverage.stops.toLocaleString()} Active Stops`}</span>
                </span>
              )}
            </div>

            <h1 className="landing-hero__headline">
              {t('landing.tagline')}
            </h1>

            <p className="landing-hero__subtitle">
              {isRtl
                ? 'تخطيط متكامل لرحلات المترو، حافلات النقل العام، الميكروباص والقطارات. إرشاد خطوة بخطوة، ورصد فوري لأي انحراف عن المسار مع استعادة وتعديل سريع.'
                : 'Real-time multi-modal journey planning across Metro, CTA Buses, Microbuses, and Rail. Live navigation, automated deviation detection, and instant rerouting.'}
            </p>

            {/* Functional Journey Planner Form */}
            <div className="landing-hero__planner-card">
              <PlannerCard
                variant="hero"
                planner={planner}
                showSearchHint={false}
                submitLabelKey="landing.plan_cta"
              />
            </div>

            {/* Quick Destination Hub Presets */}
            <div className="landing-hero__presets">
              <span className="t-caption" style={{ fontWeight: 700, color: 'var(--ink700)' }}>
                {isRtl ? 'وجهات شائعة سريعة:' : 'Quick Popular Destinations:'}
              </span>
              <div className="landing-hero__preset-chips">
                {POPULAR_HUBS.map((hub) => (
                  <button
                    key={hub.name}
                    type="button"
                    className="preset-chip"
                    onClick={() => selectHub(hub)}
                    title={isRtl ? `تحديد ${hub.nameAr} كوجهة` : `Set ${hub.name} as destination`}
                  >
                    <Icon name={hub.mode} size={13} aria-hidden="true" style={{ color: 'var(--p600)' }} />
                    <span>{isRtl ? hub.nameAr : hub.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Badges */}
            <div className="landing-hero__feature-badges">
              {[
                { icon: 'track', labelEn: 'Real-Time Tracking', labelAr: 'تتبع حي للمسار' },
                { icon: 'detect', labelEn: 'Deviation Detection', labelAr: 'رصد انحراف المسار' },
                { icon: 'recover', labelEn: '1-Click Recovery', labelAr: 'استعادة وتعديل فوري' },
                { icon: 'community', labelEn: 'Verified Reports', labelAr: 'بلاغات موثوقة' },
              ].map((f) => (
                <span key={f.icon} className="landing-hero__badge-pill">
                  <Icon name={f.icon} size={14} aria-hidden="true" />
                  <span>{isRtl ? f.labelAr : f.labelEn}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Live MapLibre Preview */}
          <div className="landing-hero__map-col">
            <div className="landing-map__wrapper">
              <MapPanel
                origin={originPreview}
                destination={destinationPreview}
                userLocation={userPreview}
                height="100%"
                fitTo="origin"
                showNearbyStops
                onSelectStop={({ target, id, name: stopName, latitude, longitude }) => {
                  const stop = {
                    id,
                    name: stopName ?? t('map.selected_stop'),
                    latitude: latitude ?? 0,
                    longitude: longitude ?? 0,
                  }
                  if (target === 'origin') planner.setOriginStop(stop)
                  else planner.setDestinationStop(stop)
                }}
              />
              <div className="landing-map__floating-card">
                <div className="row" style={{ gap: 8 }}>
                  <Icon name="plan" size={16} aria-hidden="true" style={{ color: 'var(--p600)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink900)' }}>
                      {isRtl ? 'خريطة شبكة القاهرة التفاعلية' : 'Live Interactive Cairo Network'}
                    </div>
                    <div className="t-caption">
                      {isRtl ? 'انقر على أي محطة لتحديدها في مخطط الرحلة' : 'Click any transit station to set origin or destination'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Real Network Metrics Strip ─── */}
      <section className="landing-section landing-section--stats" aria-label="Network Coverage Statistics">
        <div className="landing-container">
          <div className="landing-stats-grid">
            <div className="landing-stat-card">
              <span className="landing-stat-card__icon" style={{ background: 'var(--p50)', color: 'var(--p700)' }}>
                <Icon name="pin" size={22} />
              </span>
              <div>
                <div className="landing-stat-card__num t-num">
                  {coverage.stops != null ? coverage.stops.toLocaleString() : '3,025+'}
                </div>
                <div className="landing-stat-card__label">
                  {isRtl ? 'محطة وموقف مواصلات موثق' : 'Verified Transit Stops'}
                </div>
              </div>
            </div>

            <div className="landing-stat-card">
              <span className="landing-stat-card__icon" style={{ background: 'var(--s50)', color: 'var(--s700)' }}>
                <Icon name="route" size={22} />
              </span>
              <div>
                <div className="landing-stat-card__num t-num">
                  {coverage.routes != null ? coverage.routes.toLocaleString() : '1,014+'}
                </div>
                <div className="landing-stat-card__label">
                  {isRtl ? 'خط سير مسجل ومنظم' : 'Mapped Transit Routes'}
                </div>
              </div>
            </div>

            <div className="landing-stat-card">
              <span className="landing-stat-card__icon" style={{ background: 'var(--a100)', color: 'var(--a800)' }}>
                <Icon name="modeMetro" size={22} />
              </span>
              <div>
                <div className="landing-stat-card__num t-num">5</div>
                <div className="landing-stat-card__label">
                  {isRtl ? 'وسائط نقل متكاملة' : 'Integrated Transit Modes'}
                </div>
              </div>
            </div>

            <div className="landing-stat-card">
              <span className="landing-stat-card__icon" style={{ background: alerts.length > 0 ? 'var(--w50)' : 'var(--p50)', color: alerts.length > 0 ? 'var(--w800)' : 'var(--p700)' }}>
                <Icon name="alerts" size={22} />
              </span>
              <div>
                <div className="landing-stat-card__num t-num">{alerts.length}</div>
                <div className="landing-stat-card__label">
                  {isRtl ? 'تنبيهات خدمة نشطة حالياً' : 'Active Service Alerts'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live Service Alerts Banner (if present) ─── */}
      {alerts.length > 0 && (
        <section id="alerts" className="landing-section landing-section--tight" aria-label="Service Alerts">
          <div className="landing-container">
            <div className="section-head-inline row-between">
              <div className="row" style={{ gap: 8 }}>
                <Icon name="warning" size={18} aria-hidden="true" style={{ color: 'var(--w800)' }} />
                <h2 className="section-title-sm">{isRtl ? 'تنبيهات وحالة الخدمة في القاهرة' : 'Active Cairo Service Alerts'}</h2>
              </div>
              <span className="t-caption">{alerts.length} {isRtl ? 'تنبيهات نشطة' : 'active alerts'}</span>
            </div>
            <div className="stack-sm">
              {alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} severity="warning" title={alert.header_text}>
                  {alert.description_text}
                </Alert>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Section 2: How Wasel Works (4-Step Cycle) ─── */}
      <section id="how-it-works" className="landing-section" aria-labelledby="how-title">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="eyebrow">{isRtl ? 'دورة التنقل الذكية' : 'Intelligent Mobility Engine'}</span>
            <h2 id="how-title" className="landing-section-title">
              {isRtl ? 'كيف يعمل تطبيق واصل مصر؟' : 'How Wasel Egypt Works'}
            </h2>
            <p className="landing-section-lede">
              {isRtl
                ? 'منظومة متكاملة تأخذك من نقطة انطلاقك وحتى وجهتك بكل ثقة، مع متابعة حية وحلول فورية لأي طوارئ.'
                : 'A seamless journey lifecycle that guides you from start to finish with proactive tracking and instant recovery.'}
            </p>
          </div>

          <div className="how-steps-grid">
            {STEPS.map((step) => (
              <div key={step.num} className="how-step-card">
                <div className="how-step-card__top">
                  <span className="how-step-card__num t-num">{step.num}</span>
                  <span className="how-step-card__icon">
                    <Icon name={step.icon} size={22} />
                  </span>
                </div>
                <h3 className="how-step-card__title">
                  {isRtl ? step.fallbackTitleAr : step.fallbackTitleEn}
                </h3>
                <p className="how-step-card__body">
                  {isRtl ? step.fallbackBodyAr : step.fallbackBodyEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 3: Multi-Modal Transit Coverage ─── */}
      <section id="modes" className="landing-section landing-section--alt" aria-labelledby="modes-title">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="eyebrow">{isRtl ? 'تغطية شاملة للقاهرة' : 'Comprehensive Network'}</span>
            <h2 id="modes-title" className="landing-section-title">
              {isRtl ? 'وسائل النقل المدعومة في واصل' : 'Supported Transit Modes'}
            </h2>
            <p className="landing-section-lede">
              {t('landing.modes_lede')}
            </p>
          </div>

          <div className="modes-cards-grid">
            {TRANSIT_MODES.map((mode) => (
              <div key={mode.id} className="transit-mode-card">
                <div className="transit-mode-card__top">
                  <span className="transit-mode-card__icon-wrap" style={{ background: mode.color }}>
                    <Icon name={mode.icon} size={22} style={{ color: '#fff' }} />
                  </span>
                  <span className="transit-mode-card__badge" style={{ color: mode.color, borderColor: mode.color }}>
                    {mode.badge}
                  </span>
                </div>
                <h3 className="transit-mode-card__title">
                  {isRtl ? mode.nameAr : mode.nameEn}
                </h3>
                <p className="transit-mode-card__desc">
                  {isRtl ? mode.descAr : mode.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 4: Live Cairo Metro Showcase ─── */}
      <section id="network" className="landing-section" aria-labelledby="metro-network-title">
        <div className="landing-container">
          <div className="row-between" style={{ marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="eyebrow">{isRtl ? 'العمود الفقري للنقل' : 'Network Backbone'}</span>
              <h2 id="metro-network-title" className="landing-section-title" style={{ margin: '4px 0 0' }}>
                {isRtl ? 'خطوط مترو القاهرة الكبرى' : 'Greater Cairo Metro Lines'}
              </h2>
            </div>
            <Link to="/search" className="btn btn--secondary btn--sm">
              <Icon name="search" size={14} aria-hidden="true" />
              <span>{isRtl ? 'استعراض كل الخطوط والمحطات' : 'Browse All Lines & Stops'}</span>
            </Link>
          </div>

          {loadingLines ? (
            <div className="line-grid">
              <Skeleton height={140} />
              <Skeleton height={140} />
              <Skeleton height={140} />
            </div>
          ) : metroLines.length > 0 ? (
            <div className="line-grid">
              {metroLines.map((line, i) => (
                <LineCard key={line.id} line={line} index={i} />
              ))}
            </div>
          ) : (
            <div className="line-grid">
              {[
                { id: 1, line: 'Line 1', name: 'Helwan — New Marg', from: 'Helwan', to: 'New Marg', stopCount: 35, color: '#c62828' },
                { id: 2, line: 'Line 2', name: 'Shubra El-Kheima — El-Mounib', from: 'Shubra El-Kheima', to: 'El-Mounib', stopCount: 20, color: '#e07c00' },
                { id: 3, line: 'Line 3', name: 'Adly Mansour — Kit Kat / Rod El Farag', from: 'Adly Mansour', to: 'Kit Kat', stopCount: 34, color: '#1565c0' },
              ].map((line, i) => (
                <LineCard key={line.id} line={line} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 5: Why Wasel is Different ─── */}
      <section id="intelligence" className="landing-section landing-section--alt" aria-labelledby="why-title">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="eyebrow">{isRtl ? 'الذكاء التقني' : 'Technical Intelligence'}</span>
            <h2 id="why-title" className="landing-section-title">
              {isRtl ? 'لماذا يتميز واصل مصر عن الخرائط التقليدية؟' : 'Why Wasel Outperforms Generic Map Apps'}
            </h2>
            <p className="landing-section-lede">
              {isRtl
                ? 'مصمم خصيصاً ليناسب واقع شبكة المواصلات المصرية، مع حسابات دقيقة للتكلفة والتردد وتغييرات المسار.'
                : 'Tailor-engineered for Egyptian mobility realities with exact fare tiers, headway patterns, and automated detour resilience.'}
            </p>
          </div>

          <div className="intelligence-grid">
            {INTELLIGENCE_POINTS.map((pt) => (
              <div key={pt.icon} className="intelligence-card">
                <div className="intelligence-card__icon-wrap">
                  <Icon name={pt.icon} size={20} />
                </div>
                <div>
                  <h3 className="intelligence-card__title">
                    {isRtl ? pt.titleAr : pt.titleEn}
                  </h3>
                  <p className="intelligence-card__desc">
                    {isRtl ? pt.descAr : pt.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 6: Community Trust & Verified Reports ─── */}
      <section id="trust" className="landing-section" aria-labelledby="trust-section-title">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="eyebrow">{isRtl ? 'مجتمع الركاب' : 'Community Powered'}</span>
            <h2 id="trust-section-title" className="landing-section-title">
              {isRtl ? 'بلاغات لحظية وتصنيف ثقة للركاب' : 'Real-Time Reports & Community Trust'}
            </h2>
            <p className="landing-section-lede">
              {isRtl
                ? 'شارك تقارير الزحام والأعطال وساعد آلاف الركاب يومياً مع كسب نقاط الثقة المعتمدة.'
                : 'Crowdsourced incident reports for delays, crowding, and service updates, backed by automated moderation and trust scores.'}
            </p>
          </div>

          <div className="feature-grid feature-grid--two">
            <article className="feature-card" style={{ border: '1px solid var(--line)' }}>
              <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--s50)', color: 'var(--s700)' }}>
                <Icon name="shield" size={24} />
              </span>
              <h3 className="feature-card__title">
                {isRtl ? 'تدقيق البلاغات الإداري والمجتمعي' : 'Moderated & Community-Verified Reports'}
              </h3>
              <p className="feature-card__body">
                {isRtl
                  ? 'كل بلاغ يتم التحقق منه ومراجعته لضمان دقة المعلومات قبل تنبيه الركاب على نفس الخطوط.'
                  : 'Every report is verified through community upvotes and administrative checks to maintain trustworthy network updates.'}
              </p>
            </article>

            <article className="feature-card" style={{ border: '1px solid var(--line)' }}>
              <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--a100)', color: 'var(--a800)' }}>
                <Icon name="community" size={24} />
              </span>
              <h3 className="feature-card__title">
                {isRtl ? 'نقاط الثقة التراكمية للركاب' : 'Cumulative Passenger Trust Score'}
              </h3>
              <p className="feature-card__body">
                {isRtl
                  ? 'الركاب النشطون يحصلون على شارات ثقة متقدمة تزيد من سرعة اعتماد بلاغاتهم وتأثيرها على الشبكة.'
                  : 'Active contributors build a progressive trust score, elevating their report priority and benefiting thousands of commuters.'}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Final High-Impact CTA Banner ─── */}
      <section className="landing-section landing-section--cta" aria-label="Get Started">
        <div className="landing-container">
          <div className="landing-cta-box">
            <div className="landing-cta-box__glow" aria-hidden="true" />
            <div className="landing-cta-box__content">
              <span className="eyebrow" style={{ color: 'var(--a500)', background: 'rgba(255,255,255,0.1)' }}>
                {isRtl ? 'ابدأ الآن مجاناً' : 'Get Started for Free'}
              </span>
              <h2 className="landing-cta-box__title">
                {isRtl ? 'جاهز لتجربة تنقل أسهل وأذكى في مصر؟' : 'Ready to commute smarter across Egypt?'}
              </h2>
              <p className="landing-cta-box__body">
                {isRtl
                  ? 'انضم لآلاف الركاب واستمتع بتخطيط دقيق وتتبع حي لرحلاتك اليومية في القاهرة.'
                  : 'Join thousands of daily commuters and experience reliable transit planning, live guidance, and 1-click recovery.'}
              </p>
              <div className="landing-cta-box__actions">
                <Link to="/search" style={{ textDecoration: 'none' }}>
                  <Button size="lg" variant="primary">
                    <Icon name="search" size={18} aria-hidden="true" />
                    <span>{isRtl ? 'ابحث عن رحلة الآن' : 'Plan a Journey Now'}</span>
                  </Button>
                </Link>
                {!isAuthenticated ? (
                  <Link to="/register" style={{ textDecoration: 'none' }}>
                    <Button size="lg" variant="secondary">
                      <Icon name="sparkles" size={18} aria-hidden="true" />
                      <span>{isRtl ? 'إنشاء حساب مجاني' : 'Create Free Account'}</span>
                    </Button>
                  </Link>
                ) : (
                  <Link to="/home" style={{ textDecoration: 'none' }}>
                    <Button size="lg" variant="secondary">
                      <Icon name="home" size={18} aria-hidden="true" />
                      <span>{isRtl ? 'لوحة التحكم الرئيسية' : 'Go to Dashboard'}</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 8: Professional Multi-Column Footer ─── */}
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer__inner">
          <div className="site-footer__grid">
            <div className="site-footer__brand-col">
              <Link to="/" aria-label="Wasel Egypt home" style={{ textDecoration: 'none' }}>
                <Logo size={32} subtitle="Egypt" />
              </Link>
              <p className="site-footer__tagline">
                {isRtl
                  ? 'منصة النقل الذكي الشاملة لجمهورية مصر العربية — تخطيط، تتبع، واستعادة فورية للمسارات.'
                  : 'Intelligent multi-modal mobility platform for Egypt — smart planning, live navigation, and automated recovery.'}
              </p>
              <div className="site-footer__badges">
                <span className="badge badge--active">GTFS Integrated</span>
                <span className="badge badge--verified">Cairo Metro Aligned</span>
              </div>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.product')}</h3>
              <ul className="site-footer__links">
                <li><Link to="/search">{t('footer.plan')}</Link></li>
                <li><Link to="/home">{t('footer.explore')}</Link></li>
                <li><Link to="/fares">{t('fares.title')}</Link></li>
                <li><Link to="/reports">{t('reports.title')}</Link></li>
                <li><Link to="/notifications">{t('nav.notifications')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.account')}</h3>
              <ul className="site-footer__links">
                <li><Link to="/register">{t('auth.register')}</Link></li>
                <li><Link to="/login">{t('auth.login')}</Link></li>
                <li><Link to="/profile">{t('nav.profile')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.data')}</h3>
              <ul className="site-footer__links">
                <li>
                  <Icon name="external" size={13} aria-hidden="true" />
                  <a href="https://mobilitydatabase.org/feeds/gtfs/mdb-3355" target="_blank" rel="noreferrer">
                    Transit data © Transport for Cairo (CC-BY-NC-SA)
                  </a>
                </li>
                <li>
                  <Icon name="external" size={13} aria-hidden="true" />
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                    Map data © OpenStreetMap contributors
                  </a>
                </li>
                <li>
                  <Icon name="info" size={13} aria-hidden="true" />
                  <span>Cairo Metro timetable schedules derived from published operations</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="site-footer__legal">
            <span>© {new Date().getFullYear()} Wasel Egypt (واصل مصر). All rights reserved.</span>
            <button
              type="button"
              className="chip"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={`Switch language to ${language === 'en' ? 'Arabic' : 'English'}`}
            >
              <Icon name="language" size={15} aria-hidden="true" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
