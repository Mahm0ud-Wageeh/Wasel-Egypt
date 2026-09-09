import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/ui/Logo'
import { OriginDestinationFields, useJourneyPlanner } from '../components/journey/JourneyPlannerForm'
import { getData, apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Public landing — Wasel Egypt.
 *
 * The hero contains a REAL journey search: origin/destination pickers
 * with geolocation, executing the actual /journeys/search flow. Guests
 * get routed to log-in (protected endpoint); authenticated users land
 * directly in results. All figures come from live public API data;
 * sections that would need unavailable data render nothing.
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
  { icon: 'modeMetro', label: "landing.metro", note: "landing.metro_note", color: 'var(--mode-metro)' },
  { icon: 'modeBus', label: "landing.bus", note: "landing.bus_note", color: 'var(--mode-bus)' },
  { icon: 'modeMinibus', label: "landing.minibus", note: "landing.minibus_note", color: 'var(--mode-minibus)' },
  { icon: 'modeMicrobus', label: "landing.microbus", note: "landing.microbus_note", color: 'var(--mode-microbus)' },
  { icon: 'modeRail', label: "landing.rail", note: "landing.rail_note", color: 'var(--mode-rail)' },
  { icon: 'modeWalking', label: "landing.walking", note: "landing.walking_note", color: 'var(--mode-walking)' },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()

  const [alerts, setAlerts] = useState([])
  const [coverage, setCoverage] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const planner = useJourneyPlanner()

  useEffect(() => {
    let active = true

    getData(endpoints.public.activeServiceAlerts)
      .then((res) => {
        if (active) setAlerts(Array.isArray(res?.data) ? res.data : [])
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

    apiRequest(`${endpoints.public.stops}?per_page=1`)
      .then((res) => {
        const total = res?.meta?.total
        if (active && Number.isFinite(total)) {
          setCoverage((prev) => ({ ...prev, stops: total }))
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  // Execute the real search. Authenticated users run the protected
  // search API and land in results; guests store a validated draft and
  // continue on the pre-filled /search page after login.
  const startSearch = async (e) => {
    e?.preventDefault?.()
    if (isAuthenticated) {
      const result = await planner.submit()
      if (result) navigate('/journeys/results')
      return
    }
    const draft = planner.storeDraft()
    if (draft) navigate('/login', { state: { from: '/search' } })
  }

  const geoNotice = planner.geoStatus === 'denied'
    ? { tone: 'warning', text: t('landing.geo_status_denied') }
    : planner.geoStatus === 'timeout'
      ? { tone: 'warning', text: t('landing.geo_status_timeout'), retry: true }
      : planner.geoStatus === 'unavailable'
        ? { tone: 'info', text: t('landing.geo_status_unavailable') }
        : null

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* ---- Navbar ---- */}
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-nav__inner">
          <Link to="/" aria-label="Wasel Egypt home">
            <Logo size={30} subtitle="Egypt" />
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
            {isAuthenticated ? (
              <Link to="/home" style={{ textDecoration: 'none' }}>
                <Button size="sm">{t('nav.home')}</Button>
              </Link>
            ) : (
              <Link to="/register" className="site-nav__hide-sm" style={{ textDecoration: 'none' }}>
                <Button size="sm">{t('landing.get_started')}</Button>
              </Link>
            )}
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
            <>
              <Link to="/login" className="site-nav__link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                {t('auth.login')}
              </Link>
              <Link to="/register" className="site-nav__link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                {t('auth.register')}
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link to="/home" className="site-nav__link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              {t('nav.home')}
            </Link>
          )}
        </div>
      </nav>

      {/* ---- Hero: functional journey search ---- */}
      <header id="main-content" className="hero-redesign">
        <div className="hero-inner">
          <span className="eyebrow">{t('app.name')}</span>
          <h1>{t('landing.tagline')}</h1>
          <p className="hero-lede">{t('landing.lede')}</p>

          {/* Real planner — origin/destination/search, live from the API */}
          <form className="hero-planner" onSubmit={startSearch} role="search" aria-label="Journey planner">
            <OriginDestinationFields
              planner={planner}
              tone="hero"
            />

            {geoNotice && (
              <div className={`hero-planner__geo hero-planner__geo--${geoNotice.tone}`} role="status">
                <Icon name="warning" size={14} aria-hidden="true" />
                <span>{geoNotice.text}</span>
                {geoNotice.retry && (
                  <button type="button" className="chip" onClick={planner.currentLocationContext.locate}>
                    {t('landing.geo_retry')}
                  </button>
                )}
              </div>
            )}

            {planner.searchError && (
              <div className="hero-planner__geo hero-planner__geo--warning" role="status">
                <Icon name="warning" size={14} aria-hidden="true" />
                <span>{planner.searchError}</span>
              </div>
            )}

            {planner.submitError && (
              <div className="hero-planner__geo hero-planner__geo--warning" role="alert">
                <Icon name="warning" size={14} aria-hidden="true" />
                <span>{planner.submitError}</span>
              </div>
            )}

            <div className="hero-planner__actions">
              <button type="submit" className="hero-planner__submit" disabled={planner.submitting}>
                {planner.submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    {t('planner.searching')}
                  </>
                ) : (
                  <>
                    {t('landing.plan_cta')}
                    <Icon name="arrowRight" size={17} aria-hidden="true" />
                  </>
                )}
              </button>
              {!isAuthenticated && (
                <p className="hero-planner__hint">{t('landing.signin_prompt')}</p>
              )}
            </div>
          </form>

          <p className="hero-search-hint">
            <Icon name="search" size={13} aria-hidden="true" /> {t('landing.search_hint')}
          </p>

          <div className="row" style={{ marginTop: 'var(--sp-5)', flexWrap: 'wrap' }}>
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
          <p className="section-lede"> {t('landing.modes_lede')} </p>
        </div>
        <div className="mode-grid">
          {MODES.map((mode) => (
            <div key={mode.label} className="mode-card">
              <span className="mode-card__dot" style={{ background: mode.color }} aria-hidden="true" />
              <span aria-hidden="true" style={{ color: mode.color, display: 'inline-flex' }}>
                <Icon name={mode.icon} size={19} />
              </span>
              <div>
                <b>{t(mode.label)}</b>
                <span>{t(mode.note)}</span>
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
          <p className="section-lede"> {t('landing.trust_lede')} </p>
        </div>
        <div className="feature-grid feature-grid--two">
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--s50)', color: 'var(--s700)' }}>
              <Icon name="shield" size={21} />
            </span>
            <h3 className="feature-card__title">{t('landing.moderated_title')}</h3>
            <p className="feature-card__body"> {t('landing.moderated_body')} </p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon" aria-hidden="true" style={{ background: 'var(--a100)', color: 'var(--a600)' }}>
              <Icon name="community" size={21} />
            </span>
            <h3 className="feature-card__title">{t('landing.trust_compounds')}</h3>
            <p className="feature-card__body"> {t('landing.trust_compounds_body')} </p>
          </article>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="section section--tight">
        <Card className="cta-band" style={{ padding: 'var(--sp-8) var(--sp-5)', textAlign: 'center' }}>
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
              <Logo size={28} subtitle="Egypt" />
              <p className="site-footer__tagline">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.product')}</h3>
              <ul className="site-footer__links">
                <li><Link to="/home">{t('footer.explore')}</Link></li>
                <li><Link to="/search">{t('footer.plan')}</Link></li>
                <li><Link to="/reports">{t('reports.title')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.account')}</h3>
              <ul className="site-footer__links">
                <li><Link to="/register">{t('auth.register')}</Link></li>
                <li><Link to="/login">{t('auth.login')}</Link></li>
                <li><Link to="/profile">{t('nav.profile')}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="site-footer__col-title">{t('footer.data')}</h3>
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
