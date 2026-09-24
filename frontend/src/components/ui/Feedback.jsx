/** Layout-preserving loading placeholder. */
export function Skeleton({ height = 72, width, style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />
}

/** Inline circular spinner (buttons use their own integrated spinner). */
export function Spinner({ inline = false }) {
  return (
    <span
      className={inline ? 'spinner spinner--inline' : 'spinner'}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Empty / error / info state block — approved design system state matrix.
 * tone: info | error | success
 */
export function StateBlock({ tone = 'info', icon, title, message, action }) {
  return (
    <div className="state-block">
      <div className={`state-block__icon state-block__icon--${tone}`}>{icon}</div>
      <div className="state-block__title">{title}</div>
      {message && <div className="state-block__message">{message}</div>}
      {action}
    </div>
  )
}
