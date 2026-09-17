import { useState, useEffect, useCallback } from 'react'
import type { Screen, Lang } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import {
  fetchAdminDashboard, fetchSystemHealth, fetchAdminUsersPaged, deleteAdminUser,
  fetchAdminFares, createAdminFare, updateAdminFare, deleteAdminFare,
  fetchAdminReports, moderateReport, fetchDataQuality, fetchDataImports, fetchDataAudit,
  fetchAnalyticsJourneys, fetchAnalyticsDeviations, fetchAnalyticsUsage, fetchAnalyticsReports,
} from '../api/admin'
import {
  LayoutDashboard, Users, TrainFront, Ticket, ShieldCheck, ChartColumn,
  Sparkles, Settings, Plus, Pencil, Trash2, Check, X, Search, Ban,
  RefreshCw, TriangleAlert, CircleCheck, Lock,
} from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  setLang: (l: Lang) => void
}

type AdminSection = 'dashboard' | 'users' | 'transport' | 'fares' | 'moderation' | 'analytics' | 'ai' | 'system'

const navItems = [
  { id: 'dashboard', Icon: LayoutDashboard, ar: 'لوحة التحكم', en: 'Dashboard' },
  { id: 'transport', Icon: TrainFront, ar: 'بيانات النقل', en: 'Transport' },
  { id: 'users', Icon: Users, ar: 'المستخدمون', en: 'Users' },
  { id: 'fares', Icon: Ticket, ar: 'الأسعار', en: 'Fares' },
  { id: 'moderation', Icon: ShieldCheck, ar: 'الإشراف', en: 'Moderation' },
  { id: 'analytics', Icon: ChartColumn, ar: 'التحليلات', en: 'Analytics' },
  { id: 'ai', Icon: Sparkles, ar: 'إعدادات AI', en: 'AI Config' },
  { id: 'system', Icon: Settings, ar: 'النظام', en: 'System' },
]

/** Flatten first-level scalar metrics from an unknown backend payload. */
function scalarMetrics(payload: any, limit = 8): Array<{ key: string; value: string }> {
  if (!payload || typeof payload !== 'object') return []
  const out: Array<{ key: string; value: string }> = []
  for (const [k, v] of Object.entries(payload)) {
    if (out.length >= limit) break
    if (v == null || typeof v === 'object') continue
    out.push({ key: k, value: String(v) })
  }
  return out
}

function prettyKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminScreen({ lang, t, nav, setLang }: Props) {
  const { isAdmin, isLoggedIn } = useAuth()
  const [section, setSection] = useState<AdminSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-3xl border border-neutral-200 p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h1 className="text-lg font-black text-neutral-900 mb-1">{t('منطقة محظورة', 'Restricted Area')}</h1>
          <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
            {!isLoggedIn
              ? t('سجّل الدخول بحساب إداري للوصول إلى لوحة الإدارة.', 'Sign in with an admin account to access the dashboard.')
              : t('حسابك الحالي لا يملك صلاحيات الإدارة.', 'Your account does not have admin privileges.')}
          </p>
          <button
            onClick={() => nav(!isLoggedIn ? 'auth' : 'home')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-2xl transition-all"
          >
            {!isLoggedIn ? t('تسجيل الدخول', 'Sign In') : t('العودة للرئيسية', 'Back to Home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="bg-neutral-900 text-white px-4 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-8 h-8 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
            </div>
            <span className="font-bold text-sm">Wasel Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-neutral-300">{t('النظام يعمل', 'System OK')}</span>
          </div>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-xs bg-neutral-700 hover:bg-neutral-600 px-2.5 py-1.5 rounded-lg transition-colors">
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button onClick={() => nav('home')}
            className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors">
            {t('خروج', 'Exit')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed lg:relative inset-y-0 start-0 w-56 bg-neutral-900 text-white flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}`}
          style={{ top: '56px', height: 'calc(100vh - 56px)' }}>
          <nav className="flex-1 overflow-y-auto py-3">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setSection(item.id as AdminSection); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${section === item.id ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                <item.Icon size={17} />
                <span className="font-medium">{lang === 'ar' ? item.ar : item.en}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-neutral-800">
            <p className="text-xs text-neutral-500">Wasel Egypt Admin</p>
            <p className="text-xs text-neutral-600">v2.0 · live data</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          {section === 'dashboard' && <DashboardSection lang={lang} t={t} />}
          {section === 'users' && <UsersSection lang={lang} t={t} />}
          {section === 'transport' && <TransportSection lang={lang} t={t} />}
          {section === 'fares' && <FaresSection lang={lang} t={t} />}
          {section === 'moderation' && <ModerationSection lang={lang} t={t} />}
          {section === 'analytics' && <AnalyticsSection lang={lang} t={t} />}
          {section === 'ai' && <AISection lang={lang} t={t} />}
          {section === 'system' && <SystemSection lang={lang} t={t} />}
        </main>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function LoadingBlock({ t }: any) {
  return (
    <div className="flex items-center justify-center py-14 gap-2 text-neutral-400 text-sm">
      <RefreshCw size={18} className="animate-spin" />
      {t('جاري التحميل…', 'Loading…')}
    </div>
  )
}

function ErrorBlock({ message, onRetry, t }: any) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
      <TriangleAlert size={22} className="mx-auto text-red-500 mb-2" />
      <p className="text-xs font-bold text-red-700 mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl">
          {t('إعادة المحاولة', 'Retry')}
        </button>
      )}
    </div>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-xs text-neutral-400">
      {message}
    </div>
  )
}

// ── Dashboard: real analytics ─────────────────────────────────────────
function DashboardSection({ lang, t }: any) {
  const [data, setData] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [d, h] = await Promise.allSettled([fetchAdminDashboard(), fetchSystemHealth()])
    if (d.status === 'fulfilled') setData(d.value)
    else setError(t('تعذر تحميل بيانات اللوحة — تحقق من الصلاحيات والاتصال.', 'Could not load dashboard — check permissions and connection.'))
    if (h.status === 'fulfilled') setHealth(h.value)
    setLoading(false)
  }, [t])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingBlock t={t} /></div>

  const metrics = scalarMetrics(data)
  const healthItems: any[] = Array.isArray(health) ? health : health?.checks ?? health?.services ?? []

  return (
    <div className="p-6">
      <SectionHeader title={t('لوحة التحكم', 'Dashboard')} subtitle={t('بيانات حية من الخادم', 'Live server data')}
        action={<button onClick={load} className="flex items-center gap-1.5 text-xs font-bold bg-white border border-neutral-200 hover:bg-neutral-50 px-3 py-2 rounded-xl"><RefreshCw size={13} />{t('تحديث', 'Refresh')}</button>} />
      {error && <div className="mb-4"><ErrorBlock message={error} onRetry={load} t={t} /></div>}

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200">
              <p className="text-2xl font-black text-neutral-900 truncate">{m.value}</p>
              <p className="text-xs text-neutral-500 mt-0.5 truncate" title={m.key}>{prettyKey(m.key)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4"><EmptyBlock message={t('لا توجد مقاييس متاحة حالياً.', 'No metrics available right now.')} /></div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('حالة الخدمات', 'Service Status')}</h3>
        {healthItems.length > 0 ? (
          <div className="space-y-2">
            {healthItems.map((svc: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${String(svc.status ?? svc.state ?? '').toLowerCase().includes('ok') || svc.healthy ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-neutral-700">{svc.name ?? svc.service ?? prettyKey(Object.keys(svc)[0] ?? 'service')}</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">{svc.latency ?? svc.latency_ms ?? svc.message ?? ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">{t('فحص الصحة غير متاح — راجع قسم النظام.', 'Health check unavailable — see System section.')}</p>
        )}
      </div>
      <p className="text-[11px] text-neutral-400 mt-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>payload: admin/analytics/dashboard · admin/analytics/system-health</p>
    </div>
  )
}

// ── Users: real list + delete ─────────────────────────────────────────
function UsersSection({ lang, t }: any) {
  const [users, setUsers] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<number | string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchAdminUsersPaged()
      setUsers(Array.isArray(list) ? list : [])
    } catch {
      setError(t('تعذر تحميل المستخدمين.', 'Could not load users.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    !query || String(u.name ?? '').includes(query) || String(u.email ?? '').toLowerCase().includes(query.toLowerCase()))

  const handleDelete = async (id: number | string) => {
    if (!window.confirm(t('حذف هذا المستخدم نهائياً؟', 'Permanently delete this user?'))) return
    setDeleting(id)
    try {
      await deleteAdminUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch {
      alert(t('فشل الحذف — تحقق من الصلاحيات.', 'Delete failed — check permissions.'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6">
      <SectionHeader title={t('المستخدمون', 'Users')} subtitle={t(`${users.length} مستخدم مسجل`, `${users.length} registered users`)} />
      {loading ? <LoadingBlock t={t} /> : error ? <ErrorBlock message={error} onRetry={load} t={t} /> : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
            <Search size={15} className="text-neutral-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('ابحث بالاسم أو البريد...', 'Search name or email...')} className="flex-1 text-sm outline-none bg-transparent" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-500">
                  <th className="px-4 py-3 text-start">{t('المستخدم', 'User')}</th>
                  <th className="px-4 py-3 text-start">{t('الأدوار', 'Roles')}</th>
                  <th className="px-4 py-3 text-start">{t('أُنشئ', 'Created')}</th>
                  <th className="px-4 py-3 text-start">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">{String(u.name ?? '?')[0]}</div>
                        <div>
                          <p className="font-medium text-neutral-900">{u.name}</p>
                          <p className="text-xs text-neutral-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(u.roles ?? []).map((r: any, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{r.name ?? r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{u.created_at ? new Date(u.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id}
                        className="flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50">
                        <Ban size={13} />{deleting === u.id ? '…' : t('حذف', 'Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-xs text-neutral-400 py-8">{t('لا نتائج مطابقة.', 'No matching results.')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Transport data governance (extensible for future modes) ──────────
function TransportSection({ lang, t }: any) {
  const [stats, setStats] = useState<any>(null)
  const [modes, setModes] = useState<any[]>([])
  const [quality, setQuality] = useState<any>(null)
  const [imports, setImports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [s, m, q, im] = await Promise.allSettled([
        apiRequest<any>(endpoints.public.networkStats, { method: 'GET', auth: false }),
        apiRequest<any>(endpoints.public.transitModes, { method: 'GET', auth: false }),
        fetchDataQuality().catch(() => null),
        fetchDataImports().catch(() => null),
      ])
      if (s.status === 'fulfilled') setStats(s.value?.data ?? s.value)
      if (m.status === 'fulfilled') {
        const v = m.value?.data ?? m.value
        setModes(Array.isArray(v) ? v : v?.data ?? [])
      }
      if (q.status === 'fulfilled' && q.value) setQuality(q.value)
      if (im.status === 'fulfilled' && im.value) {
        const v = Array.isArray(im.value) ? im.value : im.value?.data ?? []
        setImports(Array.isArray(v) ? v.slice(0, 5) : [])
      }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-6"><LoadingBlock t={t} /></div>

  const statEntries = scalarMetrics(stats, 8)

  return (
    <div className="p-6">
      <SectionHeader title={t('بيانات النقل', 'Transport Data')} subtitle={t('إحصائيات الشبكة الحية + حوكمة البيانات', 'Live network stats + data governance')} />
      {statEntries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statEntries.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4">
              <p className="text-2xl font-black text-neutral-900 truncate">{s.value}</p>
              <p className="text-xs text-neutral-500 truncate">{prettyKey(s.key)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('وسائل النقل المعرفة بالنظام (قابلة للتوسعة)', 'Registered transport modes (extensible)')}</h3>
        {modes.length === 0 ? (
          <p className="text-xs text-neutral-400">{t('تعذر تحميل الوسائل — تحقق من الاتصال.', 'Could not load modes — check connection.')}</p>
        ) : (
          <div className="space-y-2">
            {modes.map((m: any, i: number) => (
              <div key={m.id ?? i} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" style={m.color ? { background: m.color } : undefined} />
                  <span className="text-sm font-medium text-neutral-800">{m.name ?? m.code ?? `#${m.id}`}</span>
                  {m.code && <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{m.code}</span>}
                </div>
                <span className="text-xs text-neutral-400">id: {m.id}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-neutral-400 mt-3">{t('لإضافة وسيلة جديدة (مثل ميكروباص رسمي أو تاكسي نهري): تُعرَّف كـ transit mode ثم تُستورد بياناتها عبر GTFS وتُسعَّر من قسم الأسعار.', 'To add a mode: register a transit mode, import its GTFS data, then price it in Fares.')}</p>
      </div>

      {quality && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('جودة البيانات', 'Data Quality')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {scalarMetrics(quality, 6).map((s, i) => (
              <div key={i} className="bg-neutral-50 rounded-xl p-3">
                <p className="font-black text-neutral-900">{s.value}</p>
                <p className="text-[11px] text-neutral-500">{prettyKey(s.key)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {imports.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('آخر عمليات الاستيراد', 'Recent Imports')}</h3>
          <div className="space-y-2">
            {imports.map((im: any, i: number) => (
              <div key={im.id ?? i} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100 last:border-0">
                <span className="font-medium text-neutral-700">{im.source ?? im.name ?? `#${im.id}`}</span>
                <span className="text-neutral-400">{im.status ?? im.created_at ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fares: full live CRUD ─────────────────────────────────────────────
function FaresSection({ lang, t }: any) {
  const [fares, setFares] = useState<any[]>([])
  const [modes, setModes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ transit_mode_id: '', label: '', tier: '', zone: '', amount: '', student_amount: '', senior_amount: '', source: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, m] = await Promise.all([
        fetchAdminFares(),
        apiRequest<any>(endpoints.public.transitModes, { method: 'GET', auth: false }).catch(() => null),
      ])
      setFares(Array.isArray(f) ? f : [])
      if (m) {
        const v = m?.data ?? m
        setModes(Array.isArray(v) ? v : v?.data ?? [])
      }
    } catch {
      setError(t('تعذر تحميل الأسعار.', 'Could not load fares.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ transit_mode_id: '', label: '', tier: '', zone: '', amount: '', student_amount: '', senior_amount: '', source: '' })
    setFormOpen(true)
  }
  const openEdit = (f: any) => {
    setEditing(f)
    setForm({
      transit_mode_id: String(f.transit_mode_id ?? ''),
      label: f.label ?? '',
      tier: f.tier ?? '',
      zone: f.zone ?? '',
      amount: String(f.amount ?? ''),
      student_amount: f.student_amount != null ? String(f.student_amount) : '',
      senior_amount: f.senior_amount != null ? String(f.senior_amount) : '',
      source: f.source ?? '',
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim() || form.amount === '') return
    setSaving(true)
    try {
      const body: Record<string, any> = {
        label: form.label.trim(),
        amount: Number(form.amount),
        currency: 'EGP',
      }
      if (form.transit_mode_id) body.transit_mode_id = Number(form.transit_mode_id)
      if (form.tier.trim()) body.tier = form.tier.trim()
      if (form.zone.trim()) body.zone = form.zone.trim()
      if (form.student_amount !== '') body.student_amount = Number(form.student_amount)
      if (form.senior_amount !== '') body.senior_amount = Number(form.senior_amount)
      if (form.source.trim()) body.source = form.source.trim()
      if (editing) await updateAdminFare(editing.id, body)
      else await createAdminFare(body)
      setFormOpen(false)
      load()
    } catch (err: any) {
      alert(err?.message || t('فشل الحفظ — تحقق من الحقول.', 'Save failed — check fields.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number | string) => {
    if (!window.confirm(t('حذف هذا السعر نهائياً؟', 'Permanently delete this fare?'))) return
    try {
      await deleteAdminFare(id)
      setFares(prev => prev.filter(f => f.id !== id))
    } catch {
      alert(t('فشل الحذف.', 'Delete failed.'))
    }
  }

  const modeName = (f: any) => f.transit_mode?.name ?? modes.find(m => String(m.id) === String(f.transit_mode_id))?.name ?? '—'

  return (
    <div className="p-6">
      <SectionHeader title={t('إدارة الأسعار', 'Fare Management')} subtitle={t('أسعار حية — أي تعديل ينعكس على حاسبة الأسعار', 'Live fares — edits reflect in the fare calculator')}
        action={<button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"><Plus size={14} />{t('إضافة سعر', 'Add Fare')}</button>} />
      {loading ? <LoadingBlock t={t} /> : error ? <ErrorBlock message={error} onRetry={load} t={t} /> : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-500">
                  <th className="px-4 py-3 text-start">{t('الوسيلة', 'Mode')}</th>
                  <th className="px-4 py-3 text-start">{t('البيان', 'Label')}</th>
                  <th className="px-4 py-3 text-start">{t('السعر', 'Fare')}</th>
                  <th className="px-4 py-3 text-start">{t('المصدر', 'Source')}</th>
                  <th className="px-4 py-3 text-start">{t('إجراء', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {fares.map(f => (
                  <tr key={f.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-800">{modeName(f)}{f.tier ? ` · ${f.tier}` : ''}{f.zone ? ` · ${f.zone}` : ''}</td>
                    <td className="px-4 py-3 text-neutral-600">{f.label}</td>
                    <td className="px-4 py-3 font-bold text-neutral-900">{f.amount} {f.currency ?? t('ج', 'EGP')}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{f.source ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(f)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Pencil size={12} />{t('تعديل', 'Edit')}</button>
                        <button onClick={() => handleDelete(f.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><Trash2 size={12} />{t('حذف', 'Delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fares.length === 0 && <p className="text-center text-xs text-neutral-400 py-8">{t('لا توجد أسعار معرفة بعد — أضف أول سعر.', 'No fares yet — add the first one.')}</p>}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-neutral-900">{editing ? t('تعديل سعر', 'Edit Fare') : t('سعر جديد (يدعم أي وسيلة مستقبلية)', 'New Fare (any future mode)')}</h3>
            <div>
              <label className="text-xs font-bold text-neutral-500">{t('الوسيلة', 'Mode')}</label>
              <select value={form.transit_mode_id} onChange={e => setForm({ ...form, transit_mode_id: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500">
                <option value="">{t('عام (كل الوسائل)', 'General (all modes)')}</option>
                {modes.map((m: any) => <option key={m.id} value={m.id}>{m.name ?? m.code}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500">{t('البيان *', 'Label *')}</label>
              <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder={t('مثال: مترو — حتى ٩ محطات', 'e.g. Metro — up to 9 stations')}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-500">{t('الفئة', 'Tier')}</label>
                <input value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500">{t('المنطقة', 'Zone')}</label>
                <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-500">{t('السعر *', 'Amount *')}</label>
                <input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500">{t('طلبة', 'Student')}</label>
                <input type="number" min="0" value={form.student_amount} onChange={e => setForm({ ...form, student_amount: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500">{t('كبار سن', 'Senior')}</label>
                <input type="number" min="0" value={form.senior_amount} onChange={e => setForm({ ...form, senior_amount: e.target.value })}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500">{t('المصدر', 'Source')}</label>
              <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                placeholder={t('مثال: قرار وزاري ٢٠٢٦', 'e.g. 2026 decree')}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !form.label.trim() || form.amount === ''}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white text-xs font-bold py-3 rounded-2xl">
                {saving ? t('جاري الحفظ…', 'Saving…') : t('حفظ', 'Save')}
              </button>
              <button onClick={() => setFormOpen(false)} className="px-4 py-3 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-600">
                {t('إلغاء', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Moderation: real queue + real actions ─────────────────────────────
function ModerationSection({ lang, t }: any) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<number | string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchAdminReports()
      setReports(Array.isArray(list) ? list : [])
    } catch {
      setError(t('تعذر تحميل البلاغات.', 'Could not load reports.'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const act = async (id: number | string, action: 'verify' | 'reject' | 'resolve') => {
    setActing(id)
    try {
      await moderateReport(id, action)
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: action === 'verify' ? 'verified' : action === 'resolve' ? 'resolved' : 'rejected' } : r))
    } catch {
      alert(t('فشل الإجراء — تحقق من الصلاحيات.', 'Action failed — check permissions.'))
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-6">
      <SectionHeader title={t('قائمة الإشراف', 'Moderation Queue')}
        subtitle={t(`${reports.filter(r => r.status === 'pending').length} بلاغات معلقة`, `${reports.filter(r => r.status === 'pending').length} pending reports`)} />
      {loading ? <LoadingBlock t={t} /> : error ? <ErrorBlock message={error} onRetry={load} t={t} /> : reports.length === 0 ? (
        <EmptyBlock message={t('لا توجد بلاغات — القائمة فارغة.', 'No reports — queue is empty.')} />
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'verified' || r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status ?? 'pending'}
                    </span>
                    <span className="text-xs font-bold text-neutral-800">{r.report_type ?? r.issue_type ?? ''}</span>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">{r.description}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {r.user?.name ? `${t('بواسطة', 'By')} ${r.user.name} · ` : ''}{r.created_at ? new Date(r.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                  </p>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => act(r.id, 'verify')} disabled={acting === r.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl"><Check size={13} />{t('تحقق', 'Verify')}</button>
                  <button onClick={() => act(r.id, 'resolve')} disabled={acting === r.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl"><CircleCheck size={13} />{t('حلّ', 'Resolve')}</button>
                  <button onClick={() => act(r.id, 'reject')} disabled={acting === r.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl"><X size={13} />{t('رفض', 'Reject')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Analytics: real endpoints ─────────────────────────────────────────
function AnalyticsSection({ lang, t }: any) {
  const [tabs] = useState([
    { id: 'journeys', label: lang === 'ar' ? 'الرحلات' : 'Journeys', loader: fetchAnalyticsJourneys },
    { id: 'deviations', label: lang === 'ar' ? 'الانحرافات' : 'Deviations', loader: fetchAnalyticsDeviations },
    { id: 'usage', label: lang === 'ar' ? 'الاستخدام' : 'Usage', loader: fetchAnalyticsUsage },
    { id: 'reports', label: lang === 'ar' ? 'البلاغات' : 'Reports', loader: fetchAnalyticsReports },
  ])
  const [active, setActive] = useState('journeys')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    tabs.find(tb => tb.id === active)?.loader()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const metrics = scalarMetrics(data, 10)

  return (
    <div className="p-6">
      <SectionHeader title={t('التحليلات', 'Analytics')} subtitle={t('مباشرة من الخادم', 'Directly from the server')} />
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setActive(tb.id)}
            className={`text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap ${active === tb.id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200'}`}>
            {tb.label}
          </button>
        ))}
      </div>
      {loading ? <LoadingBlock t={t} /> : metrics.length === 0 ? (
        <EmptyBlock message={t('لا توجد بيانات تحليلية متاحة.', 'No analytics data available.')} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs text-neutral-500 mb-1 truncate">{prettyKey(m.key)}</p>
              <p className="text-2xl font-black text-neutral-900 truncate">{m.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-neutral-400 mt-3">payload: admin/analytics/{active}</p>
    </div>
  )
}

// ── AI status: real ───────────────────────────────────────────────────
function AISection({ lang, t }: any) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<any>(endpoints.ai.status, { method: 'GET', auth: false })
      .then(res => setStatus(res?.data ?? res))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <SectionHeader title={t('إعدادات AI', 'AI Configuration')} />
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 max-w-xl">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('حالة AI (حية)', 'AI Status (live)')}</h3>
        {loading ? <LoadingBlock t={t} /> : !status ? (
          <EmptyBlock message={t('خدمة AI غير متاحة حالياً.', 'AI service unavailable right now.')} />
        ) : (
          <div className="space-y-2">
            {scalarMetrics(status, 10).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                <span className="text-xs text-neutral-500">{prettyKey(s.key)}</span>
                <span className="text-xs font-medium text-neutral-800">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── System health: real ───────────────────────────────────────────────
function SystemSection({ lang, t }: any) {
  const [health, setHealth] = useState<any>(null)
  const [audit, setAudit] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [h, a] = await Promise.allSettled([fetchSystemHealth(), fetchDataAudit().catch(() => null)])
      if (h.status === 'fulfilled') setHealth(h.value)
      if (a.status === 'fulfilled' && a.value) {
        const v = Array.isArray(a.value) ? a.value : a.value?.data ?? []
        setAudit(Array.isArray(v) ? v.slice(0, 10) : [])
      }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-6"><LoadingBlock t={t} /></div>

  return (
    <div className="p-6">
      <SectionHeader title={t('النظام', 'System')} />
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('صحة النظام (حية)', 'System Health (live)')}</h3>
        {!health ? (
          <p className="text-xs text-neutral-400">{t('غير متاح حالياً.', 'Unavailable right now.')}</p>
        ) : (
          <div className="space-y-2">
            {scalarMetrics(health, 12).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
                <span className="text-xs text-neutral-500">{prettyKey(s.key)}</span>
                <span className="text-xs font-mono text-neutral-700">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {audit.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('سجل تدقيق البيانات', 'Data Audit Log')}</h3>
          <div className="space-y-2">
            {audit.map((log: any, i: number) => (
              <div key={log.id ?? i} className="flex items-start gap-2 font-mono text-xs">
                <span className="text-neutral-600 flex-1">{log.action ?? log.message ?? JSON.stringify(log).slice(0, 80)}</span>
                <span className="text-neutral-400 flex-shrink-0">{log.created_at ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
