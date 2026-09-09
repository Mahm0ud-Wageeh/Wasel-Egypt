import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/LanguageContext'
import { Spinner } from '../ui/Feedback'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { getUnreadCount } from '../../api/notifications'
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

/**
 * Passenger shell — mobile bottom tab bar; on desktop (≥1024px) the tab
 * bar becomes a top navigation row inside the centered column.
 * `flush` pages (map/tracking) remove page padding.
 */
export function PassengerLayout({ flush = false, title }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0))
    } else {
      setUnreadCount(0)
    }
  }, [isAuthenticated])

  return (
    <div className={`app-shell${flush ? ' app-shell--flush' : ''}`}>
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
      <nav className="tabbar" aria-label="Primary">
        {/* Brand shown in the desktop top-nav row only */}
        <span className="tabbar__brand" aria-hidden="true">
          <Brand small />
        </span>
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