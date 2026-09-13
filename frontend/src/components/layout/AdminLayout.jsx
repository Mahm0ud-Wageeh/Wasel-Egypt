import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

/**
 * Admin shell — desktop-first (spec §2.6): a fixed left rail with section
 * navigation on ≥1024px, stacking to a topbar layout on tablets. On phones
 * the passenger tab bar remains the navigation (admin on mobile is a
 * fallback, not the target experience).
 */
/**
 * Control-center sections, grouped by domain (the rail renders group labels).
 * Every target is server-authorized independently (role/permission gates).
 */
const GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'plan', end: true }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: 'track' },
      { to: '/admin/moderation', label: 'Moderation', icon: 'shield' },
    ],
  },
  {
    label: 'Data & network',
    items: [
      { to: '/admin/fares', label: 'Fares', icon: 'wallet' },
      { to: '/admin/network', label: 'Network', icon: 'layers' },
    ],
  },
  {
    label: 'People',
    items: [{ to: '/admin/users', label: 'Users & roles', icon: 'community' }],
  },
]

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-rail" aria-label="Admin sections">
        <div className="admin-rail__brand">
          <Logo size={24} subtitle="Admin" />
        </div>
        <nav className="admin-rail__nav">
          {GROUPS.map((group) => (
            <div key={group.label} className="admin-rail__group">
              <span className="admin-rail__group-label">{group.label}</span>
              {group.items.map((s) => (
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
            </div>
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
