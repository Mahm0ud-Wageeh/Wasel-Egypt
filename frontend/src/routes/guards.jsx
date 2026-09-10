import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BootScreen } from '../components/layout/PassengerLayout'

/** Requires an authenticated session; remembers the attempted location. */
export function ProtectedRoute() {
  const { isAuthenticated, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <BootScreen />
  if (!isAuthenticated) {
    // Pass through any router state (e.g. planner prefillStop) so the
    // post-login landing can honor it instead of dropping user intent.
    return <Navigate to="/login" replace state={{ ...(location.state ?? {}), from: location.pathname }} />
  }
  return <Outlet />
}

/** Auth pages redirect to home when already authenticated. */
export function GuestRoute() {
  const { isAuthenticated, status } = useAuth()

  if (status === 'loading') return <BootScreen />
  if (isAuthenticated) return <Navigate to="/home" replace />
  return <Outlet />
}

/** Role-gated area (e.g. future admin module). roles: array of role names. */
export function RoleRoute({ roles }) {
  const { isAuthenticated, status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <BootScreen />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ ...(location.state ?? {}), from: location.pathname }} />
  }

  const userRoles = Array.isArray(user?.roles) ? user.roles.map((r) => r.name) : []
  const allowed = roles.some((role) => userRoles.includes(role))
  if (!allowed) return <Navigate to="/forbidden" replace />

  return <Outlet />
}
