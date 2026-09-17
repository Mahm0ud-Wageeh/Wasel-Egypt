import { useState, useEffect, useCallback } from 'react'
import type { Screen, Lang } from '../App'
import { fetchUnreadCount } from '../api/notifications'
import {
  Search, Bell, Sun, Moon, Menu, X, User, Navigation, Sparkles,
  MapPin, TrainFront, TramFront, CableCar, BusFront, TrainTrack,
  ArrowRight, Ticket, ChevronLeft, ChevronRight
} from 'lucide-react'

interface TopBarProps {
  lang: Lang
  setLang: (l: Lang) => void
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  screen: Screen
  isLoggedIn: boolean
  activeJourney: boolean
  darkMode?: boolean
  toggleDark?: () => void
  onOpenSearch?: () => void
}

export default function TopBar({
  lang,
  setLang,
  t,
  nav,
  screen,
  isLoggedIn,
  activeJourney,
  darkMode = false,
  toggleDark,
  onOpenSearch,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch real notification counter
  useEffect(() => {
    let cancelled = false
    const loadCount = async () => {
      try {
        const cnt = await fetchUnreadCount()
        if (!cancelled) setUnreadCount(cnt)
      } catch {
        /* ignore */
      }
    }
    loadCount()
    const id = setInterval(loadCount, 25000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const handleNav = useCallback((target: Screen) => {
    setMobileMenuOpen(false)
    nav(target)
  }, [nav])

  const navItems: Array<{ id: Screen; label: string; highlight?: boolean }> = [
    { id: 'home', label: t('الرئيسية', 'Home') },
    { id: 'planner', label: t('خطط', 'Plan') },
    { id: 'map', label: t('الخريطة', 'Map') },
    { id: 'fares', label: t('الأسعار', 'Fares') },
    { id: 'ai', label: t('واصل AI', 'Wasel AI'), highlight: true },
  ]

  const isCurrent = (id: Screen) => {
    if (screen === id) return true
    if (id === 'map' && screen === 'network') return true
    if (id === 'home' && screen === 'landing') return true
    return false
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-15 border-b backdrop-blur-md transition-colors ${
          darkMode
            ? 'bg-bg-dark/90 border-border-dark text-white'
            : 'bg-white/90 border-neutral-200 text-navy'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-full max-w-7xl mx-auto gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2 text-start group cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy to-primary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Navigation size={18} className="rotate-45" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'El Messiri', sans-serif" }}>
                  {lang === 'ar' ? 'واصل' : 'Wasel'}
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-primary">
                  {lang === 'ar' ? 'مصر' : 'Egypt'}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links (md+) */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl border transition-colors relative">
            {navItems.map((item) => {
              const active = isCurrent(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all relative ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : darkMode
                      ? 'text-neutral-300 hover:text-white hover:bg-surface-dark'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {item.highlight && <Sparkles size={13} className={active ? 'text-white' : 'text-primary'} />}
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Active Journey Pulsing Pill */}
            {activeJourney && (
              <button
                onClick={() => handleNav('active-journey')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-xs transition-colors animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="hidden sm:inline">{t('رحلة نشطة', 'Active Trip')}</span>
              </button>
            )}

            {/* Quick Search */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                aria-label={t('بحث عن محطة', 'Search stops')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  darkMode ? 'hover:bg-surface-dark text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                <Search size={16} />
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className={`text-xs font-bold px-2 py-1 rounded-xl border transition-colors ${
                darkMode
                  ? 'border-border-dark text-neutral-300 hover:bg-surface-dark'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
              title={t('تبديل اللغة', 'Switch Language')}
            >
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>

            {/* Dark Mode Toggle */}
            {toggleDark && (
              <button
                onClick={toggleDark}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  darkMode ? 'hover:bg-surface-dark text-yellow-400' : 'hover:bg-neutral-100 text-neutral-600'
                }`}
                title={darkMode ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}

            {/* Notifications with real counter */}
            <button
              onClick={() => handleNav('notifications')}
              className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-surface-dark text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title={t('الإشعارات', 'Notifications')}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Auth / Profile Pill */}
            {isLoggedIn ? (
              <button
                onClick={() => handleNav('profile')}
                className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs hover:opacity-95 transition-opacity"
                title={t('حسابي', 'My Profile')}
              >
                <User size={15} />
              </button>
            ) : (
              <button
                onClick={() => handleNav('auth')}
                className="text-xs font-bold bg-primary hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-xs transition-all"
              >
                {t('دخول', 'Sign In')}
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className={`md:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                darkMode ? 'hover:bg-surface-dark text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              aria-label={t('القائمة الرئيسية', 'Main Menu')}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Pure transform transition, exactly 200ms) */}
      <div
        className={`fixed inset-0 z-50 md:hidden pointer-events-none transition-opacity duration-200 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Drawer Content */}
        <div
          className={`absolute top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-72 max-w-[80vw] shadow-2xl p-5 flex flex-col justify-between transition-transform duration-200 ease-out ${
            darkMode ? 'bg-bg-dark text-white border-e border-border-dark' : 'bg-white text-navy'
          } ${
            mobileMenuOpen
              ? 'translate-x-0'
              : lang === 'ar'
              ? 'translate-x-full'
              : '-translate-x-full'
          }`}
        >
          <div className="space-y-5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
                  <Navigation size={18} className="rotate-45" />
                </div>
                <span className="font-bold text-base" style={{ fontFamily: "'El Messiri', sans-serif" }}>
                  {lang === 'ar' ? 'واصل مصر' : 'Wasel Egypt'}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Core Navigation Links */}
            <nav className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 px-2">
                {t('التنقل الأساسي', 'Main Navigation')}
              </p>
              {navItems.map((item) => {
                const active = isCurrent(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors text-start ${
                      active
                        ? 'bg-primary text-white'
                        : darkMode
                        ? 'text-neutral-300 hover:bg-surface-dark'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.highlight && <Sparkles size={14} className={active ? 'text-white' : 'text-primary'} />}
                      {item.label}
                    </span>
                    {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                  </button>
                )
              })}
            </nav>

            {/* Transport Modes Directory */}
            <div className="flex flex-col gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 px-2">
                {t('وسائل النقل', 'Transit Modes')}
              </p>
              {[
                { id: 'metro' as Screen, label: t('مترو الأنفاق', 'Metro'), Icon: TrainFront },
                { id: 'lrt' as Screen, label: 'LRT العاصمة', Icon: TramFront },
                { id: 'monorail' as Screen, label: t('المونوريل', 'Monorail'), Icon: CableCar },
                { id: 'train' as Screen, label: t('سكك حديد مصر', 'Rail (ENR)'), Icon: TrainTrack },
                { id: 'brt' as Screen, label: 'حافلات BRT', Icon: BusFront },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-start ${
                    screen === id
                      ? 'bg-blue-500/15 text-primary'
                      : darkMode ? 'text-neutral-400 hover:bg-surface-dark' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{t('المظهر', 'Appearance')}</span>
              {toggleDark && (
                <button
                  onClick={toggleDark}
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                    darkMode ? 'border-border-dark text-yellow-400' : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{darkMode ? t('فاتح', 'Light') : t('داكن', 'Dark')}</span>
                </button>
              )}
            </div>

            {isLoggedIn ? (
              <button
                onClick={() => handleNav('profile')}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-xs font-bold"
              >
                <User size={14} />
                <span>{t('حسابي الشخصي', 'My Profile')}</span>
              </button>
            ) : (
              <button
                onClick={() => handleNav('auth')}
                className="w-full bg-primary hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {t('تسجيل الدخول / حساب جديد', 'Sign In / Register')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
