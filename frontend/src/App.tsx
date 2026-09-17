import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Bell, CheckCheck, Users, Clock3, Wrench, TriangleAlert, CircleCheck, MapPin, Navigation, Compass, Loader2 } from 'lucide-react'

// Code-split screens: each route loads on demand so first paint stays fast.
const HomeScreen = lazy(() => import('./screens/HomeScreen'))
const LandingScreen = lazy(() => import('./screens/LandingScreen'))
const PlannerScreen = lazy(() => import('./screens/PlannerScreen'))
const JourneyScreen = lazy(() => import('./screens/JourneyScreen'))
const JourneyHistoryScreen = lazy(() => import('./screens/JourneyHistoryScreen'))
const MapScreen = lazy(() => import('./screens/MapScreen'))
const NetworkScreen = lazy(() => import('./screens/NetworkScreen'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'))
const AuthScreen = lazy(() => import('./screens/AuthScreen'))
const MetroScreen = lazy(() => import('./screens/MetroScreen'))
const FaresScreen = lazy(() => import('./screens/FaresScreen'))
const AIScreen = lazy(() => import('./screens/AIScreen'))
const AdminScreen = lazy(() => import('./screens/AdminScreen'))
const TrainScreen = lazy(() => import('./screens/TrainScreen'))
const LRTScreen = lazy(() => import('./screens/LRTScreen'))
const MonorailScreen = lazy(() => import('./screens/MonorailScreen'))
const BRTScreen = lazy(() => import('./screens/BRTScreen'))
const JourneyCompletedScreen = lazy(() => import('./screens/JourneyCompletedScreen'))
const SystemStatesScreen = lazy(() => import('./screens/SystemStatesScreen'))

function RouteLoader({ label }: { label: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-neutral-400">
      <Loader2 size={28} className="animate-spin text-blue-600" />
      <p className="text-xs font-bold">{label}</p>
    </div>
  )
}
import TopBar from './components/TopBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AiProvider } from './contexts/AiContext'
import { submitReport } from './api/reports'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, ApiNotification } from './api/notifications'
import { saveJourneyFromSearch, startActiveJourney } from './api/activeJourneys'
import { useGeolocation } from './hooks/useGeolocation'
import StationSelectorModal from './components/search/StationSelectorModal'
import type { JourneyPlan } from './api/journeys'
import type { JourneySearchContext } from './screens/PlannerScreen'

const ACTIVE_JOURNEY_ID_KEY = 'wasel.activeJourneyId.v1'
const LAST_SEARCH_KEY = 'wasel.lastSearch.v1'

function loadStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export type Screen =
  | 'landing' | 'home' | 'planner' | 'journey' | 'map' | 'network' | 'profile'
  | 'auth' | 'metro' | 'fares' | 'ai' | 'admin'
  | 'active-journey' | 'notifications' | 'community'
  | 'train' | 'lrt' | 'monorail' | 'brt' | 'journey-completed'
  | 'journey-history' | 'saved-trips' | 'system-states'

export type Lang = 'ar' | 'en'

/** Canonical shareable paths — one per screen (journey aliases active-journey). */
export const SCREEN_PATHS: Record<Screen, string> = {
  landing: '/welcome',
  home: '/',
  planner: '/planner',
  journey: '/journey',
  'active-journey': '/journey/active',
  map: '/map',
  network: '/map',
  profile: '/profile',
  auth: '/auth',
  metro: '/metro',
  fares: '/fares',
  ai: '/ai',
  admin: '/admin',
  notifications: '/notifications',
  community: '/community',
  train: '/train',
  lrt: '/lrt',
  monorail: '/monorail',
  brt: '/brt',
  'journey-completed': '/journey/completed',
  'journey-history': '/journeys/history',
  'saved-trips': '/journeys/saved',
  'system-states': '/system',
}

const PATH_SCREENS: Record<string, Screen> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as Screen]),
) as Record<string, Screen>

