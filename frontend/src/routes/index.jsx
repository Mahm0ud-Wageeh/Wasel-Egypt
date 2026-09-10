import { createBrowserRouter, Link, Outlet } from 'react-router-dom'
import { ProtectedRoute, GuestRoute, RoleRoute } from './guards'
import { PassengerLayout } from '../components/layout/PassengerLayout'
import AdminLayout from '../components/layout/AdminLayout'
import { JourneyProvider } from '../contexts/JourneyContext'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Home from '../pages/Home'
import RouteDetail from '../pages/RouteDetail'
import { JourneySearchPage as Search } from '../pages/JourneySearch'
import { JourneyResultsPage as JourneyResults } from '../pages/JourneyResults'
import ActiveJourney from '../pages/ActiveJourney'
import Deviation from '../pages/Deviation'
import Reports from '../pages/Reports'
import Notifications from '../pages/Notifications'
import Profile from '../pages/Profile'
import AdminDashboard from '../pages/AdminDashboard'
import AdminAnalytics from '../pages/AdminAnalytics'
import AdminModeration from '../pages/AdminModeration'
import AdminUsers from '../pages/AdminUsers'
import Forbidden from '../pages/Forbidden'
import NotFound from '../pages/NotFound'

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
    ],
  },

  /* ─── Public home (guests allowed) ─── */
  {
    element: <PassengerLayout />,
    children: [
      { path: '/home', element: <Home /> },
      // Line information — public endpoints only (route detail, stops,
      // variant geometry), so guests can browse the network too.
      { path: '/routes/:id', element: <RouteDetail /> },
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
])

export { Link }
