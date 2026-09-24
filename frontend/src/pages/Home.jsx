import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { useJourneyContext } from '../contexts/JourneyContext'
import { getData, apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import { getSavedJourneys, cairoWallTime } from '../api/journeys'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'
import { PlannerCard } from '../components/journey/PlannerCard'
import { useJourneyPlanner } from '../components/journey/JourneyPlannerForm'
import { LineCard } from '../components/journey/LineCard'
import { formatDuration } from '../utils/format'

/**
 * Passenger home — the product dashboard.
 *
 * Desktop: greeting + live planner beside a real network map, metric
 * strip, active-journey rail, premium metro line cards, saved plans.
 * Mobile: the same blocks stacked by importance, no empty gaps.
 *
 * Every figure is live API data (stops/routes totals, alerts, saved
 * journeys, metro variants); nothing is fabricated.
 */

/** Builds a metro-line card body from real route + variant stop data. */
function metroLineSummary(route, stopsPayload) {
  const variant = stopsPayload?.[0]
  const stops = variant?.stops ?? []
  const first = stops[0]?.stop_name
  const last = stops[stops.length - 1]?.stop_name
  if (!first || !last) return null
  const color = route.color && /^#?[0-9a-fA-F]{6}$/.test(route.color)
    ? (route.color.startsWith('#') ? route.color : `#${route.color}`)
    : null
  return {
    id: route.id,
    line: route.short_name,
    name: route.name,
    from: first,
    to: last,
    stopCount: stops.length,
    color,
    operator: route.transit_operator?.name ?? null,
    mode: route.transit_mode?.name ?? 'metro',
  }
}

function coordSelection(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  return {
    id: `coord_${la.toFixed(4)}_${ln.toFixed(4)}`,
    name: `Location (${la.toFixed(4)}, ${ln.toFixed(4)})`,
    latitude: la,
    longitude: ln,
  }
}

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { storeSearch } = useJourneyContext()
  const planner = useJourneyPlanner()

  const [activeJourney, setActiveJourney] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [metroLines, setMetroLines] = useState([])
  const [coverage, setCoverage] = useState(null)
  const [saved, setSaved] = useState([])
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
      // Live network totals for the metric strip.
      apiRequest(`${endpoints.public.stops}?per_page=1`)
        .then((res) => (Number.isFinite(res?.meta?.total) ? res.meta.total : null))
        .catch(() => null),
      apiRequest(`${endpoints.public.routes}?per_page=1`)
        .then((res) => (Number.isFinite(res?.meta?.total) ? res.meta.total : null))
        .catch(() => null),
    ]
    if (isAuthenticated) {
      requests.unshift(
        getData(endpoints.activeJourneys.list).catch(() => null)
      )
      requests.push(
        getSavedJourneys(4).catch(() => [])
      )
    }

    Promise.all(requests)
      .then((results) => {
        if (cancelled) return
        const [active, serviceAlerts, metro, stopsTotal, routesTotal, savedList] = isAuthenticated
          ? results
          : [null, ...results]
        const list = isAuthenticated ? (Array.isArray(active) ? active : (active?.data ?? [])) : []
        setActiveJourney(list.find((j) => j.status === 'active') ?? null)
        const alertsData = isAuthenticated ? serviceAlerts : active
        setAlerts(
          Array.isArray(alertsData) ? alertsData : (alertsData?.data ?? [])
        )
        setMetroLines(Array.isArray(metro) ? metro : [])
        setCoverage({
          stops: stopsTotal,
          routes: routesTotal,
        })
        setSaved(isAuthenticated && Array.isArray(savedList) ? savedList : [])
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

  const reuseJourney = (j) => {
    const o = coordSelection(j.origin.lat, j.origin.lng)
    const d = coordSelection(j.destination.lat, j.destination.lng)
    storeSearch({
      origin_lat: o.latitude,
      origin_lng: o.longitude,
      destination_lat: d.latitude,
      destination_lng: d.longitude,
      requested_at: cairoWallTime(),
      max_transfers: 1,
      max_walk_distance_per_leg: 1000,
      alternatives: 3,
      avoided_modes: [],
      originStop: o,
      destinationStop: d,
    })
    navigate('/search')
  }

  const metrics = useMemo(() => {
    const items = []
    if (coverage?.stops != null) {
      items.push({ icon: 'pin', value: coverage.stops.toLocaleString(), label: t('landing.stats_stops') })
    }
    if (coverage?.routes != null) {
      items.push({ icon: 'route', value: coverage.routes.toLocaleString(), label: t('landing.stats_routes') })
    }
    items.push({ icon: 'alerts', value: String(alerts.length), label: t('home.stats_alerts') })
    if (isAuthenticated) {
      items.push({ icon: 'reports', value: String(saved.length), label: t('home.saved_title') })
    }
    return items
  }, [coverage, alerts, saved, isAuthenticated, t])

  const originPreview = planner.originStop
    ? { lat: Number(planner.originStop.latitude ?? planner.originStop.lat), lng: Number(planner.originStop.longitude ?? planner.originStop.lng) }
    : null
  const destinationPreview = planner.destinationStop
    ? { lat: Number(planner.destinationStop.latitude ?? planner.destinationStop.lat), lng: Number(planner.destinationStop.longitude ?? planner.destinationStop.lng) }
    : null
  const userPreview = planner.currentLocationContext.selection && planner.originStop?.isCurrent
    ? {
      lat: Number(planner.originStop.latitude),
      lng: Number(planner.originStop.longitude),
      accuracy: planner.originStop.accuracy,
    }
    : null

  return (
    <div className="home-dash">
      {/* ---- Hero: greeting + live planner + live map ---- */}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__intro anim-rise">
          <span className="eyebrow">{t('app.name')}</span>
          <h1 id="home-title" className="home-hero__title">
            {isAuthenticated ? (
              <>{t('home.greeting')} <span className="home-hero__name">{firstName}</span></>
            ) : (
              <>{t('landing.tagline')}</>
            )}
          </h1>
          <p className="home-hero__lede">{t('home.subtitle')}</p>
          <div className="home-hero__points">
            {[
              { icon: 'track', label: t('landing.feature_live') },
              { icon: 'community', label: t('landing.feature_reports') },
              { icon: 'recover', label: t('landing.feature_recover') },
            ].map((f) => (
              <span key={f.label} className="hero-feature-chip">
                <Icon name={f.icon} size={14} aria-hidden="true" />
                {f.label}
              </span>
            ))}
          </div>
          {!isAuthenticated && (
            <div className="home-hero__auth">
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button size="md">{t('home.login')}</Button>
              </Link>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button size="md" variant="secondary">{t('home.register')}</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="home-hero__planner anim-rise" style={{ ['--d']: '80ms' }}>
          <h2 className="home-hero__planner-title">{t('home.plan_title')}</h2>
          <PlannerCard
            variant="hero"
            planner={planner}
            showSearchHint={false}
            submitLabelKey="planner.find"
          />
        </div>

        <div className="home-hero__map anim-rise" style={{ ['--d']: '140ms' }}>
          <div className="home-map__frame">
            <MapPanel
              origin={originPreview}
              destination={destinationPreview}
              userLocation={userPreview}
              height="100%"
              fitTo="origin"
              showNearbyStops
            />
            <span className="home-map__caption">
              <Icon name="pin" size={13} aria-hidden="true" />
              {t('home.map_title')}
            </span>
          </div>
        </div>
      </section>

      {error && (
        <Alert severity="error" title={t('error.generic')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="home-grid">
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </div>
      ) : (
        <>
          {/* ---- Metric strip (all live) ---- */}
          {metrics.length > 0 && (
            <section className="metric-strip" aria-label={t('home.metrics_label')}>
              {metrics.map((m, i) => (
                <div key={m.label} className="metric-card anim-rise" style={{ ['--d']: `${i * 60}ms` }}>
                  <span className="metric-card__icon" aria-hidden="true">
                    <Icon name={m.icon} size={18} />
                  </span>
                  <div>
                    <div className="metric-card__value t-num">{m.value}</div>
                    <div className="t-caption">{m.label}</div>
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="home-grid">
            {/* ---- Main rail ---- */}
            <div className="stack">
              {activeJourney ? (
                <Card
                  interactive
                  className="journey-live-card"
                  onClick={() => navigate(`/active-journeys/${activeJourney.id}`)}
                  aria-label={`${t('home.active_journey')} — ${t('home.view_live')}`}
                >
                  <div className="row-between">
                    <span className="live-pulse" aria-hidden="true" />
                    <Badge value={activeJourney.status} />
                    <span className="spacer" />
                    <span className="t-caption">
                      {t('journey.progress')} {Number(activeJourney.current_progress_percent) || 0}%
                    </span>
                  </div>
                  <b className="journey-live-card__title">{t('home.active_journey')}</b>
                  <div
                    role="progressbar"
                    aria-valuenow={Number(activeJourney.current_progress_percent) || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('journey.progress')}
                    className="progress-track"
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${Number(activeJourney.current_progress_percent) || 0}%` }}
                    />
                  </div>
                  <div className="row-between" style={{ marginTop: 8 }}>
                    <span className="t-caption">
                      {t('journey.current_leg')} {Number(activeJourney.current_leg_index ?? 0) + 1}
                    </span>
                    <span className="t-label" style={{ color: 'var(--p700)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {t('home.view_live')}
                      <Icon name="arrowRight" size={14} aria-hidden="true" />
                    </span>
                  </div>
                </Card>
              ) : (
                isAuthenticated && (
                  <Card flat>
                    <StateBlock
                      icon={<Icon name="plan" size={22} aria-hidden="true" />}
                      title={t('home.first_trip_title')}
                      message={t('home.first_trip_body')}
                      action={
                        <Link to="/search">
                          <Button size="sm">{t('home.start_searching')}</Button>
                        </Link>
                      }
                    />
                  </Card>
                )
              )}

              {/* ---- Metro network: premium line cards ---- */}
              <section aria-labelledby="home-metro-title">
                <div className="row-between section-head-inline">
                  <h2 id="home-metro-title" className="section-title-sm">{t('home.metro_title')}</h2>
                  <span className="t-caption">{t('home.metro_source')}</span>
                </div>
                {metroLines.length > 0 ? (
                  <div className="line-grid">
                    {metroLines.map((line, i) => (
                      <LineCard key={line.id} line={line} index={i} />
                    ))}
                  </div>
                ) : (
                  <Card flat>
                    <StateBlock
                      icon={<Icon name="modeMetro" size={22} aria-hidden="true" />}
                      tone="info"
                      title={t('home.metro_empty_title')}
                      message={t('home.metro_empty_body')}
                    />
                  </Card>
                )}
              </section>

              {/* ---- Saved plans (authed) ---- */}
              {isAuthenticated && (
                <section aria-labelledby="home-saved-title">
                  <div className="row-between section-head-inline">
                    <h2 id="home-saved-title" className="section-title-sm">{t('home.saved_title')}</h2>
                  </div>
                  {saved.length > 0 ? (
                    <ul className="saved-list">
                      {saved.map((j) => (
                        <li key={j.id} className="saved-card">
                          <div className="grow">
                            <div className="t-label">
                              {new Date(j.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              {' · '}
                              <span className="t-num">{formatDuration(j.total_duration_sec)}</span>
                            </div>
                            <div className="t-caption">
                              {j.total_transfers === 0
                                ? t('results.direct')
                                : t('results.transfers').replace('{count}', j.total_transfers)}
                              {' · '}{j.status}
                            </div>
                          </div>
                          <button type="button" className="chip" onClick={() => reuseJourney(j)}>
                            <Icon name="recover" size={13} aria-hidden="true" />
                            {t('home.reuse')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="t-caption">{t('home.saved_empty')}</p>
                  )}
                </section>
              )}
            </div>

            {/* ---- Side rail ---- */}
            <div className="stack">
              <Card flat className="how-card anim-rise" style={{ ['--d']: '120ms' }}>
                <h2 className="section-title-sm" style={{ marginBottom: 4 }}>{t('home.how_title')}</h2>
                <ol className="how-list">
                  {[
                    { icon: 'plan', label: t('landing.plan_step') },
                    { icon: 'track', label: t('landing.track_step') },
                    { icon: 'detect', label: t('landing.detect_step') },
                    { icon: 'recover', label: t('landing.recover_step') },
                  ].map((s, i) => (
                    <li key={s.label} className="how-list__item">
                      <span className="how-list__num t-num" aria-hidden="true">{i + 1}</span>
                      <span className="how-list__icon" aria-hidden="true">
                        <Icon name={s.icon} size={15} />
                      </span>
                      <span className="t-label">{s.label}</span>
                    </li>
                  ))}
                </ol>
                <Link to="/search" className="line-card__cta" style={{ marginTop: 4 }}>
                  {t('home.plan_title')}
                  <Icon name="arrowRight" size={14} aria-hidden="true" />
                </Link>
              </Card>

              {alerts.length > 0 && (
                <section aria-labelledby="home-alerts-title">
                  <h2 id="home-alerts-title" className="section-title-sm section-head-inline">{t('home.alerts')}</h2>
                  <div className="stack-sm">
                    {alerts.slice(0, 3).map((alert) => (
                      <Alert key={alert.id} severity="warning" title={alert.header_text}>
                        {alert.description_text}
                      </Alert>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