export function pathFor(screen: Screen): string {
  return SCREEN_PATHS[screen] ?? '/'
}

export function screenForPath(pathname: string): Screen | null {
  if (PATH_SCREENS[pathname]) return PATH_SCREENS[pathname]
  // Tolerate trailing slashes
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  return PATH_SCREENS[trimmed] ?? null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRouter() {
  const [lang, setLang] = useState<Lang>('ar')
  const [activeJourney, setActiveJourney] = useState(false)
  const [activeJourneyId, setActiveJourneyId] = useState<number | null>(() => loadStored<number>(ACTIVE_JOURNEY_ID_KEY))
  const [lastSearch, setLastSearch] = useState<JourneySearchContext | null>(() => loadStored<JourneySearchContext>(LAST_SEARCH_KEY))
  const [darkMode, setDarkMode] = useState(false)
  const [plannerPrefill, setPlannerPrefill] = useState<{ from: string, to: string }>({
    from: 'الشهداء (رمسيس)',
    to: 'مدينة الفنون والثقافة (العاصمة)',
  })

  const handlePrefillPlanner = useCallback((from: string, to: string) => {
    setPlannerPrefill({ from, to })
  }, [])

  const navigate = useNavigate()
  const nav = useCallback((s: Screen) => {
    navigate(pathFor(s))
  }, [navigate])

  return (
    <AiProvider onNavigate={nav} onPrefillPlanner={handlePrefillPlanner}>
      <AppShell
        lang={lang}
        setLang={setLang}
        nav={nav}
        activeJourney={activeJourney}
        setActiveJourney={setActiveJourney}
        activeJourneyId={activeJourneyId}
        setActiveJourneyId={(id) => {
          setActiveJourneyId(id)
          try {
            if (id == null) localStorage.removeItem(ACTIVE_JOURNEY_ID_KEY)
            else localStorage.setItem(ACTIVE_JOURNEY_ID_KEY, JSON.stringify(id))
          } catch { /* ignore */ }
        }}
        lastSearch={lastSearch}
        setLastSearch={(s) => {
          setLastSearch(s)
          try {
            if (s == null) localStorage.removeItem(LAST_SEARCH_KEY)
            else localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(s))
          } catch { /* ignore */ }
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        plannerPrefill={plannerPrefill}
        onPrefillPlanner={handlePrefillPlanner}
      />
    </AiProvider>
  )
}

/**
 * Scroll restoration: every route change returns to the top.
 */

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function AppShell({
  lang,
  setLang,
  nav,
  activeJourney,
  setActiveJourney,
  activeJourneyId,
  setActiveJourneyId,
  lastSearch,
  setLastSearch,
  darkMode,
  setDarkMode,
  plannerPrefill,
  onPrefillPlanner,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  nav: (s: Screen) => void
  activeJourney: boolean
  setActiveJourney: (v: boolean) => void
  activeJourneyId: number | null
  setActiveJourneyId: (id: number | null) => void
  lastSearch: JourneySearchContext | null
  setLastSearch: (s: JourneySearchContext | null) => void
  darkMode: boolean
  setDarkMode: (fn: (d: boolean) => boolean) => void
  plannerPrefill: { from: string, to: string }
  onPrefillPlanner: (from: string, to: string) => void
}) {
  const location = useLocation()

  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const toggleDark = () => setDarkMode(d => !d)

  const screen = screenForPath(location.pathname)
  const isLanding = screen === 'landing'
  // Unknown paths render the honest 404 below with full chrome hidden.
  const hideChrome = screen === 'auth' || isLanding || screen === null

  const rootBg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'

  if (isLanding) {
    return (
      <div
        dir={dir}
        data-theme={darkMode ? 'dark' : 'light'}
        style={{ fontFamily: lang === 'ar' ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif" }}
      >
        <ScrollToTop />
        <Suspense fallback={<RouteLoader label={t('جاري التحميل…', 'Loading…')} />}>
          <LandingScreen lang={lang} setLang={setLang} t={t} nav={nav} />
        </Suspense>
      </div>
    )
  }

  return (
    <div
      dir={dir}
      className={`min-h-screen ${rootBg} flex flex-col`}
      style={{ fontFamily: lang === 'ar' ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif" }}
      data-theme={darkMode ? 'dark' : 'light'}
    >
      <ScrollToTop />
      <ShellChrome
        screen={screen}
        nav={nav}
        lang={lang}
        setLang={setLang}
        t={t}
        activeJourney={activeJourney}
        setActiveJourney={setActiveJourney}
        activeJourneyId={activeJourneyId}
        setActiveJourneyId={setActiveJourneyId}
        lastSearch={lastSearch}
        setLastSearch={setLastSearch}
        darkMode={darkMode}
        toggleDark={toggleDark}
        hideChrome={hideChrome}
        plannerPrefill={plannerPrefill}
        onPrefillPlanner={onPrefillPlanner}
      />
    </div>
  )
}

function ShellChrome({
  screen,
  nav,
  lang,
  setLang,
  t,
  activeJourney,
  setActiveJourney,
  activeJourneyId,
  setActiveJourneyId,
  lastSearch,
  setLastSearch,
  darkMode,
  toggleDark,
  hideChrome,
  plannerPrefill,
  onPrefillPlanner,
}: {
  screen: Screen | null
  nav: (s: Screen) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (ar: string, en: string) => string
  activeJourney: boolean
  setActiveJourney: (v: boolean) => void
  activeJourneyId: number | null
  setActiveJourneyId: (id: number | null) => void
  lastSearch: JourneySearchContext | null
  setLastSearch: (s: JourneySearchContext | null) => void
  darkMode: boolean
  toggleDark: () => void
  hideChrome: boolean
  plannerPrefill: { from: string, to: string }
  onPrefillPlanner: (from: string, to: string) => void
}) {
  const { isLoggedIn } = useAuth()
  const chromeScreen: Screen = screen ?? 'home'

  // Start a REAL tracked journey when possible (auth + resolved coords),
  // otherwise run the honest on-device demo mode.
  const handleStartJourney = useCallback(async (_route: JourneyPlan, search: JourneySearchContext | null) => {
    setLastSearch(search)
    if (isLoggedIn && search) {
      try {
        const saved = await saveJourneyFromSearch({
          origin_lat: search.origin_lat,
          origin_lng: search.origin_lng,
          destination_lat: search.destination_lat,
          destination_lng: search.destination_lng,
          option_index: search.option_index,
        })
        const journeyId = Number(saved?.id ?? saved?.journey?.id)
        if (Number.isFinite(journeyId)) {
          const active = await startActiveJourney(journeyId)
          const activeId = Number(active?.id)
          if (Number.isFinite(activeId)) {
            setActiveJourneyId(activeId)
            setActiveJourney(true)
            return
          }
        }
      } catch {
        /* fall through to demo mode */
      }
    }
    setActiveJourneyId(null)
    setActiveJourney(true)
  }, [isLoggedIn, setActiveJourneyId, setLastSearch, setActiveJourney])

  const [quickSearchOpen, setQuickSearchOpen] = useState(false)

  return (
    <>
      {!hideChrome && (
        <TopBar
          lang={lang}
          setLang={setLang}
          t={t}
          nav={nav}
          screen={chromeScreen}
          isLoggedIn={isLoggedIn}
          activeJourney={activeJourney}
          darkMode={darkMode}
          toggleDark={toggleDark}
          onOpenSearch={() => setQuickSearchOpen(true)}
        />
      )}

      <div className="flex flex-1">
        <main className="flex-1 min-w-0">
          <Suspense fallback={<RouteLoader label={t('جاري تحميل الصفحة…', 'Loading page…')} />}>
          <Routes>
            <Route path="/" element={
              <HomeScreen
                lang={lang}
                t={t}
                nav={nav}
                activeJourney={activeJourney}
                setActiveJourney={setActiveJourney}
                onPrefillPlanner={onPrefillPlanner}
              />
            } />
            <Route path="/welcome" element={<LandingScreen lang={lang} setLang={setLang} t={t} nav={nav} />} />
            <Route path="/planner" element={
              <PlannerScreen
                lang={lang}
                t={t}
                nav={nav}
                initialFrom={plannerPrefill.from}
                initialTo={plannerPrefill.to}
                onStartJourney={handleStartJourney}
                darkMode={darkMode}
              />
            } />
            <Route path="/journey" element={
              <JourneyScreen
                lang={lang}
                t={t}
                nav={nav}
                active={activeJourney}
                activeJourneyId={activeJourneyId}
                lastSearch={lastSearch}
                onEndJourney={() => {
                  setActiveJourney(false)
                  setActiveJourneyId(null)
                  nav('journey-completed')
                }}
                darkMode={darkMode}
              />
            } />
            <Route path="/journey/active" element={
              <JourneyScreen
                lang={lang}
                t={t}
                nav={nav}
                active={activeJourney || true}
                activeJourneyId={activeJourneyId}
                lastSearch={lastSearch}
                onEndJourney={() => {
                  setActiveJourney(false)
                  setActiveJourneyId(null)
                  nav('journey-completed')
                }}
                darkMode={darkMode}
              />
            } />
            <Route path="/map" element={
              <MapScreen
                lang={lang}
                t={t}
                nav={nav}
                onPrefillPlanner={onPrefillPlanner}
                darkMode={darkMode}
              />
            } />
            <Route path="/network" element={<Navigate to="/map" replace />} />
            <Route path="/profile" element={<ProfileScreen lang={lang} t={t} nav={nav} />} />
            <Route path="/auth" element={<AuthScreen lang={lang} t={t} nav={nav} setLoggedIn={() => {}} />} />
            <Route path="/metro" element={<MetroScreen lang={lang} t={t} nav={nav} onPrefillPlanner={onPrefillPlanner} darkMode={darkMode} />} />
            <Route path="/fares" element={<FaresScreen lang={lang} t={t} nav={nav} />} />
            <Route path="/ai" element={<AIScreen lang={lang} t={t} nav={nav} />} />
            <Route path="/admin" element={<AdminScreen lang={lang} t={t} nav={nav} setLang={setLang} />} />
            <Route path="/train" element={<TrainScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/lrt" element={<LRTScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/monorail" element={<MonorailScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/brt" element={<BRTScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/journey/completed" element={<JourneyCompletedScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/journeys/history" element={<JourneyHistoryScreen lang={lang} t={t} nav={nav} darkMode={darkMode} mode="history" />} />
            <Route path="/journeys/saved" element={<JourneyHistoryScreen lang={lang} t={t} nav={nav} darkMode={darkMode} mode="saved" />} />
            <Route path="/system" element={<SystemStatesScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/notifications" element={<NotificationsScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            <Route path="/community" element={<CommunityScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
            {/* Legacy aliases */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/active-journey" element={<Navigate to="/journey/active" replace />} />
            <Route path="/journey-history" element={<Navigate to="/journeys/history" replace />} />
            <Route path="/saved-trips" element={<Navigate to="/journeys/saved" replace />} />
            <Route path="/journey-completed" element={<Navigate to="/journey/completed" replace />} />
            <Route path="/system-states" element={<Navigate to="/system" replace />} />
            <Route path="/landing" element={<Navigate to="/welcome" replace />} />
            <Route path="*" element={<NotFoundScreen lang={lang} t={t} nav={nav} darkMode={darkMode} />} />
          </Routes>
          </Suspense>
        </main>
      </div>

      <StationSelectorModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        onSelect={(sel) => {
          onPrefillPlanner(sel.name, '')
          setQuickSearchOpen(false)
          nav('planner')
        }}
        lang={lang}
        t={t}
      />
    </>
  )
}

function NotFoundScreen({ lang: _lang, t, nav, darkMode }: any) {
  void _lang
  return (
    <div className={`min-h-[60vh] flex flex-col items-center justify-center px-6 text-center ${darkMode ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
      <div className="mb-4 text-blue-200"><Compass size={64} /></div>
      <h1 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>404</h1>
      <p className={`text-sm mb-6 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {t('الصفحة غير موجودة — الرابط قد يكون قديماً أو مكتوباً بشكل خاطئ', 'Page not found — the link may be outdated or mistyped')}
      </p>
      <button
        onClick={() => nav('home')}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg transition-all"
      >
        {t('العودة للرئيسية', 'Back to Home')}
      </button>
    </div>
  )
}

// Notifications — live backend data with honest empty/error states
function NotificationsScreen({ lang, t, nav: _nav, darkMode }: any) {
  void _nav
  const [notifs, setNotifs] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchNotifications()
      setNotifs(list)
      setNeedsLogin(false)
    } catch (err: any) {
      if (err?.status === 401 || err?.isUnauthorized) setNeedsLogin(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const unread = notifs.filter(n => !n.read_at && !n.is_read)
  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-600'

  const titleOf = (n: ApiNotification) =>
    lang === 'ar' ? (n.title_ar || n.title || typeLabel(n.type)) : (n.title_en || n.title || typeLabel(n.type))
  const bodyOf = (n: ApiNotification) =>
    lang === 'ar' ? (n.body_ar || n.body || n.message || '') : (n.body_en || n.body || n.message || '')

  const handleOpen = async (n: ApiNotification) => {
    if (!n.read_at && !n.is_read) {
      try {
        await markNotificationRead(n.id)
        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x))
      } catch { /* stay unread */ }
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setNotifs(prev => prev.map(x => ({ ...x, is_read: true, read_at: new Date().toISOString() })))
    } catch { /* ignore */ }
  }

  return (
    <div className={`min-h-screen ${bg} pb-16`}>
      <div className={`${headerBg} border-b px-4 py-4 shadow-xs`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className={`text-xl font-bold ${textPrimary}`}>{t('مركز الإشعارات والتنبيهات', 'Notifications & Alerts')}</h1>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{unread.length} {t('جديدة', 'new')}</span>
                <button onClick={handleMarkAll} className="text-xs font-bold text-neutral-500 hover:text-blue-600 flex items-center gap-1">
                  <CheckCheck size={14} />
                  {t('تعليم الكل كمقروء', 'Mark all read')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className={`text-xs ${textSecondary}`}>{t('جاري تحميل الإشعارات…', 'Loading notifications…')}</p>
          </div>
        ) : needsLogin ? (
          <div className="p-8 text-center space-y-3">
            <Bell size={40} className="mx-auto text-neutral-300" />
            <p className={`text-sm font-bold ${textPrimary}`}>{t('سجّل الدخول لعرض إشعاراتك', 'Sign in to see your notifications')}</p>
            <p className={`text-xs ${textSecondary}`}>{t('الإشعارات شخصية ومرتبطة بحسابك ورحلاتك وبلاغاتك.', 'Notifications are personal to your account, journeys and reports.')}</p>
          </div>
        ) : notifs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <Bell size={40} className="mx-auto text-neutral-300" />
            <p className={`text-sm font-bold ${textPrimary}`}>{t('لا توجد إشعارات بعد', 'No notifications yet')}</p>
            <p className={`text-xs ${textSecondary}`}>{t('ستصلك تنبيهات الرحلات والانحرافات وحالة بلاغاتك هنا.', 'Journey, deviation and report updates will appear here.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {notifs.map(n => {
              const isUnread = !n.read_at && !n.is_read
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`w-full flex gap-3.5 px-4 py-4 text-start transition-colors ${isUnread ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50/50') : (darkMode ? 'bg-neutral-800' : 'bg-white')}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-neutral-700 text-blue-400' : 'bg-white border border-neutral-200 shadow-xs text-blue-600'}`}>
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-bold ${textPrimary}`}>{titleOf(n)}</p>
                      {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className={`text-xs ${textSecondary} leading-relaxed`}>{bodyOf(n)}</p>
                    <p className={`text-[10px] ${darkMode ? 'text-neutral-500' : 'text-neutral-400'} mt-1`}>
                      {n.created_at ? new Date(n.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function typeLabel(type?: string): string {
  switch (type) {
    case 'journey_started': return 'بدء رحلة'
    case 'journey_deviation': return 'انحراف عن المسار'
    case 'recovery_options_ready': return 'بدائل تعافي جاهزة'
    case 'journey_rerouted': return 'إعادة توجيه'
    case 'journey_completed': return 'اكتمال رحلة'
    case 'journey_cancelled': return 'إلغاء رحلة'
    case 'report_verified': return 'تم التحقق من بلاغك'
    case 'report_rejected': return 'رُفض البلاغ'
    case 'report_resolved': return 'حُلّ البلاغ'
    default: return 'إشعار'
  }
}

function CommunityScreen({ lang, t, nav, darkMode }: any) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState('')
  const [locationName, setLocationName] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [browseOpen, setBrowseOpen] = useState(false)
  const geo = useGeolocation(false)

  const issues = [
    { id: 'crowded', ar: 'ازدحام شديد بالمحطة', en: 'Severe Crowding', Icon: Users },
    { id: 'delay', ar: 'تأخير غير معلن للقطار', en: 'Train Delay', Icon: Clock3 },
    { id: 'breakdown', ar: 'عطل سلم كهربائي أو ماكينة', en: 'Escalator / Gate Fault', Icon: Wrench },
    { id: 'safety', ar: 'ملاحظة أمان أو نظافة', en: 'Safety / Cleanliness', Icon: TriangleAlert },
  ]

  const useMyLocation = () => {
    geo.requestPosition()
  }

  useEffect(() => {
    if ((geo.status === 'granted' || geo.status === 'simulated') && geo.lat != null && geo.lng != null) {
      setCoords({ lat: geo.lat, lng: geo.lng })
      if (!locationName) setLocationName(t('موقعي الحالي', 'My current location'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status])

  const canSubmit = description.trim().length >= 10 && coords != null && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await submitReport({
        issue_type: type,
        description: description.trim(),
        latitude: coords!.lat,
        longitude: coords!.lng,
      })
      setStep(3)
    } catch (err: any) {
      if (err?.status === 401 || err?.isUnauthorized) {
        setError(t('سجّل الدخول أولاً لإرسال البلاغ — البلاغات مرتبطة بحسابك.', 'Please sign in first — reports are linked to your account.'))
      } else if (err?.isValidation) {
        setError(err?.message || t('تحقق من البيانات: الوصف ١٠ أحرف على الأقل والموقع محدد.', 'Check the data: description ≥ 10 chars and location set.'))
      } else {
        setError(t('تعذر إرسال البلاغ — تحقق من الاتصال وحاول مجدداً.', 'Could not submit — check connection and retry.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const headerBg = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'

  return (
    <div className={`min-h-screen ${bg} pb-16`}>
      <div className={`${headerBg} border-b px-4 py-4 shadow-xs`}>
        <div className="max-w-2xl mx-auto">
          <h1 className={`text-xl font-bold ${textPrimary}`}>{t('الإبلاغ عن مشكلة في المحطة أو الخط', 'Report Transit Issue')}</h1>
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-600' : darkMode ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {step === 0 && (
          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>{t('اختار نوع المشكلة التي تواجهها:', 'Select the issue type:')}</p>
            <div className="grid grid-cols-2 gap-3">
              {issues.map(issue => (
                <button
                  key={issue.id}
                  onClick={() => { setType(issue.id); setStep(1) }}
                  className={`p-4 rounded-2xl border-2 text-start transition-all hover:scale-[1.02] ${
                    type === issue.id ? 'border-blue-600 bg-blue-50/50' : `${cardBg} border-neutral-200`
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <issue.Icon size={22} />
                  </div>
                  <p className={`text-xs font-bold ${textPrimary}`}>{lang === 'ar' ? issue.ar : issue.en}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>{t('أين تقع المشكلة؟ نحتاج الموقع الدقيق على الخريطة', 'Where is it? We need the precise map location')}</p>
            <div className="flex gap-2">
              <input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder={t('مثال: محطة الشهداء، رصيف اتجاه المرج...', 'e.g., Shohadaa Station, Platform towards Marg...')}
                className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs font-semibold outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setBrowseOpen(true)}
                className="px-3 py-3 rounded-2xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
              >
                <MapPin size={14} />
                {t('محطة', 'Station')}
              </button>
            </div>
            <button
              onClick={useMyLocation}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold py-3 rounded-2xl text-xs transition-all"
            >
              <Navigation size={15} />
              {coords
                ? t(`تم تحديد الموقع (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`, `Location set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`)
                : geo.status === 'requesting'
                  ? t('جاري تحديد موقعك…', 'Locating you…')
                  : t('استخدام موقعي الحالي (GPS)', 'Use my current location (GPS)')}
            </button>
            {geo.status === 'denied' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                {t('تم رفض إذن الموقع — فعّله من المتصفح أو اختر محطة من زر "محطة".', 'Location denied — enable it in the browser or pick a station.')}
              </p>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!locationName || !coords}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-bold py-3.5 rounded-2xl text-xs transition-all"
            >
              {t('التالي — إضافة التفاصيل', 'Next — Add Details')}
            </button>
            {!coords && (
              <p className={`text-[11px] text-center ${textSecondary}`}>{t('حدد الموقع أولاً (GPS أو محطة) للمتابعة', 'Set the location first (GPS or station) to continue')}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className={`text-xs font-bold ${textSecondary}`}>{t('اوصف المشكلة بإيجاز (١٠ أحرف على الأقل):', 'Describe the issue (min 10 characters):')}</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('اكتب ما تلاحظه لمساعدة باقي الركاب وفريق الصيانة...', 'Describe what you see to help commuters and maintenance...')}
              className="w-full bg-white border border-neutral-200 rounded-2xl p-4 text-xs font-semibold outline-none focus:border-blue-500 h-32 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={`text-[11px] ${description.trim().length >= 10 ? 'text-green-600 font-bold' : textSecondary}`}>
                {description.trim().length} / 10 {t('أحرف على الأقل', 'chars min')}
              </span>
              {coords && (
                <span className={`text-[11px] flex items-center gap-1 ${textSecondary}`}>
                  <MapPin size={12} />
                  {locationName}
                </span>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl" role="alert">
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <span className="animate-spin text-lg">⏳</span> : t('إرسال البلاغ الآن', 'Submit Report')}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CircleCheck size={30} />
            </div>
            <h2 className={`text-xl font-bold ${textPrimary}`}>{t('تم إرسال بلاغك بنجاح!', 'Report Submitted Successfully!')}</h2>
            <p className={`text-xs ${textSecondary} max-w-sm mx-auto leading-relaxed`}>
              {t('شكراً لمساهمتك في تحسين تجربة الركاب في مصر. سيتم فحص البلاغ وتنبيه الركاب المعنيين.', 'Thank you for helping improve transit in Egypt. Your report is under review.')}
            </p>
            <button
              onClick={() => nav('home')}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl text-xs shadow-md shadow-blue-500/20"
            >
              {t('العودة للرئيسية', 'Back to Home')}
            </button>
          </div>
        )}
      </div>

      <StationSelectorModal
        isOpen={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={(sel) => {
          setLocationName(sel.name)
          if (sel.lat && sel.lng) setCoords({ lat: sel.lat, lng: sel.lng })
          setBrowseOpen(false)
        }}
        title={t('اختر المحطة محل البلاغ', 'Select the report station')}
        lang={lang}
        t={t}
        initialQuery={locationName}
      />
    </div>
  )
}
