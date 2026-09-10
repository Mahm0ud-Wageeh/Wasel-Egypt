import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest, getData } from '../api/client'
import { endpoints } from '../api/endpoints'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'

/**
 * Route/line information page (final-product completion — design §route).
 *
 * A line becomes a complete, useful entity from REAL data only:
 * - route identity: short/long name, operator, mode, color (public-routes/{id})
 * - directions: active variants with headsign/direction (same payload)
 * - ordered stops per direction (routes/{id}/stops)
 * - stored line shape on the map (route-variants/{id}/geometry — 404s
 *   honestly when a variant has no shape)
 * - service frequency windows (GTFS frequencies; "every N min" per window)
 * - plan-from-stop actions feeding the real journey planner
 *
 * No invented values: missing frequency → explicit empty state; missing
 * geometry → stops-only list without a fake line.
 */

const MODE_DOT = {
  metro: 'metro', bus: 'bus', minibus: 'minibus', microbus: 'microbus', rail: 'rail',
}

function formatClock(hhmmss) {
  const parts = String(hhmmss ?? '').split(':')
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : hhmmss
}

export default function RouteDetail() {
  const { id } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [route, setRoute] = useState(null)
  const [variantStops, setVariantStops] = useState([]) // [{variant_id, headsign, direction, stops}]
  const [geometry, setGeometry] = useState(null) // [[lat,lng],…]
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [directionIndex, setDirectionIndex] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    setRoute(null)
    setVariantStops([])
    setGeometry(null)

    getData(endpoints.public.routeDetail(id))
      .then((res) => {
        if (!active) return
        setRoute(res ?? null)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    getData(endpoints.public.routeStops(id))
      .then((res) => {
        if (!active) return
        const variants = (Array.isArray(res) ? res : []).filter((v) => Array.isArray(v.stops) && v.stops.length > 0)
        if (active) setVariantStops(variants)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  // Fetch the polyline for the selected direction's variant (separate call —
  // geometry payloads are large and only one direction shows at a time).
  const activeVariant = route?.variants?.[directionIndex]
  useEffect(() => {
    let active = true
    setGeometry(null)
    if (!activeVariant?.id) return undefined
    apiRequest(endpoints.public.variantGeometry(activeVariant.id), { auth: false })
      .then((res) => {
        if (active && res?.data?.geometry) setGeometry(res.data.geometry)
      })
      .catch(() => {
        /* honest state: no shape stored for this variant */
      })
    return () => {
      active = false
    }
  }, [activeVariant?.id])

  const variant = variantStops[directionIndex]
  const stops = useMemo(() => variant?.stops ?? [], [variant])
  const mapStops = useMemo(
    () => stops.map((s) => ({ id: s.stop_id, name: s.stop_name, lat: Number(s.latitude), lng: Number(s.longitude) })),
    [stops],
  )

  // Line color: GTFS color when stored, else the mode color.
  const lineColor = route?.color && /^#?[0-9a-fA-F]{6}$/.test(route.color)
    ? (route.color.startsWith('#') ? route.color : `#${route.color}`)
    : null
  const modeName = String(route?.transit_mode?.name ?? 'bus').toLowerCase()

  const windows = activeVariant?.frequency_windows
  const headsign = activeVariant?.headsign ?? variant?.headsign
  const stopName = (s) => s.stop_name

  const planFrom = (stop) => {
    navigate('/search', {
      state: { prefillStop: { id: stop.stop_id, name: stop.stop_name, latitude: Number(stop.latitude), longitude: Number(stop.longitude) } },
    })
  }

  // Stop-panel actions (scenario D): feed the real planner via the same
  // prefill contract, honoring the chosen endpoint.
  const handleMapStopSelect = ({ target, id, name, latitude, longitude }) => {
    navigate('/search', {
      state: {
        prefillStop: { id, name, latitude: Number(latitude), longitude: Number(longitude) },
        prefillTarget: target === 'destination' ? 'destination' : 'origin',
      },
    })
  }

  if (loading) {
    return (
      <div className="stack">
        <Skeleton style={{ height: 84 }} />
        <Skeleton style={{ height: 280 }} />
        <Skeleton style={{ height: 120 }} />
      </div>
    )
  }

  if (failed || !route) {
    return (
      <Card flat>
        <StateBlock
          icon={<Icon name="info" size={22} aria-hidden="true" />}
          tone="error"
          title={t('route.not_found')}
          action={<Link to="/home" className="btn btn--secondary btn--sm">{t('route.back_network')}</Link>}
        />
      </Card>
    )
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-4)' }}>
      {/* ---- Identity header ---- */}
      <Card flat className="row" style={{ gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <ModeDot mode={MODE_DOT[modeName] ?? 'bus'} />
        <div className="grow">
          <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
            <b style={{ fontSize: 19, color: 'var(--ink900)' }}>
              {route.short_name || route.name}
            </b>
            {lineColor && (
              <span aria-hidden="true" style={{
                inlineSize: 14, blockSize: 14, borderRadius: 4,
                background: lineColor, flex: 'none', border: '1px solid var(--line)',
              }} />
            )}
          </div>
          <div className="t-caption" style={{ color: 'var(--ink700)' }}>{route.long_name}</div>
          <div className="row" style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="t-caption">
              <Icon name="shield" size={12} aria-hidden="true" /> {t('route.operator')}: <b>{route.transit_operator?.name ?? '—'}</b>
            </span>
            <span className="t-caption">
              {t('route.mode')}: <b>{route.transit_mode?.name ?? '—'}</b>
            </span>
            {activeVariant?.reliability_score != null && (
              <Badge tone="low" label={`${t('route.reliability')} ${Math.round(activeVariant.reliability_score * 100)}%`} />
            )}
          </div>
        </div>
        <Link to="/home" className="btn btn--secondary btn--sm">{t('route.back_network')}</Link>
      </Card>

      {/* ---- Direction switch (real variants) ---- */}
      {route.variants?.length > 1 && (
        <div className="seg" role="tablist" aria-label={t('route.variants')} style={{ display: 'inline-flex' }}>
          {route.variants.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={i === directionIndex}
              onClick={() => setDirectionIndex(i)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--line-strong)',
                background: i === directionIndex ? 'var(--p600)' : 'var(--surface)',
                color: i === directionIndex ? '#fff' : 'var(--ink700)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {v.headsign || v.name}
            </button>
          ))}
        </div>
      )}

      {/* ---- Line map (stored shape + stops) ---- */}
      <Card flat style={{ padding: 'var(--sp-2)' }}>
        {geometry ? (
          <MapPanel
            itinerary={{
              legs: geometry.length >= 2
                ? [{ type: 'transit', mode: modeName, geometry, from_lat: geometry[0][0], from_lng: geometry[0][1], to_lat: geometry[geometry.length - 1][0], to_lng: geometry[geometry.length - 1][1] }]
                : [],
            }}
            stops={mapStops}
            height={340}
            fitTo="route"
            onSelectStop={handleMapStopSelect}
          />
        ) : (
          <div className="planner-map" aria-label={t('route.no_geometry')} style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="t-caption">{t('route.no_geometry')}</span>
          </div>
        )}
      </Card>

      {/* ---- Frequency (GTFS windows) ---- */}
      <Card flat>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <b>{t('route.frequency_title')}</b>
          {headsign && <span className="t-caption">{headsign}</span>}
        </div>
        {windows && windows.length > 0 ? (
          <div className="stack-sm" style={{ marginTop: 10 }}>
            {windows.map((w, i) => (
              <div key={i} className="row" style={{ justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                <span className="t-label num">
                  {t('route.frequency_every').replace('{mins}', Math.max(1, Math.round((w.headway_secs || 0) / 60)))}
                </span>
                <span className="t-caption num">
                  {t('route.frequency_window')
                    .replace('{start}', formatClock(w.start_time))
                    .replace('{end}', formatClock(w.end_time))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-caption" style={{ marginTop: 8 }}>{t('route.no_frequency')}</p>
        )}
      </Card>

      {/* ---- Ordered stops + plan-from actions ---- */}
      <Card flat>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <b>{t('route.stops_title')}</b>
          <span className="t-caption num">{t('route.stops_count').replace('{count}', stops.length)}</span>
        </div>
        {stops.length === 0 ? (
          <StateBlock
            icon={<Icon name="signage" size={22} aria-hidden="true" />}
            tone="info"
            title={t('route.no_geometry')}
          />
        ) : (
          <ol className="route-stoplist" style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
            {stops.map((s, i) => (
              <li key={`${s.stop_id}-${i}`} className="route-stoplist__item">
                <span className="route-stoplist__node" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="route-stoplist__name">{stopName(s)}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm route-stoplist__plan"
                  onClick={() => planFrom(s)}
                  aria-label={t('route.plan_from_stop').replace('{stop}', s.stop_name)}
                >
                  <Icon name="track" size={13} aria-hidden="true" />
                  {t('route.plan_from_stop').replace('{stop}', '')}
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
