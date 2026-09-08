import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { getData, apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Public landing — Wasel Egypt.
 *
 * Design: docs/frontend/REDESIGN_DECISION.md (editorial sections, SVG
 * iconography, planner CTA pattern adopted from 21st.dev #19080 and
 * rebuilt in Wasel token CSS). All figures come from live public API
 * data; sections that would need unavailable data render nothing.
 */
const NAV_LINKS = [
  { href: '#how-it-works', key: 'landing.nav_how' },
  { href: '#modes', key: 'landing.nav_modes' },
  { href: '#trust', key: 'landing.nav_trust' },
]

const STEPS = [
  { icon: 'plan', titleKey: 'landing.plan_step', bodyKey: 'landing.plan_body' },
  { icon: 'track', titleKey: 'landing.track_step', bodyKey: 'landing.track_body' },
  { icon: 'detect', titleKey: 'landing.detect_step', bodyKey: 'landing.detect_body' },
  { icon: 'recover', titleKey: 'landing.recover_step', bodyKey: 'landing.recover_body' },
]

const MODES = [
  { icon: 'modeMetro', label: 'Metro', note: 'Lines 1–3', color: 'var(--mode-metro)' },
  { icon: 'modeBus', label: 'Bus', note: 'CTA + private', color: 'var(--mode-bus)' },
  { icon: 'modeMinibus', label: 'Minibus', note: 'Licensed lines', color: 'var(--mode-minibus)' },
  { icon: 'modeMicrobus', label: 'Microbus', note: 'Paratransit', color: 'var(--mode-microbus)' },
  { icon: 'modeRail', label: 'Rail', note: 'National rail', color: 'var(--mode-rail)' },
  { icon: 'modeWalking', label: 'Walking', note: 'Door to door', color: 'var(--mode-walking)' },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()

  const [alerts, setAlerts] = useState([])
  const [coverage, setCoverage] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true

    getData(endpoints.public.activeServiceAlerts)
      .then((res) => {
        if (active) setAlerts(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => {})

    apiRequest(`${endpoints.public.stops}?per_page=1`)
      .then((res) => {
        const total = res?.meta?.total
        if (active && Number.isFinite(total)) {
          setCoverage((prev) => ({ ...prev, stops: total }))
        }
      })
      .catch(() => {})

    apiRequest(`${endpoints.public.routes}?per_page=1`)
      .then((res) => {
        const total = res?.meta?.total
        if (active && Number.isFinite(total)) {
          setCoverage((prev) => ({ ...prev, routes: total }))
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const goSearch = () => navigate('/search')

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* ---- Navbar ---- */}
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-nav__inner">
          <Link to="/" className="site-nav__brand" aria-label="Wasel Egypt home">
            <span className="site-nav__brand-icon" aria-hidden="true">
              <Icon name="navigate" size={17} />
            </span>
            Wasel
          </Link>

          <div className="site-nav__links">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="site-nav__link">
                {t(l.key)}
              </a>
            ))}
          </div>

          <div className="site-nav__actions">
            <button
              type="button"
              className="chip"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={`Switch language to ${language === 'en' ? 'Arabic' : 'English'}`}
            >
              <Icon name="language" size={15} aria-hidden="true" />
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            {!isAuthenticated && (
              <Link to="/login" className="site-nav__hide-sm" style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="secondary">{t('auth.login')}</Button>
              </Link>
            )}
            <Link to="/search" style={{ textDecoration: 'none' }}>
              <Button size="sm">Plan a journey</Button>
            </Link>
            <button
              type="button"
              className="site-nav__toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        <div id="mobile-menu" className="site-nav__drawer" hidden={!menuOpen}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="site-nav__link" onClick={() => setMenuOpen(false)}>
              {t(l.key)}
            </a>
          ))}
          {!isAuthenticated && (
            <Link to="/login" className="site-nav__link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              {t('auth.login')}
            </Link>
          )}
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <header id="main-content" className="hero-redesign">
        <div className="hero-inner">
          <span className="eyebrow">Wasel Egypt</span>
          <h1>{t('landing.tagline')}</h1>
          <p className="hero-lede">{t('landing.lede')}</p>

          {/* Journey planner CTA — deep-links into the existing search flow */}
          <div className="planner-cta" role="search" aria-label="Journey planner">
            <div className="planner-cta__fields">
              <div className="planner-cta__field">
                <Icon name="pin" size={17} aria-hidden="true" />
                <div>
                  <b>{t('landing.from')}</b>
                  <span style={{ display: 'block' }}>{t('landing.from_hint')}</span>
                </div>
              </div>
              <div className="planner-cta__field">
                <Icon name="navigate" size={17} aria-hidden="true" />
                <div>
                  <b>{t('landing.to')}</b>
                  <span style={{ display: 'block' }}>{t('landing.to_hint')}</span>
                </div>
              </div>
            </div>
            <button type="button" className="planner-cta__submit" onClick={goSearch}>
              {t('landing.plan_cta')}
              <Icon name="arrowRight" size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="row" style={{ marginTop: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {[
              { icon: 'track', label: t('landing.feature_live') },
              { icon: 'community', label: t('landing.feature_reports') },
              { icon: 'recover', label: t('landing.feature_recover') },
            ].map((f) => (
              <span key={f.label} className="badge" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
                <Icon name={f.icon} size={14} aria-hidden="true" />
                {f.label}
              </span>
            ))}
          </div>

          {coverage && (coverage.stops || coverage.routes) && (
            <div className="hero-stats">
              {coverage.stops != null && (
                <div>
                  <div className="hero-stats__num">{coverage.stops.toLocaleString()}</div>
                  <div className="hero-stats__label">{t('landing.stats_stops')}</div>
                </div>
              )}
              {coverage.routes != null && (
                <div>
                  <div className="hero-stats__num">{coverage.routes.toLocaleString()}</div>
                  <div className="hero-stats__label">{t('landing.stats_routes')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ---- Live service alerts (real data only) ---- */}
      {alerts.length > 0 && (
        <div className="section section--tight">
          <div className="section-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h2 className="section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="detect" size={20} aria-hidden="true" style={{ color: 'var(--w700)' }} />
              {t('landing.alerts_title')}
            </h2>
            <span className="t-caption">{alerts.length} {t('landing.alerts_count')}</span>
          </div>
          <div className="stack-sm">
            {alerts.slice(0, 2).map((alert) => (
              <Alert key={alert.id} severity="warning" title={alert.header_text}>
                {alert.description_text}
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* ---- How Wasel works ---- */}
      <section id="how-it-works" className="section" aria-labelledby="how-title">
        <div className="section-head">
          <span className="eyebrow">{t('landing.nav_how')}</span>
          <h2 id="how-title" className="section-title">{t('landing.how_title')}</h2>
          <p className="section-lede">{t('landing.how_lede')}</p>
        </div>
        <div className="feature-grid">
          {STEPS.map((step) => (
            <article key={step.icon} className="feature-card">
              <span className="feature-card__icon" aria-hidden="true">
                <Icon name={step.icon} size={21} />
              </span>
              <h3 className="feature-card__title">{t(step.titleKey)}</h3>
              <p className="feature-card__body">{t(step.bodyKey)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---- Transport modes ---- */}
      <section id="modes" className="section" aria-labelledby="modes-title">
        <div className="section-head">
          <span className="eyebrow">{t('landing.nav_modes')}</span>
          <h2 id="modes-title" className="section-title">{t('landing.modes_title')}</h2>
          <p className="section-lede">
            From the metro to the microbus — Wasel plans across the network
            Cairenes actually ride.
          </p>
        </div>
        <div className="mode-grid">
          {MODES.map((mode) => (
            <div key={mode.label} className="mode-card">
              <span className="mode-card__dot" style={{ background: mode.color }} aria-hidden="true" />
              <span aria-hidden="true" style={{ color: mode.color, display: 'inline-flex' }}>
                <Icon name={mode.icon} size={19} />
              </span>
              <div>
                <b>{mode.label}</b>
                <span>{mode.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Community trust ---- */}
      <section id="trust" className="section" aria-labelledby="trust-title">
        <div className="section-head">
          <span className="eyebrow">{t('landing.nav_trust')}</span>
          <h2 id="trust-title" className="section-title">{t('landing.trust_title')}</h2>
          <p className="section-lede">
            Moderated rider reports keep the network honest — and trust grows
            with every verified report.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--s50)', color: 'var(--s700)' }}>
              <Icon name="shield" size={21} />
            </span>
            <h3 className="feature-card__title">Moderated reports</h3>
            <p className="feature-card__body">
              Riders report delays, overcrowding and disruptions at specific
              stops. Moderators verify each report before it influences what
              other passengers see.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--a100)', color: 'var(--a600)' }}>
              <Icon name="community" size={21} />
            </span>
            <h3 className="feature-card__title">Trust that compounds</h3>
            <p className="feature-card__body">
              Verified reporters build trust over time. Their signal weighs
              more — so the information you rely on gets better every day.
            </p>
          </article>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="section section--tight">
        <Card style={{ padding: 'var(--sp-8) var(--sp-5)', textAlign: 'center' }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>{t('landing.cta_title')}</h2>
          <p className="t-caption" style={{ marginBottom: 16, fontSize: 13.5 }}>
            {t('landing.cta_body')}
          </p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button size="lg">{t('landing.get_started')}</Button>
            </Link>
            <Link to="/home" style={{ textDecoration: 'none' }}>
              <Button size="lg" variant="secondary">{t('landing.explore')}</Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* ---- Footer ---- */}
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer__inner">
          <div className="site-footer__grid">
            <div>
              <div className="site-footer__brand">
                <span className="site-nav__brand-icon" aria-hidden="true">
                  <Icon name="navigate" size={17} />
                </span>
                Wasel Egypt
              </div>
              <p className="site-footer__tagline">
                Smarter public transit for Greater Cairo — plan, track, and
                recover on every journey.
              </p>
            </div>

            <div>
              <h3 className="site-footer__col-title">Product</h3>
              <ul className="site-footer__links">
                <li><Link to="/home">Explore</Link></li>
                <li><Link to="/search">Plan a journey</Link></li>
                <li><Link to="/reports">Community reports</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">Account</h3>
              <ul className="site-footer__links">
                <li><Link to="/register">Create account</Link></li>
                <li><Link to="/login">Log in</Link></li>
                <li><Link to="/profile">Profile</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">Data &amp; attribution</h3>
              <ul className="site-footer__links">
                <li>
                  <Icon name="external" size={13} aria-hidden="true" />
                  <a href="https://mobilitydatabase.org/feeds/gtfs/mdb-3355" target="_blank" rel="noreferrer">
                    Transit data © Transport for Cairo (CC-BY-NC-SA)
                  </a>
                </li>
                <li>
                  <Icon name="external" size={13} aria-hidden="true" />
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                    Map data © OpenStreetMap contributors
                  </a>
                </li>
                <li>
                  <Icon name="info" size={13} aria-hidden="true" />
                  <span>Metro times derived from published operating patterns</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="site-footer__legal">
            <span>© {new Date().getFullYear()} Wasel Egypt — a graduation project.</span>
            <button
              type="button"
              className="chip"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={`Switch language to ${language === 'en' ? 'Arabic' : 'English'}`}
            >
              <Icon name="language" size={15} aria-hidden="true" />
              {language === 'en' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
