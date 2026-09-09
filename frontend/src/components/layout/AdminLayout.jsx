import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

/**
 * Admin shell — desktop-first (spec §2.6): a fixed left rail with section
 * navigation on ≥1024px, stacking to a topbar layout on tablets. On phones
 * the passenger tab bar remains the navigation (admin on mobile is a
 * fallback, not the target experience).
 */
const SECTIONS = [
  { to: '/admin', label: 'Dashboard', icon: 'plan', end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: 'track' },
  { to: '/admin/moderation', label: 'Moderation', icon: 'shield' },
  { to: '/admin/users', label: 'Users', icon: 'community' },
]

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-rail" aria-label="Admin sections">
        <div className="admin-rail__brand">
          <Logo size={24} subtitle="Admin" />
        </div>
        <nav className="admin-rail__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) => `admin-rail__link${isActive ? ' is-active' : ''}`}
            >
              <Icon name={s.icon} size={17} aria-hidden="true" />
              <span>{s.label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/home" className="admin-rail__link admin-rail__link--exit">
          <Icon name="arrowLeft" size={17} aria-hidden="true" />
          <span>Back to app</span>
        </NavLink>
      </aside>
      <main id="main-content" className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
