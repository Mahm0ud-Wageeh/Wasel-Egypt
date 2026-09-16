import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import Reports from '../pages/Reports'
import Notifications from '../pages/Notifications'
import Profile from '../pages/Profile'
import AdminDashboard from '../pages/AdminDashboard'
import AdminAnalytics from '../pages/AdminAnalytics'
import AdminModeration from '../pages/AdminModeration'
import AdminUsers from '../pages/AdminUsers'
import Landing from '../pages/Landing'
import { useI18n } from '../i18n/LanguageContext'
import { en, ar } from '../i18n/dictionaries'
import enJson from '../i18n/en.json'
import arJson from '../i18n/ar.json'
import * as reportsApi from '../api/reports'
import * as journeyApi from '../api/journeys'
import * as notificationsApi from '../api/notifications'
import * as usersApi from '../api/users'
import * as adminApi from '../api/admin'
import * as client from '../api/client'
import { renderWithProviders, mockUser } from '../test/test-utils'

function LanguageSwitch() {
  const { language, setLanguage } = useI18n()
  return <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>Switch test language</button>
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(journeyApi, 'getPublicStops').mockResolvedValue([])
  vi.spyOn(reportsApi, 'getPublicReports').mockResolvedValue({ data: [] })
  vi.spyOn(reportsApi, 'getReports').mockResolvedValue({ data: [] })
  vi.spyOn(notificationsApi, 'getNotifications').mockResolvedValue({ data: [], meta: { unread_count: 0 } })
  vi.spyOn(usersApi, 'getUserProfile').mockResolvedValue(mockUser)
  vi.spyOn(usersApi, 'getUserTrustScore').mockResolvedValue({ score: 88 })
  vi.spyOn(usersApi, 'getUserPreferences').mockResolvedValue({})
  vi.spyOn(adminApi, 'getAdminDashboard').mockResolvedValue({ totals: { journeys_created: 1420 }, journey_completion_rate: 94 })
  vi.spyOn(adminApi, 'getAnalyticsJourneys').mockResolvedValue({})
  vi.spyOn(adminApi, 'getAdminUsers').mockResolvedValue([])
  vi.spyOn(client, 'getData').mockResolvedValue({ data: [] })
  vi.spyOn(client, 'apiRequest').mockResolvedValue({ meta: { total: 0 } })
})

const pages = [
  ['Reports', Reports, 'reports.title', 'reports.empty_filtered'],
  ['Notifications', Notifications, 'notifications.title', 'notifications.inbox_empty'],
  ['Profile', Profile, 'profile.account_title', 'profile.save_preferences'],
  ['Dashboard', AdminDashboard, 'admin.dashboard_title', 'admin.completion_rate'],
  ['Analytics', AdminAnalytics, 'admin.analytics_title', 'admin.audit_payload'],
  ['Moderation', AdminModeration, 'admin.moderation_title', 'admin.queue_empty'],
  ['Users', AdminUsers, 'admin.users_title', 'admin.no_users'],
  ['Landing', Landing, 'landing.tagline', 'landing.modes_lede'],
]

it.each(pages)('%s switches EN to AR display keys without remounting or raw keys', async (_, Page, heading, detail) => {
  renderWithProviders(<><LanguageSwitch /><Page /></>)
  expect(await screen.findByRole('heading', { name: en[heading], exact: true })).toBeInTheDocument()
  expect(await screen.findByText(en[detail], { exact: true })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Switch test language' }))
  expect(await screen.findByRole('heading', { name: ar[heading], exact: true })).toBeInTheDocument()
  expect(await screen.findByText(ar[detail], { exact: true })).toBeInTheDocument()
  expect(document.documentElement.dir).toBe('rtl')
  for (const key of Object.keys(ar)) expect(document.body.textContent).not.toContain(key)
  expect(document.body.textContent).not.toMatch(/\{(?:count|status|date)\}|\?{3,}/)
})

it('keeps admin totals and percentage values unchanged in Arabic', async () => {
  localStorage.setItem('wasel.lang', 'ar')
  renderWithProviders(<AdminDashboard />)
  expect(await screen.findByText('1,420')).toBeInTheDocument()
  expect(screen.getByText('94%')).toBeInTheDocument()
})

it.each([Reports, AdminModeration])('renders decimal-string report coordinates and Arabic type/status labels', async (Page) => {
  localStorage.setItem('wasel.lang', 'ar')
  const report = { id: 7, user_id: 2, report_type: 'delay', status: 'pending', description: 'Test report', latitude: '30.061700', longitude: '31.246400', created_at: '2026-09-08T10:00:00Z' }
  vi.spyOn(reportsApi, 'getPublicReports').mockResolvedValue({ data: [report] })
  vi.spyOn(reportsApi, 'getReports').mockResolvedValue({ data: [report] })
  renderWithProviders(<Page />)
  expect(await screen.findByText('30.0617, 31.2464')).toBeInTheDocument()
  expect(screen.getAllByText(ar['reports.type.delay'], { exact: false }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(ar['reports.status.pending'], { exact: false }).length).toBeGreaterThan(0)
  expect(document.body).not.toHaveTextContent('reports.type.delay')
})

it('keeps generated dictionaries identical to JSON with full key parity', () => {
  expect(en).toEqual(enJson)
  expect(ar).toEqual(arJson)
  expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort())
  for (const value of Object.values(ar)) expect(value).not.toMatch(/\?{3,}/)
})

it('verifies all journey companion cockpit keys have authentic Arabic translations', () => {
  const companionKeys = [
    'cockpit.gps_retry',
    'cockpit.gps_lost',
    'cockpit.recenter',
    'cockpit.gps_denied',
    'cockpit.gps_denied_title',
    'cockpit.gps_weak',
    'cockpit.live_on',
    'cockpit.live_tracking',
    'cockpit.follow_me',
    'cockpit.resume_following',
    'cockpit.heading_up',
    'cockpit.north_up',
  ]

  for (const key of companionKeys) {
    expect(ar[key]).toBeDefined()
    expect(ar[key].length).toBeGreaterThan(0)
    expect(ar[key]).not.toEqual(en[key]) // Must be real Arabic, not English fallback
    expect(ar[key]).not.toMatch(/[a-zA-Z]{4,}/) // No untranslated English words
  }
})

