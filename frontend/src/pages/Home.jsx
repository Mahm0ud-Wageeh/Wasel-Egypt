import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { getData } from '../api/client'
import { endpoints } from '../api/endpoints'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
/**
 * Passenger home — launchpad shell.
 * APIs: GET /active-journeys, GET /service-alerts/active,
 *       GET /public-routes?transit_mode_id=1 (metro lines shown from real data).
 */

/** Builds a metro-line card body from real route + variant stop data. */
function metroLineSummary(route, stopsPayload) {
  const variant = stopsPayload?.[0]
  const stops = variant?.stops ?? []
  const first = stops[0]?.stop_name
  const last = stops[stops.length - 1]?.stop_name
  if (!first || !last) return null
  return {
    id: route.id,
    line: route.short_name,
    name: route.name,
    from: first,
    to: last,
    stopCount: stops.length,
  }
}

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [activeJourney, setActiveJourney] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [metroLines, setMetroLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const requests = [
      getData(endpoints.public.activeServiceAlerts).catch(() => null),
      // Real metro lines (transit_mode id 1) for the network section.
      getData(`${endpoints.public.routes}?transit_mode_id=1&per_page=5`)
        .then(async (routes) => {
          const list = Array.isArray(routes) ? routes : (routes?.data ?? [])
          const withStops = await Promise.all(
            list.map(async (route) => {
              try {
                const stops = await getData(endpoints.public.routeStops(route.id))
                return metroLineSummary(route, stops)
              } catch {
                return null
              }
            })
          )
          return withStops.filter(Boolean)
        })
        .catch(() => []),
    ]
    if (isAuthenticated) {
      requests.unshift(
        getData(endpoints.activeJourneys.list).catch(() => null)
      )
    }

    Promise.all(requests)
      .then(([active, serviceAlerts, metro]) => {
        if (cancelled) return
        const list = isAuthenticated ? (Array.isArray(active) ? active : (active?.data ?? [])) : []
        setActiveJourney(list.find((j) => j.status === 'active') ?? null)
        const alertsData = isAuthenticated ? serviceAlerts : active
        setAlerts(
          Array.isArray(alertsData) ? alertsData : (alertsData?.data ?? [])
        )
        setMetroLines(Array.isArray(metro) ? metro : [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('error.network'))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const authenticatedContent = (
    <>
      <div className="hero" style={{ marginTop: 'calc(-1 * var(--sp-4))' }}>
        <div className="t-caption" style={{ color: 'rgba(255,255,255,.8)' }}>
          {t('home.greeting')}
        </div>
        <h2 className="t-h1" style={{ margin: '2px 0 12px' }}>
          {firstName}
        </h2>
        <Link to="/search" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="searchbar">
            <span className="searchbar__pin" aria-hidden="true"><Icon name="search" size={16} /></span>
            {t('home.subtitle')}
            <span className="spacer" />
            <b style={{ color: 'var(--p600)' }}>{t('nav.search')}</b>
          </div>
        </Link>
      </div>

      {error && (
        <Alert severity="error" title={t('error.generic')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <>
          <Skeleton height={110} />
          <Skeleton height={80} />
          <Skeleton height={110} />
        </>
      ) : (
        <>
          {activeJourney ? (
            <Card
              interactive
              style={{ borderLeft: '4px solid var(--p600)' }}
              onClick={() => navigate(`/active-journeys/${activeJourney.id}`)}
            >
              <div className="row-between">
                <Badge value={activeJourney.status} />
                <span className="t-caption">
                  started{' '}
                  {new Date(activeJourney.started_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <b style={{ display: 'block', margin: '6px 0' }}>
                Live Tracking Active — Tap to view progress & controls
              </b>
              <div style={{ height: 6, background: 'var(--p100)', borderRadius: 3 }}>
                <div
                  style={{
                    width: `${Number(activeJourney.current_progress_percent) || 0}%`,
                    height: '100%',
                    background: 'var(--p600)',
                    borderRadius: 3,
                  }}
                />
              </div>
              <div className="row-between" style={{ marginTop: 6 }}>
                <span className="t-caption">
                  {Number(activeJourney.current_progress_percent) ?? 0}% · on route
                </span>
                <span className="t-caption">leg {activeJourney.current_leg_index + 1}</span>
              </div>
            </Card>
          ) : (
            <Card flat>
              <StateBlock
                icon={<Icon name="plan" size={22} aria-hidden="true" />}
                title="Plan your first trip"
                message="Search a route and start tracking it live."
                action={
                  <Link to="/search">
                    <Button size="sm">{t('home.start_searching')}</Button>
                  </Link>
                }
              />
            </Card>
          )}

          {alerts.length > 0 && (
            <div className="stack-sm">
              {alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} severity="warning" title={alert.header_text}>
                  {alert.description_text}
                </Alert>
              ))}
            </div>
          )}

          <div className="row-between" style={{ marginTop: 'var(--sp-2)' }}>
            <b style={{ fontSize: 14 }}>Metro network</b>
            <span className="t-caption">{t('home.metro_source')}</span>
          </div>
          {metroLines.length > 0 ? (
            metroLines.map((line) => (
              <Card key={line.id} flat className="row">
                <ModeDot mode="metro" />
                <div className="grow">
                  <Link to={`/routes/${line.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b style={{ fontSize: 13 }}>
                      {line.line} · {line.from} → {line.to}
                    </b>
                    <div className="t-caption">{line.line} · {line.stopCount} {t('home.metro_stops')}</div>
                  </Link>
                </div>
                <Link to={`/routes/${line.id}`} className="t-label">
                  {t('home.metro_plan')}
                </Link>
              </Card>
            ))
          ) : (
            <Card flat>
              <StateBlock
                icon={<Icon name="modeMetro" size={22} aria-hidden="true" />}
                tone="info"
                title="Metro network unavailable"
                message="Live route data could not be loaded. Check your connection."
                action={
                  <Link to="/search">
                    <Button size="sm">{t('nav.search')}</Button>
                  </Link>
                }
              />
            </Card>
          )}
        </>
      )}
    </>
  )

  const guestContent = (
    <>
      <div className="hero" style={{ marginTop: 'calc(-1 * var(--sp-4))' }}>
        <div className="t-caption" style={{ color: 'rgba(255,255,255,.8)' }}>
          WASEL EGYPT
        </div>
        <h1 className="t-display" style={{ margin: '6px 0 12px', maxWidth: 420 }}>
          {t('landing.tagline')}
        </h1>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {[t('landing.feature_live'), t('landing.feature_reports'), t('landing.feature_recover')].map((f) => (
            <span
              key={f}
              className="badge"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="row-between" style={{ marginTop: 'var(--sp-6)' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Button block size="lg">
              {t('home.login')}
            </Button>
          </Link>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Button block size="lg" variant="secondary">
              {t('home.register')}
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert severity="error" title={t('error.generic')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <>
          <Skeleton height={110} />
          <Skeleton height={80} />
          <Skeleton height={110} />
        </>
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="stack-sm">
              {alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} severity="warning" title={alert.header_text}>
                  {alert.description_text}
                </Alert>
              ))}
            </div>
          )}

          <div className="row-between" style={{ marginTop: 'var(--sp-2)' }}>
            <b style={{ fontSize: 14 }}>Metro network</b>
            <span className="t-caption">{t('home.metro_source')}</span>
          </div>
          {metroLines.length > 0 ? (
            metroLines.map((line) => (
              <Card key={line.id} flat className="row">
                <ModeDot mode="metro" />
                <div className="grow">
                  <Link to={`/routes/${line.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b style={{ fontSize: 13 }}>
                      {line.line} · {line.from} → {line.to}
                    </b>
                    <div className="t-caption">{line.line} · {line.stopCount} {t('home.metro_stops')}</div>
                  </Link>
                </div>
                <Link to={`/routes/${line.id}`} className="t-label">
                  {t('home.metro_plan')}
                </Link>
              </Card>
            ))
          ) : (
            <Card flat>
              <StateBlock
                icon={<Icon name="modeMetro" size={22} aria-hidden="true" />}
                tone="info"
                title="Metro network unavailable"
                message="Live route data could not be loaded. Check your connection."
                action={
                  <Link to="/search">
                    <Button size="sm">{t('nav.search')}</Button>
                  </Link>
                }
              />
            </Card>
          )}
        </>
      )}
    </>
  )

  return (
    <>
      {isAuthenticated ? authenticatedContent : guestContent}
    </>
  )
}