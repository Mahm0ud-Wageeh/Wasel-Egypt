import { createBrowserRouter, Link, Outlet } from 'react-router-dom'
import { ProtectedRoute, GuestRoute, RoleRoute } from './guards'
import { PassengerLayout } from '../components/layout/PassengerLayout'
import AdminLayout from '../components/layout/AdminLayout'
import { JourneyProvider } from '../contexts/JourneyContext'
import { AssistantShell } from './AssistantShell'
import Landing from '../legacy-pages/Landing'
import Login from '../legacy-pages/Login'
import Register from '../legacy-pages/Register'
import ForgotPassword from '../legacy-pages/ForgotPassword'
import ResetPassword from '../legacy-pages/ResetPassword'
import AuthCallback from '../legacy-pages/AuthCallback'
import Home from '../legacy-pages/Home'
import RouteDetail from '../legacy-pages/RouteDetail'
import { JourneySearchPage as Search } from '../legacy-pages/JourneySearch'
import { JourneyResultsPage as JourneyResults } from '../legacy-pages/JourneyResults'
import ActiveJourney from '../legacy-pages/ActiveJourney'
import Deviation from '../legacy-pages/Deviation'
import Reports from '../legacy-pages/Reports'
import Notifications from '../legacy-pages/Notifications'
import Profile from '../legacy-pages/Profile'
import AdminDashboard from '../legacy-pages/AdminDashboard'
import AdminAnalytics from '../legacy-pages/AdminAnalytics'
import AdminModeration from '../legacy-pages/AdminModeration'
import AdminUsers from '../legacy-pages/AdminUsers'
import AdminFares from '../legacy-pages/AdminFares'
import AdminNetwork from '../legacy-pages/AdminNetwork'
import AdminData from '../legacy-pages/AdminData'
import AdminStopTimes from '../legacy-pages/AdminStopTimes'
import AdminGeometry from '../legacy-pages/AdminGeometry'
import Fares from '../legacy-pages/Fares'
import Forbidden from '../legacy-pages/Forbidden'
import NotFound from '../legacy-pages/NotFound'

/**
 * Route map:
 * - Guest auth flow (redirects to /home when logged in)
 * - Public home (guests see public info; logged-in see active journeys)
 * - Journey pages (protected): /search, /journeys/results
 * - Tracking & Deviation: /active-journey, /active-journeys/:id, /active-journeys/:id/deviation
 * - Reports, Notifications, Profile (full modules)
 * - Admin operations: /admin, /admin/analytics, /admin/moderation, /admin/users
 * - 403 / 404 catch-alls
 */

/** Layout route: JourneyProvider + nested outlet. */
function JourneyArea() {
  return (
    <JourneyProvider>
      <Outlet />
    </JourneyProvider>
  )
}

export const router = createBrowserRouter([
  /* ─── App-wide AI assistant shell (inside the router so assistant
         actions can navigate; renders launcher + drawer on every page) ─── */
  {
    element: <AssistantShell />,
    children: [
      /* ─── Landing (journey-aware: hero planner shares JourneyProvider
             state with /search via sessionStorage persistence) ─── */
      { path: '/', element: <JourneyProvider><Landing /></JourneyProvider> },

      /* ─── Guest-only auth screens ─── */
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password', element: <ResetPassword /> },
          { path: '/auth/callback', element: <AuthCallback /> },
        ],
      },

      /* ─── Public home (guests allowed) ─── */
      {
        element: <PassengerLayout />,
        children: [
          // Home owns a planner instance for the hero + map preview; like
          // Landing it gets its own provider (sessionStorage-backed, shared
          // shape with the protected journey area).
          { path: '/home', element: <JourneyProvider><Home /></JourneyProvider> },
          // Line information — public endpoints only (route detail, stops,
          // variant geometry), so guests can browse the network too.
          { path: '/routes/:id', element: <RouteDetail /> },
          // Public fare information — honestly labeled real vs demo/estimated.
          { path: '/fares', element: <Fares /> },
        ],
      },

      /* ─── Protected passenger area ─── */
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <JourneyArea />,
            children: [
              {
                element: <PassengerLayout />,
                children: [
                  { path: '/search', element: <Search /> },
                  { path: '/journeys/results', element: <JourneyResults /> },
                  { path: '/active-journey', element: <ActiveJourney /> },
                  { path: '/active-journeys/:id', element: <ActiveJourney /> },
                  { path: '/active-journeys/:id/deviation', element: <Deviation /> },
                  { path: '/reports', element: <Reports /> },
                  { path: '/notifications', element: <Notifications /> },
                  { path: '/profile', element: <Profile /> },
                ],
              },
            ],
          },
        ],
      },

      /* ─── Admin Area (admin role) ─── */
      {
        element: <RoleRoute roles={['admin']} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/admin', element: <AdminDashboard /> },
              { path: '/admin/analytics', element: <AdminAnalytics /> },
              { path: '/admin/users', element: <AdminUsers /> },
              { path: '/admin/fares', element: <AdminFares /> },
              { path: '/admin/network', element: <AdminNetwork /> },
              { path: '/admin/data', element: <AdminData /> },
              { path: '/admin/stop-times', element: <AdminStopTimes /> },
              { path: '/admin/geometry', element: <AdminGeometry /> },
            ],
          },
        ],
      },

      /* ─── Moderation Area (moderator or admin) ─── */
      {
        element: <RoleRoute roles={['moderator', 'admin']} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/admin/moderation', element: <AdminModeration /> },
            ],
          },
        ],
      },

      /* ─── Errors ─── */
      { path: '/forbidden', element: <Forbidden /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export { Link }
