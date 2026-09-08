import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { getAdminDashboard } from '../api/admin'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = {}
      if (from) query.from = from
      if (to) query.to = to
      const res = await getAdminDashboard(query)
      // getData unwraps the { data } envelope; dashboard body is
      // { period, totals: {...}, rates at top level }.
      setData(res)
    } catch (err) {
      setError(err.message || 'Could not load admin dashboard analytics.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="app-shell__page" style={{ maxWidth: 1100 }}>
      {/* Top Header */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="userCog" size={24} aria-hidden="true" />
            <h1 className="t-h1" style={{ color: 'var(--p900)', margin: 0 }}>
              Admin Operations Dashboard
            </h1>
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}>
            Platform metrics, live transit operations, crowd moderation, and user governance
          </p>
        </div>

        {/* Quick Nav Buttons */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Link to="/admin/moderation">
            <Button size="sm" variant="secondary">
              <Icon name="reports" size={14} aria-hidden="true" /> Moderation Queue
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button size="sm" variant="secondary">
              <Icon name="chart" size={14} aria-hidden="true" /> Full Analytics
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button size="sm" variant="secondary">
              <Icon name="users" size={14} aria-hidden="true" /> Manage Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card flat style={{ padding: '10px 14px' }}>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="t-label">Date Filter:</span>
            <input
              type="date"
              className="field__input"
              style={{ height: 34, padding: '0 8px', width: 140 }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="t-caption">to</span>
            <input
              type="date"
              className="field__input"
              style={{ height: 34, padding: '0 8px', width: 140 }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {(from || to) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
              >
                Reset
              </Button>
            )}
          </div>
          <Button size="sm" variant="primary" onClick={fetchDashboard}>
            Apply Filter
          </Button>
        </div>
      </Card>

      {error && (
        <Alert severity="error" title="Dashboard Notice">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="stack">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <Skeleton height={100} />
            <Skeleton height={100} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </div>
          <Skeleton height={200} />
        </div>
      ) : !data ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="chart" size={22} aria-hidden="true" />}
            title="No Data Available"
            message="There is no recorded activity for the selected time window."
          />
        </Card>
      ) : (
        <div className="stack">
          {/* Key KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {/* Total Journeys Planned */}
            <Card flat style={{ borderLeft: '4px solid var(--p600)' }}>
              <div className="row-between">
                <span className="t-caption">Total Planned Trips</span>
                <Icon name="plan" size={18} aria-hidden="true" />
              </div>
              <div className="t-display t-num" style={{ color: 'var(--p900)', margin: '6px 0 2px' }}>
                {Number(data?.totals?.journeys_created ?? 0).toLocaleString()}
              </div>
              <span className="t-caption">Searches and generated plans</span>
            </Card>

            {/* Active Trips In-Flight */}
            <Card flat style={{ borderLeft: '4px solid var(--a600)' }}>
              <div className="row-between">
                <span className="t-caption">In-Flight Trips</span>
                <Icon name="modeBus" size={18} aria-hidden="true" />
              </div>
              <div className="t-display t-num" style={{ color: 'var(--a600)', margin: '6px 0 2px' }}>
                {data?.totals?.active_journeys_in_flight ?? 0}
              </div>
              <span className="t-caption">Passengers currently on route</span>
            </Card>

            {/* Deviation Incidents */}
            <Card flat style={{ borderLeft: '4px solid var(--e700)' }}>
              <div className="row-between">
                <span className="t-caption">Deviations & Reroutes</span>
                <Icon name="warning" size={18} aria-hidden="true" />
              </div>
              <div className="t-display t-num" style={{ color: 'var(--e700)', margin: '6px 0 2px' }}>
                {data?.totals?.deviations ?? 0}
              </div>
              <span className="t-caption">Off-route and missed stop events</span>
            </Card>

            {/* Pending Reports */}
            <Card
              flat
              style={{ borderLeft: '4px solid var(--w700)', cursor: 'pointer' }}
              onClick={() => navigate('/admin/moderation')}
            >
              <div className="row-between">
                <span className="t-caption">Pending Reports</span>
                <Icon name="reports" size={18} aria-hidden="true" />
              </div>
              <div className="t-display t-num" style={{ color: 'var(--w700)', margin: '6px 0 2px' }}>
                {data?.totals?.pending_reports ?? 0}
              </div>
              <span className="t-caption" style={{ color: 'var(--p600)', fontWeight: 600 }}>
                Click to open moderation queue
              </span>
            </Card>
          </div>

          {/* Secondary Stats Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {/* Completion & Recovery Rates */}
            <Card flat>
              <b style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                Operational Success Rates
              </b>

              <div className="stack-sm">
                <div>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <span className="t-caption">Journey Completion Rate</span>
                    <b className="t-num">{data?.journey_completion_rate != null ? `${Math.round(data.journey_completion_rate)}%` : '—'}</b>
                  </div>
                  <div style={{ height: 6, background: 'var(--p100)', borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(data?.journey_completion_rate || 0))}%`,
                        height: '100%',
                        background: 'var(--s700)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <span className="t-caption">Journey Cancellation Rate</span>
                    <b className="t-num">{data?.journey_cancellation_rate != null ? `${Math.round(data.journey_cancellation_rate)}%` : '—'}</b>
                  </div>
                  <div style={{ height: 6, background: 'var(--p100)', borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(data?.journey_cancellation_rate || 0))}%`,
                        height: '100%',
                        background: 'var(--nile)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <span className="t-caption">Crowd Report Verification Rate</span>
                    <b className="t-num">{data?.report_approval_rate != null ? `${Math.round(data.report_approval_rate)}%` : '—'}</b>
                  </div>
                  <div style={{ height: 6, background: 'var(--p100)', borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(data?.report_approval_rate || 0))}%`,
                        height: '100%',
                        background: 'var(--nile)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Platform Overview */}
            <Card flat>
              <b style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                Platform Governance & Trust
              </b>

              <div className="stack-sm">
                <div className="row-between">
                  <span className="t-caption">Registered Commuters:</span>
                  <b className="t-num">{data?.totals?.users ?? 0}</b>
                </div>
                <div className="row-between">
                  <span className="t-caption">Average User Trust Score:</span>
                  <b className="t-num" style={{ color: 'var(--s700)' }}>
                    {data?.average_user_trust_score != null ? Math.round(data.average_user_trust_score) : '—'} / 100
                  </b>
                </div>
                <div className="row-between">
                  <span className="t-caption">Total Notifications Dispatched:</span>
                  <b className="t-num">{data?.totals?.notifications_sent ?? 0}</b>
                </div>
                <div className="row-between">
                  <span className="t-caption">Verified Community Reports:</span>
                  <b className="t-num">{data?.totals?.community_reports ?? 0}</b>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Link to="/admin/analytics">
                  <Button size="sm" variant="secondary" block>
                    View In-Depth Breakdown Charts
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
