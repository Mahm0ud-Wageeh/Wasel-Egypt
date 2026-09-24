import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/LanguageContext'
import { Spinner } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { getUnreadCount } from '../../api/notifications'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useState, useEffect } from 'react'

const TABS = [
  { to: '/home', icon: 'home', key: 'nav.home' },
  { to: '/search', icon: 'search', key: 'nav.search' },
  { to: '/reports', icon: 'reports', key: 'nav.reports' },
  { to: '/notifications', icon: 'alerts', key: 'nav.notifications' },
  { to: '/profile', icon: 'profile', key: 'nav.profile' },
]

function Brand({ small = false }) {
  return (
    <Logo size={small ? 24 : 28} subtitle="Egypt" />
  )
}

function UnreadBadge({ count }) {
  if (!count || count <= 0) return null
  return (
    <span className="unread-badge" aria-label={`${count} unread`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Desktop top navbar (≥1024px only — see .topnav responsive gating).
 * Brand lockup · primary links with active rail · language · planner CTA.
 * The mobile `.tabbar` below stays rendered for small screens (and tests).
 */
function TopNavbar({ unreadCount, hidden }) {
  const { t, language, setLanguage } = useI18n()
  const { user } = useAuth()
  const initial = (user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase()

  if (hidden) return null

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <Link to="/" className="topnav__brand" aria-label="Wasel Egypt home">
          <Brand />
        </Link>

        <nav className="topnav__links" aria-label="Primary">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}
            >
              <span className="topnav__link-icon" aria-hidden="true" style={{ position: 'relative' }}>
                <Icon name={tab.icon} size={18} />
                {tab.to === '/notifications' && <UnreadBadge count={unreadCount} />}
              </span>
              {t(tab.key)}
            </NavLink>
          ))}
        </nav>

        <div className="topnav__actions">
          <button
            type="button"
            className="chip"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            aria-label={`Switch language to ${language === 'en' ? 'Arabic' : 'English'}`}
          >
            <Icon name="language" size={15} aria-hidden="true" />
            {language === 'en' ? 'العربية' : 'English'}
          </button>
          <Link to="/search" className="btn btn--primary btn--sm topnav__cta">
            <Icon name="search" size={15} aria-hidden="true" />
            {t('footer.plan')}
          </Link>
          <Link
            to="/profile"
            className="topnav__avatar"
            aria-label={t('nav.profile')}
            title={user?.name ?? user?.email ?? t('nav.profile')}
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  )
}

/**
 * Passenger shell — mobile bottom tab bar; on desktop (≥1024px) a full
 * top navbar takes over and the tab bar is hidden (CSS-gated, still
 * rendered). `flush` pages (map/tracking) remove page padding.
 */
export function PassengerLayout({ flush = false, title }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  // Mirror the CSS breakpoint for the `hidden` attribute: exactly one
  // nav surface is in the accessibility tree at a time (topnav ≥1024px,
  // tabbar below). The attribute pairs with the CSS display gating.
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0))
    } else {
      setUnreadCount(0)
    }
  }, [isAuthenticated])

  return (
    <div className={`app-shell${flush ? ' app-shell--flush' : ''}`}>
      <TopNavbar unreadCount={unreadCount} hidden={!isDesktop} />
      {title && (
        <header className="topbar">
          <button className="topbar__back" onClick={() => navigate(-1)} aria-label="Back">
            ←
          </button>
          <span className="topbar__title">{title}</span>
        </header>
      )}
      <div id="main-content" className="app-shell__body">
        <Outlet />
      </div>
      <nav className="tabbar" aria-label="Primary" hidden={isDesktop}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tabbar__tab${isActive ? ' is-active' : ''}`}
          >
            <span className="tabbar__tab-icon" aria-hidden="true" style={{ position: 'relative' }}>
              <Icon name={tab.icon} size={20} />
              {tab.to === '/notifications' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--e700)',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '0 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  height: '18px',
                  minWidth: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** Simple page header with back button (sub-pages inside the shell). */
export function TopBar({ title, onBack }) {
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <button
        className="topbar__back"
        aria-label="Back"
        onClick={onBack ?? (() => navigate(-1))}
      >
        ←
      </button>
      <span className="topbar__title">{title}</span>
    </header>
  )
}

/** Full-screen spinner used while the auth session is being restored. */
export function BootScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spinner inline />
    </div>
  )
}

export { Brand }
