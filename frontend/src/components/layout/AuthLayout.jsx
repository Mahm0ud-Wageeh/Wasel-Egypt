import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/LanguageContext'
import { LogoMark } from '../ui/Logo'
import { Icon } from '../ui/Icon'

/**
 * Auth shell — branded split layout.
 *
 * Mobile: slim gradient brand bar stacked over the form.
 * Desktop (≥1024px): full split — product panel beside a form card.
 * Page inner markup (`.auth-shell`, `.auth-brand__logo`) is untouched;
 * on desktop the in-form brand lockup is visually hidden via CSS while
 * staying in the DOM for tests and assistive tech.
 */
export function AuthLayout({ children }) {
  const { t } = useI18n()
  const points = [
    { icon: 'track', title: t('landing.feature_live'), body: t('landing.track_step') },
    { icon: 'community', title: t('landing.feature_reports'), body: t('landing.detect_step') },
    { icon: 'recover', title: t('landing.feature_recover'), body: t('landing.recover_step') },
  ]

  return (
    <div className="auth-page">
      <aside className="auth-side" aria-label={t('app.name')}>
        <Link
          to="/"
          className="auth-side__brand"
          style={{ color: '#fff', textDecoration: 'none' }}
          aria-label="Wasel Egypt home"
        >
          <LogoMark size={34} />
          <span>{t('app.name')}</span>
        </Link>
        <p className="auth-side__tagline">{t('landing.tagline')}</p>
        <ul className="auth-side__points">
          {points.map((p) => (
            <li key={p.title}>
              <span className="auth-side__point-icon" aria-hidden="true">
                <Icon name={p.icon} size={17} />
              </span>
              <div>
                <b>{p.title}</b>
                <span>{p.body}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  )
}
