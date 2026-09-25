import { useI18n } from '../i18n/LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import {
  getAnalyticsJourneys,
  getAnalyticsDeviations,
  getAnalyticsUsage,
  getAnalyticsReports,
  getAnalyticsTrust,
  getAnalyticsNotifications,
  getAnalyticsModes,
} from '../api/admin'

const TABS = [
  { key: 'journeys', label: "admin.tab_journeys", lucideIcon: 'plan' },
  { key: 'deviations', label: "admin.tab_deviations", lucideIcon: 'warning' },
  { key: 'usage', label: "admin.tab_usage", lucideIcon: 'chart' },
  { key: 'reports', label: "reports.title", lucideIcon: 'reports' },
  { key: 'trust', label: "admin.tab_trust", lucideIcon: 'shield' },
  { key: 'notifications', label: "notifications.title", lucideIcon: 'alerts' },
  { key: 'modes', label: "admin.tab_modes", lucideIcon: 'modeBus' },
]

export default function AdminAnalytics() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('journeys')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchTabData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const query = {}
    if (from) query.from = from
    if (to) query.to = to

    try {
      let res
      switch (activeTab) {
        case 'journeys':
          res = await getAnalyticsJourneys(query)
          break
        case 'deviations':
          res = await getAnalyticsDeviations(query)
          break
        case 'usage':
          res = await getAnalyticsUsage(query)
          break
        case 'reports':
          res = await getAnalyticsReports(query)
          break
        case 'trust':
          res = await getAnalyticsTrust(query)
          break
        case 'notifications':
          res = await getAnalyticsNotifications(query)
          break
        case 'modes':
          res = await getAnalyticsModes(query)
          break
        default:
          res = await getAnalyticsJourneys(query)
      }
      setData(res)
    } catch (err) {
      setError(err.message || t('admin.analytics_error'))
    } finally {
      setLoading(false)
    }
  }, [activeTab, from, to])

  useEffect(() => {
    fetchTabData()
  }, [fetchTabData])

  return (
    <div className="app-shell__page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/admin" style={{ textDecoration: 'none', color: 'var(--p600)' }}>
              <Icon name="arrowLeft" size={14} aria-hidden="true" /> {t('admin.dashboard')} </Link>
            <span style={{ color: 'var(--ink300)' }}>/</span>
            <h1 className="t-h2" style={{ color: 'var(--p900)', margin: 0 }}> {t('admin.analytics_title')} </h1>
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}> {t('admin.analytics_subtitle')} </p>
        </div>

        {/* Date Filter */}
        <div className="row" style={{ gap: 8 }}>
          <input
            type="date"
            className="field__input"
            style={{ height: 32, padding: '0 6px', width: 130 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="t-caption">{t('admin.to')}</span>
          <input
            type="date"
            className="field__input"
            style={{ height: 32, padding: '0 6px', width: 130 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="row"
        style={{
          borderBottom: '1px solid var(--line)',
          overflowX: 'auto',
          paddingBottom: 4,
          gap: 6,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="btn btn--sm btn--ghost"
            style={{
              fontWeight: 600,
              fontSize: 12.5,
              color: activeTab === tab.key ? 'var(--p600)' : 'var(--ink700)',
              borderBottom: activeTab === tab.key ? '2px solid var(--p600)' : '2px solid transparent',
              borderRadius: 0,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name={tab.lucideIcon} size={13} aria-hidden="true" /> {t(tab.label)}
          </button>
        ))}
      </div>

      {error && (
        <Alert severity="error" title={t('admin.analytics_notice')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="stack">
          <Skeleton height={120} />
          <Skeleton height={180} />
          <Skeleton height={150} />
        </div>
      ) : !data ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="chart" size={22} aria-hidden="true" />}
            title={t('admin.no_data')}
            message={t('admin.no_metrics')}
          />
        </Card>
      ) : (
        <div className="stack">
          {/* Render structured stats based on activeTab */}
          <Card flat>
            <b style={{ fontSize: 15, color: 'var(--p900)', display: 'block', marginBottom: 12 }}>
              <Icon name={TABS.find((t) => t.key === activeTab)?.lucideIcon} size={15} aria-hidden="true" /> {t(TABS.find((tab) => tab.key === activeTab)?.label)} {t('admin.overview')} </b>

            {/* If data is an object with key-value pairs */}
            {typeof data === 'object' && !Array.isArray(data) ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                {Object.entries(data).map(([key, val]) => {
                  if (typeof val === 'object' && val !== null) return null
                  const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  return (
                    <div
                      key={key}
                      style={{
                        background: 'var(--bg)',
                        borderRadius: 'var(--r-md)',
                        padding: '12px 14px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <span className="t-caption" style={{ color: 'var(--ink500)' }}>
                        {t('admin.metric.' + key) === 'admin.metric.' + key ? formattedKey : t('admin.metric.' + key)}
                      </span>
                      <div className="t-h3 t-num" style={{ color: 'var(--p900)', marginTop: 4 }}>
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {/* Nested Lists/Breakdowns if any */}
            {data.by_mode || data.modes || data.by_status || data.by_type || data.breakdown ? (
              <div style={{ marginTop: 20 }}>
                <b style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>{t('admin.categorical')}</b>
                <div className="stack-sm">
                  {Object.entries(
                    data.by_mode || data.modes || data.by_status || data.by_type || data.breakdown || {}
                  ).map(([cat, count]) => (
                    <div key={cat} className="row-between" style={{ borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
                      <div className="row" style={{ gap: 6 }}>
                        <ModeDot mode={cat.toLowerCase()} />
                        <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{cat}</span>
                      </div>
                      <b className="t-num" style={{ fontSize: 13 }}>
                        {typeof count === 'object' ? JSON.stringify(count) : Number(count).toLocaleString()}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          {/* Raw JSON Inspect Card for Defending Professors */}
          <Card flat style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <b style={{ fontSize: 12, color: 'var(--ink700)' }}>{t('admin.audit_payload')}</b>
              <span className="badge badge--neutral">{t('admin.aggregated')}</span>
            </div>
            <pre
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: 'var(--ink900)',
                background: 'var(--surface)',
                padding: 10,
                borderRadius: 'var(--r-sm)',
                overflowX: 'auto',
                maxHeight: 200,
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  )
}
