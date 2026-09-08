const STATUS_TONES = {
  // community report statuses
  pending: 'pending',
  verified: 'verified',
  rejected: 'rejected',
  resolved: 'resolved',
  // active journey statuses
  active: 'active',
  deviated: 'deviated',
  rerouted: 'rerouted',
  completed: 'completed',
  cancelled: 'cancelled',
  // deviation severity
  low: 'low',
  medium: 'medium',
  high: 'high',
  // notification priority
  normal: 'normal',
  urgent: 'urgent',
  // user status
  inactive: 'cancelled',
  suspended: 'cancelled',
}

/**
 * Status/priority/severity badge — approved design system §2.1 status colors.
 * Falls back to a neutral tone for unknown values.
 */
export function Badge({ value, label, tone }) {
  const resolved = tone ?? STATUS_TONES[value] ?? 'neutral'
  return <span className={`badge badge--${resolved}`}>{label ?? value}</span>
}

const MODE_COLORS = {
  metro: 'var(--mode-metro)',
  rail: 'var(--mode-rail)',
  bus: 'var(--mode-bus)',
  minibus: 'var(--mode-minibus)',
  microbus: 'var(--mode-microbus)',
  walking: 'var(--mode-walking)',
}

/** Colored dot representing a transit mode (map/leg visual language). */
export function ModeDot({ mode }) {
  return (
    <span
      className="mode-dot"
      style={{ background: MODE_COLORS[mode] ?? 'var(--ink500)' }}
      aria-label={mode}
      title={mode}
    />
  )
}

/** Chip with a mode dot; `on` marks selected state; `onToggle` makes it clickable. */
export function ModeChip({ mode, on = false, onToggle, children }) {
  const classes = `mode-chip${on ? ' is-on' : ''}`
  const content = (
    <>
      <ModeDot mode={mode} />
      {children ?? mode}
    </>
  )
  if (typeof onToggle === 'function') {
    return (
      <button type="button" className={classes} onClick={() => onToggle(mode)} aria-pressed={on}>
        {content}
      </button>
    )
  }
  return <span className={classes}>{content}</span>
}
