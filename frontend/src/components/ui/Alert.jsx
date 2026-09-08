import { Icon } from './Icon'

const ICONS = { info: 'info', success: 'success', warning: 'warning', error: 'close' }

/**
 * Inline alert — approved design system §2.6.
 * severity: info | success | warning | error
 */
export function Alert({ severity = 'info', title, children, action }) {
  return (
    <div className={`alert alert--${severity}`} role={severity === 'error' ? 'alert' : 'status'}>
      <span className="alert__icon"><Icon name={ICONS[severity] ?? 'info'} size={16} aria-hidden="true" /></span>
      <div style={{ flex: 1 }}>
        {title && <div className="alert__title">{title}</div>}
        {children && <div className="alert__message">{children}</div>}
      </div>
      {action}
    </div>
  )
}
