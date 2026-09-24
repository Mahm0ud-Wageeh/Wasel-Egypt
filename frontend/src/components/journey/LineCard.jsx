import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/LanguageContext'
import { Icon } from '../ui/Icon'

/**
 * Premium transit-line card (Home metro network).
 *
 * Communicates line identity from REAL backend data: GTFS route color
 * (mode-color fallback), short name, terminal pair, stop count, operator,
 * a schematic stop rail, and a deep link to the existing RouteDetail page.
 */
export function LineCard({ line, index = 0 }) {
  const { t } = useI18n()
  const color = line.color && /^#?[0-9a-fA-F]{6}$/.test(line.color)
    ? (line.color.startsWith('#') ? line.color : `#${line.color}`)
    : 'var(--mode-metro)'

  // Schematic rail: capped dot row, terminals emphasized.
  const railDots = Math.max(3, Math.min(14, line.stopCount || 3))

  return (
    <article
      className="line-card anim-rise"
      style={{ ['--d']: `${Math.min(index, 5) * 60}ms`, borderInlineStart: `4px solid ${color}` }}
    >
      <div className="line-card__top">
        <span className="line-card__badge" style={{ background: color }} aria-hidden="true">
          <Icon name="modeMetro" size={18} />
        </span>
        <div className="grow">
          <h3 className="line-card__name">{line.line}</h3>
          <p className="line-card__terminals">
            {line.from}
            <Icon name="arrowRight" size={13} aria-hidden="true" className="line-card__arrow" />
            {line.to}
          </p>
        </div>
      </div>

      <div className="line-card__rail" aria-hidden="true">
        {Array.from({ length: railDots }).map((_, i) => (
          <span
            key={i}
            className={`line-card__stop${i === 0 || i === railDots - 1 ? ' is-terminal' : ''}`}
            style={{ background: i === 0 || i === railDots - 1 ? color : undefined }}
          />
        ))}
      </div>

      <div className="line-card__meta">
        <span className="t-caption">
          <b className="t-num">{line.stopCount}</b> {t('home.metro_stops')}
        </span>
        {line.operator && (
          <span className="t-caption line-card__operator">{line.operator}</span>
        )}
        <span className="spacer" />
        <Link to={`/routes/${line.id}`} className="line-card__cta">
          {t('home.view_line')}
          <Icon name="arrowRight" size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
