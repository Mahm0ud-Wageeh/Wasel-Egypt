import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useI18n } from '../../i18n/LanguageContext'
import { apiRequest } from '../../api/client'
import { endpoints } from '../../api/endpoints'

const MODE_DOT_VAR = {
  metro: 'var(--mode-metro)',
  bus: 'var(--mode-bus)',
  minibus: 'var(--mode-minibus)',
  microbus: 'var(--mode-microbus)',
  rail: 'var(--mode-rail)',
  walking: 'var(--mode-walking)',
}

/** Line dot: GTFS route color when stored, else the serving mode's color. */
function lineDotColor(line) {
  if (line.color && /^#/.test(line.color)) return line.color
  const mode = String(line.modes?.[0] ?? '').toLowerCase()
  return MODE_DOT_VAR[mode] ?? 'var(--ink500)'
}

/**
 * Stop information panel (design system v3 §10 map spec).
 *
 * Opens when a map stop is selected. Real data only:
 * - Lines serving the stop  → GET /stops/{id}?with_routes=1
 * - Next departures        → GET /stops/{id}/departures
 *
 * Departure honesty contract (same as the backend): lines without
 * timetable data are shown with an explicit "no timetable data" note
 * and NO invented time; a failed/empty fetch renders honest empty
 * states — never fake minutes.
 *
 * The panel is presentation + actions: onSelectOrigin/onSelectDestination
 * are wired by the parent (MapPanel) to the live planner state.
 */
export function StopPanel({ stop, onClose, onSelectOrigin, onSelectDestination }) {
  const { t } = useI18n()
  const [detail, setDetail] = useState(null)
  const [departures, setDepartures] = useState(null)
  const [failed, setFailed] = useState(false)
  const [closing, setClosing] = useState(false)
  const panelRef = useRef(null)

  // Reset per selected stop.
  useEffect(() => {
    setDetail(null)
    setDepartures(null)
    setFailed(false)
    if (!stop) return

    let active = true
    apiRequest(endpoints.public.stopWithRoutes(stop.id), { auth: false })
      .then((res) => {
        if (active && res?.data) setDetail(res.data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    apiRequest(`${endpoints.public.stopDepartures(stop.id)}?limit=3`, { auth: false })
      .then((res) => {
        if (active && res?.data?.departures) setDepartures(res.data.departures)
      })
      .catch(() => {
        /* departures are optional context — serving routes still render */
      })

    return () => {
      active = false
    }
  }, [stop])

  // Focus the panel heading for keyboard/SR users on open.
  useEffect(() => {
    if (stop) panelRef.current?.focus()
  }, [stop])

  if (!stop) return null

  const animateClose = () => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 140)
  }

  const lines = detail?.serving_routes ?? []
  const departureRows = departures ?? []
  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  }
  const minutesAway = (iso) => {
    const ms = new Date(iso).getTime() - Date.now()
    const min = Math.round(ms / 60000)
    if (Number.isFinite(min)) return min
    return null
  }

  return (
    <div
      className={`stop-panel${closing ? ' stop-panel--closing' : ''}`}
      role="dialog"
      aria-label={t('map.stop_panel_title')}
    >
      <div className="stop-panel__head">
        <div className="stop-panel__heading">
          <span className="stop-panel__icon" aria-hidden="true">
            <Icon name="pin" size={16} />
          </span>
          <div>
            <h3 className="stop-panel__name" tabIndex={-1} ref={panelRef}>
              {stop.name}
            </h3>
            <span className="t-caption">
              {lines.length > 0
                ? t('map.stop_panel_serving')
                : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="stop-panel__close"
          onClick={animateClose}
          aria-label={t('map.stop_panel_close')}
        >
          <Icon name="close" size={15} aria-hidden="true" />
        </button>
      </div>

      {lines.length > 0 && (
        <div className="stop-panel__lines" role="list" aria-label={t('map.stop_panel_serving')}>
          {lines.slice(0, 8).map((line) => (
            <span key={line.route_id} className="mode-chip" role="listitem">
              <span
                className="mode-dot"
                style={{ background: lineDotColor(line) }}
                aria-hidden="true"
              />
              {line.short_name || line.long_name || t('map.legend_stop')}
            </span>
          ))}
          {lines.length > 8 && (
            <span className="t-caption stop-panel__more">+{lines.length - 8}</span>
          )}
        </div>
      )}

      <div className="stop-panel__departures">
        <span className="stop-panel__section-title">{t('map.stop_panel_departures')}</span>

        {departures === null && !failed && (
          <div className="stop-panel__loading" role="status">
            <span className="spinner spinner--inline" />
          </div>
        )}

        {departures !== null && departureRows.length === 0 && (
          <p className="t-caption stop-panel__empty">{t('map.stop_panel_no_departures')}</p>
        )}

        {departureRows.map((row) => (
          <div key={row.route_variant_id} className="stop-panel__dep">
            <div className="stop-panel__dep-info">
              <b className="stop-panel__dep-route">
                {row.route_short_name || row.headsign || t('map.legend_stop')}
              </b>
              <span className="t-caption stop-panel__dep-dir">{row.headsign}</span>
            </div>
            {row.has_timetable && row.departures.length > 0 ? (
              <div className="stop-panel__dep-times">
                {row.departures.slice(0, 3).map((dep, i) => {
                  const min = minutesAway(dep.time)
                  return (
                    <span key={dep.time} className={`stop-panel__time${i === 0 ? ' is-next' : ''}`}>
                      {min !== null && min <= 0
                        ? t('map.stop_panel_now')
                        : min !== null
                          ? `${Math.max(1, min)} ${t('map.stop_panel_min')}`
                          : fmtTime(dep.time)}
                    </span>
                  )
                })}
              </div>
            ) : (
              <span className="t-caption stop-panel__dep-notime">
                {t('map.stop_panel_no_timetable')}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="stop-panel__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onSelectOrigin?.(stop)}
        >
          <Icon name="track" size={14} aria-hidden="true" />
          {t('map.stop_panel_set_origin')}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => onSelectDestination?.(stop)}
        >
          {t('map.stop_panel_set_destination')}
        </button>
      </div>
    </div>
  )
}
