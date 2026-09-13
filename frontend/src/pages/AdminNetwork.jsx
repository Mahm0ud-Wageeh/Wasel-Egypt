import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { getData as apiGetData } from '../api/client'

/**
 * Admin → Network: a real inventory of the ONE transportation graph —
 * entity counts, provenance freshness (import logs), and active alerts.
 * Read-only registry view; mutations live in their governed consoles.
 */
export default function AdminNetwork() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [operators, setOperators] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const safe = (p, auth) => p.catch(() => null)
    try {
      const [statsRes, healthRes, opsRes, alertsRes] = await Promise.all([
        apiGetData('/network/stats', { auth: false }).catch(() => null),
        apiGetData('/admin/analytics/system-health').catch(() => null),
        apiGetData('/transit-operators', { auth: false }).catch(() => null),
        apiGetData('/service-alerts/active', { auth: false }).catch(() => null),
      ])
      setStats(statsRes)
      setHealth(healthRes)
      // JSON-safe: models carry relations (e.g. mode.routes) — keep scalars only.
      const list = (res) => (Array.isArray(res) ? res : (res?.data ?? []))
      setOperators(list(opsRes).map((o) => ({ id: o?.id, name: String(o?.name ?? '') })))
      setAlerts(list(alertsRes).map((a) => ({ id: a?.id, header: String(a?.header_text ?? a?.title ?? ''), day: String(a?.active_period_start ?? '').slice(0, 10) })))
    } catch (err) {
      setError(err.message || 'Failed to load network inventory.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) {
    return (
      <div className="app-shell__page" style={{ maxWidth: 1100 }}>
        <Skeleton height={120} />
        <Skeleton height={200} />
        <Skeleton height={200} />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="app-shell__page" style={{ maxWidth: 1100 }}>
        <Card flat>
          <StateBlock icon={<Icon name="layers" size={22} aria-hidden="true" />} title={t('admin.network_title')} message={error} />
        </Card>
      </div>
    )
  }

  const counts = [
    { label: t('admin.net_stops'), value: stats?.stops ?? health?.network?.stops ?? '—' },
    { label: t('admin.net_routes'), value: stats?.routes ?? health?.network?.routes ?? '—' },
    { label: t('admin.net_variants'), value: stats?.active_variants ?? health?.network?.active_variants ?? '—' },
    { label: t('admin.net_schedules'), value: stats?.schedules ?? health?.network?.schedules ?? '—' },
    { label: t('admin.net_operators'), value: stats?.operators ?? health?.network?.operators ?? '—' },
    { label: t('admin.net_modes'), value: stats?.mode_count ?? stats?.modes?.length ?? '—' },
    { label: `${t('results.metric_fare')} ✓`, value: health?.network?.fares?.real ?? '—' },
    { label: `${t('results.metric_fare')} ~`, value: health?.network?.fares?.demo_estimated ?? '—' },
  ]

  return (
    <div className="app-shell__page" style={{ maxWidth: 1100 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 'var(--sp-4)' }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="layers" size={24} aria-hidden="true" />
            <h1 className="t-h1" style={{ color: 'var(--p900)', margin: 0 }}>{t('admin.network_title')}</h1>
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}>{t('admin.network_subtitle')}</p>
        </div>
        <Badge value={health?.ai?.disabled ? 'inactive' : 'active'} label={`${t('admin.health_ai')}: ${health?.ai?.provider ?? '—'}`} />
      </div>

      {/* Network size — real counts */}
      <div className="admin-health-grid">
        {counts.map((c) => (
          <Card key={c.label} flat className="admin-health-cell">
            <div className="t-caption">{c.label}</div>
            <b className="t-num" style={{ fontSize: 22, color: 'var(--p900)' }}>{c.value}</b>
          </Card>
        ))}
      </div>

      {/* Data freshness — governed import pipeline provenance */}
      <Card flat style={{ marginTop: 'var(--sp-4)' }}>
        <b style={{ fontSize: 14 }}>{t('admin.health_freshness')}</b>
        {(health?.data_freshness?.latest_imports ?? []).length === 0 ? (
          <p className="t-caption" style={{ margin: '6px 0 0' }}>{t('admin.net_no_imports')}</p>
        ) : (
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {health.data_freshness.latest_imports.map((imp) => (
              <div key={`${imp.source}-${imp.imported_at}`} className="row-between" style={{ borderBottom: '1px dashed var(--line)', paddingBottom: 6 }}>
                <span className="row" style={{ gap: 6 }}>
                  <Icon name="layers" size={13} aria-hidden="true" />
                  <b style={{ fontSize: 12.5 }}>{imp.source}</b>
                  {imp.dataset_version && <span className="t-caption">v{imp.dataset_version}</span>}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <Badge value={imp.status === 'completed' ? 'active' : 'rerouted'} />
                  <span className="t-caption t-num">{imp.imported_at?.slice(0, 10)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modes & operators registry */}
      <div className="row" style={{ gap: 'var(--sp-4)', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 'var(--sp-4)' }}>
        <Card flat style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 14 }}>{t('admin.net_modes')}</b>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {(stats?.modes ?? []).map((m) => (
              <div key={m.id} className="row-between">
                <span className="row" style={{ gap: 6 }}>
                  <Icon name="navigate" size={13} aria-hidden="true" />
                  <span style={{ fontSize: 13 }}>{String(m.name ?? '')}</span>
                </span>
                <span className="t-caption t-num">{m.routes ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card flat style={{ flex: '1 1 260px' }}>
          <b style={{ fontSize: 14 }}>{t('admin.net_operators')}</b>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {(operators ?? []).slice(0, 10).map((o) => (
              <div key={o.id} className="row-between">
                <span style={{ fontSize: 13 }}>{o.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Active alerts */}
      <Card flat style={{ marginTop: 'var(--sp-4)' }}>
        <b style={{ fontSize: 14 }}>{t('admin.health_alerts')}: {alerts.length}</b>
        {alerts.length === 0 ? (
          <p className="t-caption" style={{ margin: '6px 0 0' }}>{t('admin.net_no_alerts')}</p>
        ) : (
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {alerts.slice(0, 8).map((a) => (
              <div key={a.id} className="row-between">
                <span style={{ fontSize: 13 }}>{a.header}</span>
                <span className="t-caption t-num">{a.day}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
