import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJourneyContext } from '../contexts/JourneyContext'
import { useI18n } from '../i18n/LanguageContext'
import { saveJourney, startSavedJourney } from '../api/journeys'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ModeDot } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/LazyMapPanel'
import { formatDuration, formatDistance, formatTime } from '../utils/format'
import { trackEvent } from '../utils/analytics'

const MODE_LABEL_KEYS = {
  walking: 'journey.walk',
  metro: 'landing.metro',
  bus: 'landing.bus',
  rail: 'landing.rail',
  minibus: 'landing.minibus',
  microbus: 'landing.microbus',
}

/** Product-meaning lucide icon per transit mode. */
const MODE_ICONS = {
  walking: 'modeWalking',
  metro: 'modeMetro',
  bus: 'modeBus',
  rail: 'modeRail',
  minibus: 'modeMinibus',
  microbus: 'modeMicrobus',
}

const legColor = (leg) => (leg.type === 'walking' ? 'var(--mode-walking)' : `var(--mode-${leg.mode})` ?? 'var(--p600)')

/**
 * Compact horizontal route strip: Origin → walk → transit → transfer →
 * … → Destination, using semantic SVG icons (spec: no emoji iconography).
 */
function RouteStrip({ option }) {
  const { t } = useI18n()
  // Resolve the mode label through i18n; fall back to the raw mode id
  // when no dictionary entry exists (never render a raw key).
  const modeLabel = (mode) => {
    const key = MODE_LABEL_KEYS[mode]
    if (!key) return mode ?? ''
    const translated = t(key)
    return translated === key ? (mode ?? '') : translated
  }
  const nodes = []

  nodes.push({ key: 'origin', icon: 'pin', color: 'var(--p600)', label: t('results.origin') });
  (option.legs ?? []).forEach((leg, idx) => {
    const prev = option.legs[idx - 1]
    if (prev && prev.to_stop?.id !== leg.from_stop?.id) {
      nodes.push({ key: `xfer-${idx}`, icon: 'recover', color: 'var(--ink500)', label: t('results.transfer_walk') })
    }
    nodes.push({
      key: `leg-${idx}`,
      icon: leg.type === 'walking' ? 'modeWalking' : (MODE_ICONS[leg.mode] ?? 'navigate'),
      color: legColor(leg),
      label: leg.type === 'walking' ? `${t('journey.walk')} ${formatDistance(leg.distance_meters)}` : `${modeLabel(leg.mode)} · ${leg.route?.short_name ?? leg.route?.long_name ?? ''}`,
    })
  })
  nodes.push({ key: 'dest', icon: 'navigate', color: 'var(--a600)', label: t('results.destination') })

  return (
    <div className="routestrip" role="img" aria-label={`Route: ${nodes.map((n) => n.label).join(' → ')}`}>
      {nodes.map((n, i) => (
        <span key={n.key} className="routestrip__cell">
          {i > 0 && <span className="routestrip__line" aria-hidden="true" />}
          <span className="routestrip__node" title={n.label} style={{ color: n.color }}>
            <Icon name={n.icon} size={14} aria-hidden="true" />
          </span>
        </span>
      ))}
    </div>
  )
}

/** Use API metadata only; unknown dates never inherit a date from the source ID. */
function FareAttribution({ fare }) {
  const { t, language } = useI18n()
  // data_status is the generic honesty signal the backend now attaches;
  // source regex remains the specific TfC attribution for metro rows.
  const isReal = fare?.data_status ? fare.data_status === 'real'
    : (typeof fare?.source === 'string' && /^tfc_metro_fares(?:_\d{4})?$/.test(fare.source))
  if (fare?.amount == null || !isReal) return null

  const hasDate = typeof fare.as_of === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(fare.as_of)
  // Only the identified Mobility Database source receives that specific
  // credit; other verified sources fall back to the generic (TfC) form.
  // Undated rows never guess a date or distributor.
  const isIdentifiedSource = typeof fare.source === 'string' && /^tfc_metro_fares_\d{4}$/.test(fare.source)
  const key = isIdentifiedSource
    ? (hasDate ? 'journey.fare_attribution_metro' : 'journey.fare_attribution_metro_undated')
    : (hasDate ? 'journey.fare_attribution_tfc_dated' : 'journey.fare_attribution_tfc')
  const date = hasDate ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${fare.as_of}-01T00:00:00Z`)) : null

  return (
    <small className="t-caption" style={{ display: 'block', marginBlockStart: 4, color: 'var(--ink500)', textAlign: 'start', overflowWrap: 'anywhere' }}>
      {hasDate ? t(key).replace('{date}', date) : t(key)}
    </small>
  )
}

/**
 * Explainable scoring: the normalized components behind the recommendation
 * (weights from JourneyScoringService: time .40, walk .20, transfers .20,
 * fare .10, reliability .10).
 */
function ScoreExplanation({ option }) {
  const { t } = useI18n()
  const dur = option.total_duration_sec
  const walk = option.walk_distance_meters
  const transfers = option.total_transfers
  const fare = option.fare?.amount ?? null
  const reliability = option.reliability ?? null

  const rows = [
    { key: 'time', label: t('results.metric_time'), value: `${formatDuration(dur)}`, pct: Math.min(100, (dur / 5400) * 100) },
    { key: 'walking', label: t('results.metric_walking'), value: formatDistance(walk), pct: Math.min(100, (walk / 2500) * 100) },
    { key: 'transfers', label: t('results.metric_transfers'), value: String(transfers), pct: Math.min(100, (transfers / 4) * 100) },
    { key: 'fare', label: t('results.metric_fare'), value: fare != null ? `${fare} EGP` : '—', pct: fare != null ? Math.min(100, (fare / 30) * 100) : 0 },
    { key: 'reliability', label: t('results.metric_reliability'), value: reliability != null ? `${Math.round(reliability * 100)}%` : '—', pct: reliability != null ? reliability * 100 : 0 },
  ]

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="t-label" style={{ fontSize: 12 }}>{t('results.why')}</span>
        <span className="t-caption">score {option.score?.toFixed(2)}</span>
      </div>
      <div className="score-bars">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="score-bar">
              <span>{r.label}</span>
              <span className="score-bar__track" aria-hidden>
                <span className="score-bar__fill" style={{ width: `${Math.max(4, r.pct)}%` }} />
              </span>
              <b className="t-num" style={{ textAlign: 'right' }}>{r.value}</b>
            </div>
            {r.key === 'fare' && <FareAttribution fare={option.fare} />}
          </div>
        ))}
      </div>
      <p className="t-caption" style={{ marginTop: 8, marginBottom: 0 }}>
        {t('results.why_note')}
      </p>
    </div>
  )
}

/**
 * Recommendation Explainability: displays human-readable reasons why this route won.
 */
function RecommendationReasons({ option }) {
  const { t } = useI18n()
  const reasons = option?.recommendation_reasons

  if (!Array.isArray(reasons) || reasons.length === 0) {
    return null
  }

  const items = useMemo(() => {
    const list = []
    if (reasons.includes('fastest_travel_time') || reasons.includes('optimal_time')) {
      list.push({ icon: 'clock', text: t('results.reason_fastest') })
    }
    if (reasons.includes('lower_walking')) {
      list.push({ icon: 'modeWalking', text: t('results.reason_low_walk') })
    }
    if (reasons.includes('direct_service')) {
      list.push({ icon: 'circleDot', text: t('results.reason_direct') })
    } else if (reasons.includes('fewer_transfers') || reasons.includes('single_transfer')) {
      list.push({ icon: 'circleDot', text: t('results.reason_fewer_transfers') })
    }
    if (reasons.includes('verified_reliability')) {
      list.push({ icon: 'shield', text: t('results.reason_reliable') })
    }
    if (reasons.includes('verified_fare')) {
      list.push({ icon: 'tag', text: t('results.reason_fare') })
    }
    if (list.length === 0) {
      list.push({ icon: 'shield', text: t('results.reason_optimal_balance') })
    }
    return list
  }, [reasons, t])

  return (
    <div className="bestroute__why" role="region" aria-label={t('results.why_recommended_title')}>
      <span className="t-label" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--p700)' }}>
        <Icon name="shield" size={13} aria-hidden="true" /> {t('results.why_recommended_title')}
      </span>
      <ul className="bestroute__why-list" style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item, i) => (
          <li key={i} className="row" style={{ gap: 7, alignItems: 'center', fontSize: 12.5, color: 'var(--ink900)' }}>
            <span style={{ color: 'var(--p600)', display: 'inline-flex' }}>
              <Icon name={item.icon} size={14} aria-hidden="true" />
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Journey details drawer: full vertical timeline (Origin → legs → transfers
 * → Destination), honest metrics header, and map synchronization.
 */
function JourneyDetails({ option, onClose, onSave, onStart, saveState, selectedLegIndex, onSelectLeg }) {
  const { t } = useI18n()
  const legs = option.legs ?? []
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const reliabilityPct = option.reliability != null ? Math.round(option.reliability * 100) : null

  return (
    <div className="details-drawer" role="dialog" aria-modal="true" aria-label={t('results.details')}>
      <div className="details-drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div className="details-drawer__panel">
        <div className="details-drawer__handle" aria-hidden="true" />

        {/* 2A: Journey Summary Header */}
        <div className="row-between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <div>
            <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span className="badge b-verified" style={{ fontSize: 11 }}>
                <Icon name="shield" size={12} aria-hidden="true" /> {t('results.best_title')}
              </span>
              <span className="t-caption" style={{ fontWeight: 600 }}>
                {firstLeg?.from_stop?.name ?? t('results.origin')} → {lastLeg?.to_stop?.name ?? t('results.destination')}
              </span>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <b className="t-num" style={{ fontSize: 22, color: 'var(--p800)' }}>
                {formatDuration(option.total_duration_sec)}
              </b>
              <span className="t-num" style={{ fontSize: 13, color: 'var(--ink700)' }}>
                {formatTime(firstLeg?.departure_time)} → {formatTime(lastLeg?.arrival_time)}
              </span>
            </div>
          </div>
          <button type="button" className="locpicker__clear" onClick={onClose} aria-label={t('results.close_details')}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Quick Facts Summary Strip */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="chip" style={{ fontSize: 11.5 }}>
            <Icon name="modeWalking" size={12} aria-hidden="true" />
            {formatDistance(option.walk_distance_meters)}
          </span>
          <span className="chip" style={{ fontSize: 11.5 }}>
            <Icon name="circleDot" size={12} aria-hidden="true" />
            {option.total_transfers === 0
              ? t('results.direct')
              : option.total_transfers === 1
                ? t('results.one_transfer')
                : option.total_transfers === 2
                  ? t('results.two_transfers')
                  : t('results.transfers').replace('{count}', option.total_transfers)}
          </span>
          {option.fare && (
            <span className="chip" style={{ fontSize: 11.5 }}>
              {option.fare.amount} {option.fare.currency}
              {option.fare.data_status === 'real' ? ' · ✓' : ' · ~'}
            </span>
          )}
          {reliabilityPct != null && (
            <span className="chip" style={{ fontSize: 11.5 }}>
              <Icon name="shield" size={12} aria-hidden="true" style={{ color: reliabilityPct >= 70 ? 'var(--s800)' : 'var(--w800)' }} />
              {t('results.reliability').replace('{pct}', reliabilityPct)}
            </span>
          )}
        </div>

        {/* 2B: Highly Readable Vertical Journey Timeline */}
        <div className="jtl" role="list" aria-label="Journey leg timeline">
          {/* Origin */}
          <div className="jtl__row jtl__row--endpoint">
            <span className="jtl__dot" style={{ background: 'var(--p600)' }} aria-hidden="true">
              <Icon name="pin" size={12} />
            </span>
            <div>
              <b style={{ fontSize: 13 }}>{t('results.origin')}</b>
              <div className="t-caption">
                {firstLeg?.from_stop?.name ? `${firstLeg.from_stop.name} · ` : ''}
                {t('results.depart')} {formatTime(firstLeg?.departure_time)}
              </div>
            </div>
          </div>

          {legs.map((leg, idx) => {
            const isWalk = leg.type === 'walking'
            const isSelected = selectedLegIndex === idx
            const legModeLabel = isWalk
              ? t('journey.walk')
              : (() => {
                  const key = MODE_LABEL_KEYS[leg.mode]
                  if (!key) return leg.mode
                  const translated = t(key)
                  return translated === key ? leg.mode : translated
                })()

            const prev = legs[idx - 1]
            const waitSec = prev && leg.departure_time && prev.arrival_time
              ? (new Date(leg.departure_time).getTime() - new Date(prev.arrival_time).getTime()) / 1000
              : 0
            const showWait = idx > 0 && waitSec > 120

            const lineName = leg.route?.short_name ?? leg.route?.long_name
            const actionText = isWalk
              ? t('results.action_walk_to').replace('{distance}', formatDistance(leg.distance_meters)).replace('{stop}', leg.to_stop?.name ?? t('results.destination'))
              : t('results.action_board_at').replace('{line}', lineName ? `Line ${lineName}` : legModeLabel).replace('{stop}', leg.from_stop?.name ?? '—')

            return (
              <Fragment key={`leg-frag-${idx}`}>
                {showWait && (
                  <div key={`wait-${idx}`} className="jtl__row jtl__row--transfer" style={{ marginBlock: 2 }}>
                    <span className="jtl__dot jtl__dot--ghost" aria-hidden="true"><Icon name="clock" size={11} /></span>
                    <span className="t-caption" style={{ fontWeight: 600, color: 'var(--w800)' }}>
                      {t('results.wait_minutes').replace('{n}', Math.max(1, Math.round(waitSec / 60)))}
                    </span>
                  </div>
                )}
                <div
                  className={`jtl__row${isWalk ? ' jtl__row--walk' : ''}${isSelected ? ' jtl__row--selected' : ''}`}
                  onClick={() => onSelectLeg?.(idx)}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: 'var(--rad-sm)',
                    background: isSelected ? 'var(--p50, #f0f7fc)' : 'transparent',
                    border: isSelected ? '1px solid var(--p200, #a9d2f2)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to highlight on map"
                >
                  <span className="jtl__dot" style={{ background: legColor(leg) }} aria-hidden="true">
                    <Icon name={isWalk ? 'modeWalking' : (MODE_ICONS[leg.mode] ?? 'navigate')} size={12} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="row-between" style={{ alignItems: 'baseline' }}>
                      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ fontSize: 10, padding: '1px 5px', background: 'var(--sand)' }}>
                          {t('results.leg_label').replace('{n}', idx + 1)}
                        </span>
                        <b style={{ fontSize: 13 }}>
                          {legModeLabel}
                          {lineName ? ` · ${lineName}` : ''}
                        </b>
                        {leg.geometry_source === 'stop_to_stop' && (
                          <span className="badge badge--medium" style={{ fontSize: 10, padding: '1px 5px' }}>
                            {t('results.straight_line_badge')}
                          </span>
                        )}
                      </div>
                      <span className="t-caption t-num" style={{ fontSize: 11.5 }}>
                        {formatTime(leg.departure_time)} → {formatTime(leg.arrival_time)} · {formatDuration(leg.duration_sec)}
                      </span>
                    </div>

                    <div className="t-caption" style={{ marginBlockStart: 3, color: 'var(--ink800)' }}>
                      {actionText}
                    </div>

                    {!isWalk && leg.to_stop?.name && (
                      <div className="t-caption" style={{ fontSize: 11.5, color: 'var(--ink700)', marginBlockStart: 1 }}>
                        {t('results.action_ride_to').replace('{stop}', leg.to_stop.name)}
                        {leg.distance_meters ? ` · ${formatDistance(leg.distance_meters)}` : ''}
                      </div>
                    )}

                    {isWalk && Array.isArray(leg.leg_steps) && leg.leg_steps.length > 0 && (
                      <div className="jtl__walk-steps" style={{ marginBlockStart: 5, paddingInlineStart: 8, borderInlineStart: '2px solid var(--p200)' }}>
                        <span className="t-caption" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink700)' }}>
                          {t('results.turn_steps')}:
                        </span>
                        {leg.leg_steps.map((step, sIdx) => (
                          <div key={sIdx} className="t-caption" style={{ fontSize: 11, color: 'var(--ink700)', marginBlockStart: 2 }}>
                            • {step.instruction} {step.distance ? `(${formatDistance(step.distance)})` : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    {isWalk && leg.walk_source === 'estimate' && (
                      <div className="t-caption" style={{ fontSize: 11, color: 'var(--w800)', marginBlockStart: 2 }}>
                        Walking distance estimated (routing engine unavailable)
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            )
          })}

          {/* Destination */}
          <div className="jtl__row jtl__row--endpoint">
            <span className="jtl__dot" style={{ background: 'var(--a600)' }} aria-hidden="true">
              <Icon name="navigate" size={12} />
            </span>
            <div>
              <b style={{ fontSize: 13 }}>{t('results.destination')}</b>
              <div className="t-caption">
                {lastLeg?.to_stop?.name ? `${lastLeg.to_stop.name} · ` : ''}
                {t('results.arrive')} {formatTime(lastLeg?.arrival_time)}
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBlockStart: 12 }}>
          {option.fare && <span className="badge b-active">{option.fare.amount} {option.fare.currency}</span>}
          {reliabilityPct != null && (
            <span className="badge b-verified">{t('results.reliability').replace('{pct}', reliabilityPct)}</span>
          )}
          <span className="badge b-rerouted">score {option.score?.toFixed(2)}</span>
        </div>

        <DurationBreakdown option={option} />

        <FareAttribution fare={option.fare} />

        <ScoreExplanation option={option} />

        <div className="row" style={{ gap: 8, marginBlockStart: 14 }}>
          <Button
            block
            variant={saveState.saved ? 'secondary' : 'primary'}
            loading={saveState.saving}
            disabled={saveState.saved}
            onClick={onSave}
          >
            {saveState.saved ? (
              <><Icon name="success" size={16} aria-hidden="true" /> {t('results.saved')}</>
            ) : t('results.save')}
          </Button>
          <Button block variant="primary" loading={saveState.starting} onClick={onStart}>
            {t('results.start')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Honest duration breakdown from real leg data: walking / waiting / transit.
 * Waiting is derived (total − walking − transit) so schedule and transfer
 * waits are explicit — a 4h journey reads as "mostly waiting", never as
 * "geographically extremely long".
 */
function DurationBreakdown({ option }) {
  const { t } = useI18n()
  const legs = option.legs ?? []
  const sumSec = (pred) => legs.filter(pred).reduce((sum, l) => sum + (Number(l.duration_sec) || 0), 0)
  const walkSec = sumSec((l) => l.type === 'walking')
  const transitSec = sumSec((l) => l.type !== 'walking')
  const totalSec = Number(option.total_duration_sec) || 0
  const waitSec = Math.max(0, totalSec - walkSec - transitSec)

  return (
    <div className="bestroute__breakdown" role="list" aria-label={t('results.breakdown')}>
      <span className="t-label">{t('results.breakdown')}</span>
      <span role="listitem">{t('results.metric_walking')} · {formatDuration(walkSec)}</span>
      <span role="listitem">{t('results.waiting')} · {formatDuration(waitSec)}</span>
      <span role="listitem">{t('results.transit')} · {formatDuration(transitSec)}</span>
      <span role="listitem">{t('results.metric_transfers')} · {option.total_transfers}</span>
    </div>
  )
}

/**
 * The single recommended journey. The planner exposes ONE confident answer —
 * never a comparison carousel — with the summary that matters (time, walking,
 * transfers, fare honesty, arrival) and one strong primary action.
 */
function BestRouteHero({ option, onStart, starting, saveState, onSave, onOpenDetails, onModifySearch }) {
  const { t } = useI18n()
  const legs = option.legs ?? []
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const reliabilityPct = option.reliability != null ? Math.round(option.reliability * 100) : null
  const modes = [...new Set(legs.filter((l) => l.type !== 'walking').map((l) => l.mode))]

  return (
    <Card className="bestroute" flat>
      <div className="bestroute__head">
        <span className="badge b-verified bestroute__badge">
          <Icon name="shield" size={13} aria-hidden="true" /> {t('results.best_title')}
        </span>
        <span className="t-caption">{t('results.recommended_for_you')}</span>
      </div>

      <div className="row-between" style={{ alignItems: 'flex-start', marginBlockStart: 8 }}>
        <b className="t-num bestroute__duration">{formatDuration(option.total_duration_sec)}</b>
        <span className={`badge ${option.total_transfers === 0 ? 'b-active' : 'b-rerouted'}`}>
          {option.total_transfers === 0
            ? t('results.direct')
            : option.total_transfers === 1
              ? t('results.one_transfer')
              : option.total_transfers === 2
                ? t('results.two_transfers')
                : t('results.transfers').replace('{count}', option.total_transfers)}
        </span>
      </div>
      <div className="row" style={{ gap: 10, marginBlockStart: 2 }}>
        <span className="t-num" style={{ fontSize: 13, color: 'var(--ink900)' }}>
          {formatTime(firstLeg?.departure_time)} → {formatTime(lastLeg?.arrival_time)}
        </span>
        {reliabilityPct != null && (
          <span className="t-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="shield" size={12} aria-hidden="true" style={{ color: reliabilityPct >= 70 ? 'var(--s800)' : 'var(--w800)' }} />
            {t('results.reliability').replace('{pct}', reliabilityPct)}
          </span>
        )}
      </div>

      <div style={{ marginBlockStart: 10 }}>
        <RouteStrip option={option} />
      </div>

      {/* 1D: Why Recommended Callout on the hero card */}
      <div style={{ marginBlock: '10px 4px', padding: '10px 12px', background: 'var(--p50, #f0f7fc)', borderRadius: 'var(--rad-sm)', border: '1px solid var(--p100, #cde4f7)' }}>
        <RecommendationReasons option={option} />
      </div>

      {/* Honest duration breakdown — schedule waits are explicit, so a long
          total never reads as a geographically enormous route. */}
      <DurationBreakdown option={option} />

      {/* Trip summary: the facts a rider decides with — honest labels kept. */}
      <div className="bestroute__summary">
        <span className="chip">
          <Icon name="modeWalking" size={13} aria-hidden="true" />
          {formatDistance(option.walk_distance_meters)} {t('results.metric_walking').toLowerCase()}
        </span>
        {option.fare && (
          <span className="chip">
            {option.fare.amount} {option.fare.currency}
            {option.fare.data_status === 'real' ? ' · ✓' : ' · ~'}
          </span>
        )}
        <span className="chip">
          <Icon name="clock" size={13} aria-hidden="true" />
          {t('results.arrive')} {formatTime(lastLeg?.arrival_time)}
        </span>
        {modes.map((m) => (
          <span key={m} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ModeDot mode={m} />
            {(() => {
              const key = MODE_LABEL_KEYS[m]
              const translated = key ? t(key) : m
              return translated === key ? m : translated
            })()}
          </span>
        ))}
      </div>
      {option.fare && <FareAttribution fare={option.fare} />}

      {option.disrupted && (
        <div className="alert alert--error" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }} role="status">
          <Icon name="detect" size={16} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600 }}>{t('results.alert_on_route')}</div>
            <div className="t-caption">
              {(option.alerts ?? []).map((a) => a.header_text).join(' · ') || 'Disruption reported.'}
            </div>
          </div>
        </div>
      )}

      <p className="t-caption bestroute__note">{t('results.best_note')}</p>

      {/* One strong primary action; everything else is secondary. */}
      <div className="bestroute__actions">
        <Button block size="lg" variant="primary" loading={starting} onClick={onStart}>
          <Icon name="navigate" size={17} aria-hidden="true" />
          {t('results.start')}
        </Button>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Button block variant="secondary" loading={saveState.saving} disabled={saveState.saved} onClick={onSave}>
            {saveState.saved
              ? <><Icon name="success" size={15} aria-hidden="true" /> {t('results.saved')}</>
              : t('results.save')}
          </Button>
          <Button block variant="ghost" onClick={onOpenDetails}>{t('results.view_details')}</Button>
        </div>
        <button type="button" className="bestroute__modify" onClick={onModifySearch}>
          <Icon name="search" size={14} aria-hidden="true" />
          {t('results.modify_search')}
        </button>
      </div>
    </Card>
  )
}

/**
 * Results page — ONE best recommended journey, map-integrated, with the
 * details drawer and save + start flows.
 */
export function JourneyResultsPage() {
  const { searchParams, searchResults, storeSaved, storeSearch } = useJourneyContext()
  const { t } = useI18n()
  const navigate = useNavigate()

  const options = Array.isArray(searchResults)
    ? searchResults
    : (Array.isArray(searchResults?.options) ? searchResults.options : [])

  // Single-recommendation contract: the ranked candidate list is internal;
  // the product exposes exactly the top-ranked plan as the primary journey.
  const best = options[0] ?? null

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedLegIndex, setSelectedLegIndex] = useState(null)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [savedJourneyId, setSavedJourneyId] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [startError, setStartError] = useState(null)

  // Growing to desktop closes a lingering mobile map sheet.
  useEffect(() => {
    if (!mobileMapOpen || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 900px)')
    const close = (e) => { if (e.matches) setMobileMapOpen(false) }
    mq.addEventListener('change', close)
    return () => mq.removeEventListener('change', close)
  }, [mobileMapOpen])

  // Nothing to show if the user navigated here directly without search parameters.
  useEffect(() => {
    if (!searchParams) {
      navigate('/search', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => {
    if (best) {
      trackEvent('best_route_viewed', {
        duration_seconds: best.duration,
        walking_meters: best.walking_distance,
        transfers: best.transfers,
        fare: best.fare,
        reliability: best.reliability,
      })
    }
  }, [best])

  const searchPayload = useMemo(() => (searchParams ? {
    origin_lat: searchParams.origin_lat,
    origin_lng: searchParams.origin_lng,
    destination_lat: searchParams.destination_lat,
    destination_lng: searchParams.destination_lng,
    requested_at: searchParams.requested_at,
    max_transfers: searchParams.max_transfers,
    max_walk_distance_per_leg: searchParams.max_walk_distance_per_leg,
    preferred_modes: searchParams.preferred_modes,
    avoided_modes: searchParams.avoided_modes,
    alternatives: searchParams.alternatives,
  } : null), [searchParams])

  const handleSave = useCallback(async () => {
    if (!best || !searchPayload || saving || savedJourneyId) return
    setSaving(true)
    setSaveError(null)
    try {
      // optionIndex 0 — the backend re-plans the same search deterministically
      // and persists the best (recommended) option.
      const saved = await saveJourney({ searchPayload, optionIndex: 0 })
      const journey = saved?.data ?? saved
      storeSaved(journey)
      setSavedJourneyId(journey?.id ?? journey?.journey?.id ?? true)
    } catch (error) {
      setSaveError(error.message || 'Could not save your journey.')
    } finally {
      setSaving(false)
    }
  }, [best, searchPayload, saving, savedJourneyId, storeSaved])

  // Start Journey: one confident action — persists the recommended route if
  // needed, activates it, and enters the live Journey Cockpit.
  const handleStart = useCallback(async () => {
    if (!best || !searchPayload || starting) return
    setStarting(true)
    setStartError(null)
    try {
      let journeyId = savedJourneyId
      if (!journeyId || journeyId === true) {
        const saved = await saveJourney({ searchPayload, optionIndex: 0 })
        const journey = saved?.data ?? saved
        storeSaved(journey)
        journeyId = journey?.id ?? journey?.journey?.id
        setSavedJourneyId(journeyId ?? true)
      }
      const active = await startSavedJourney(journeyId)
      navigate(`/active-journeys/${active?.id ?? active?.data?.id ?? ''}`)
    } catch (error) {
      setStartError(error.message || 'Could not start the journey.')
    } finally {
      setStarting(false)
    }
  }, [best, searchPayload, starting, savedJourneyId, storeSaved, navigate])

  if (!searchParams) return null

  const saveState = { saved: Boolean(savedJourneyId), saving, starting }

  // Memoized map inputs: fresh array identities every render would tear
  // down and rebuild all map layers on each parent render.
  const routeStops = useMemo(
    () => best?.legs?.flatMap((leg) =>
      [leg.from_stop, leg.to_stop].filter((s) => s && s.lat != null)
    ) ?? [],
    [best]
  )
  const endpointOrigin = searchParams ? { lat: searchParams.origin_lat, lng: searchParams.origin_lng } : null
  const endpointDestination = searchParams ? { lat: searchParams.destination_lat, lng: searchParams.destination_lng } : null

  // Stop-panel action (design v3 §10): store the selected stop as the
  // origin/destination in the real journey context, then return to the
  // planner — the same state bridge the search flow itself uses.
  const handleMapStopSelect = (selection) => {
    const target = selection.target === 'origin' ? 'origin' : 'destination'
    const stop = {
      id: selection.id,
      name: selection.name,
      latitude: selection.latitude ?? selection.lat,
      longitude: selection.longitude ?? selection.lng,
    }
    const next = {
      ...(searchParams ?? {}),
      originStop: target === 'origin' ? stop : (searchParams?.originStop ?? null),
      destinationStop: target === 'destination' ? stop : (searchParams?.destinationStop ?? null),
    }
    storeSearch(next)
    navigate('/search')
  }

  return (
    <>
      <div className="row-between page-head" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="topbar__back"
            onClick={() => navigate('/search')}
            aria-label={t('results.back_to_search')}
            style={{ position: 'static', margin: 0 }}
          >
            <Icon name="arrowLeft" size={18} aria-hidden="true" />
          </button>
          <div>
            <b style={{ fontSize: 17 }}>{t('results.best_title')}</b>
            {searchParams?.originStop?.name && searchParams?.destinationStop?.name && (
              <div className="t-caption">
                {searchParams.originStop.name} → {searchParams.destinationStop.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {saveError && (
        <Alert severity="error" title={t('error.save_failed')} style={{ marginBottom: 10 }}>
          {saveError}
        </Alert>
      )}
      {startError && (
        <Alert severity="error" title={t('error.start_failed')} style={{ marginBottom: 10 }}>
          {startError}
        </Alert>
      )}

      {!best ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="search" size={26} aria-hidden="true" />}
            tone="info"
            title={t('results.empty_title')}
            message={t('results.empty_body')}
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/search', { state: { fresh: true } })}>
                {t('results.adjust')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="results-split">
          {mobileMapOpen ? (
            <div className="results-sheet" role="dialog" aria-label="Route map">
              <div className="results-sheet__handle" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setMobileMapOpen(false)}>{t('results.close_map')}</Button>
              </div>
              <MapPanel
                itinerary={best}
                origin={endpointOrigin}
                destination={endpointDestination}
                currentLegIndex={selectedLegIndex}
                height="100%"
              />
            </div>
          ) : (
            <div className="results-split__map">
              <MapPanel
                itinerary={best}
                origin={endpointOrigin}
                destination={endpointDestination}
                stops={routeStops}
                currentLegIndex={selectedLegIndex}
                onSelectStop={handleMapStopSelect}
              />
            </div>
          )}

          <div className="results-split__list">
            <button
              type="button"
              className="chip on results-map-toggle"
              style={{ display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 10 }}
              onClick={() => setMobileMapOpen(true)}
            >
              <Icon name="plan" size={15} aria-hidden="true" />
              {t('results.view_map')}
            </button>

            <BestRouteHero
              option={best}
              onStart={handleStart}
              starting={starting}
              saveState={saveState}
              onSave={handleSave}
              onOpenDetails={() => setDetailsOpen(true)}
              onModifySearch={() => navigate('/search')}
            />
          </div>
        </div>
      )}

      {best && detailsOpen && (
        <JourneyDetails
          option={best}
          onClose={() => setDetailsOpen(false)}
          onSave={handleSave}
          onStart={handleStart}
          saveState={saveState}
          selectedLegIndex={selectedLegIndex}
          onSelectLeg={setSelectedLegIndex}
        />
      )}
    </>
  )
}
