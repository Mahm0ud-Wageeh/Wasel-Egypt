import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/LanguageContext'
import { Icon } from '../ui/Icon'
import { OriginDestinationFields, useJourneyPlanner } from './JourneyPlannerForm'

/**
 * PlannerCard — the single functional journey-search card used by the
 * landing hero and the Home dashboard (same hook, same APIs, same
 * states; only the surface styling differs via `variant`).
 *
 * Behavior: validates origin/destination, runs the real search for
 * authenticated users (→ /journeys/results); guests store a validated
 * draft and continue on the pre-filled /search page after login.
 * Geolocation states render inline with retry; search/submit errors
 * render inline with roles for AT.
 */
export function PlannerCard({
  variant = 'hero',
  submitLabelKey = 'landing.plan_cta',
  showSigninHint = true,
  showSearchHint = true,
  planner: externalPlanner = null,
}) {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const ownedPlanner = useJourneyPlanner()
  // Pages that need live planner state (e.g. Home's map preview) pass
  // their own hook instance; otherwise the card owns one.
  const planner = externalPlanner ?? ownedPlanner

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

  const formClass = variant === 'hero' ? 'hero-planner' : 'planner-card'
  const geoClass = variant === 'hero' ? 'hero-planner__geo' : 'planner-card__notice'
  const actionsClass = variant === 'hero' ? 'hero-planner__actions' : 'planner-card__actions'
  const submitClass = variant === 'hero' ? 'hero-planner__submit' : 'planner-card__submit'
  const hintClass = variant === 'hero' ? 'hero-planner__hint' : 'planner-card__hint'

  return (
    <form className={formClass} onSubmit={startSearch} role="search" aria-label="Journey planner">
      <OriginDestinationFields
        planner={planner}
        tone={variant === 'hero' ? 'hero' : 'default'}
      />

      {geoNotice && (
        <div className={`${geoClass} ${geoClass}--${geoNotice.tone}`} role="status">
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
        <div className={`${geoClass} ${geoClass}--warning`} role="status">
          <Icon name="warning" size={14} aria-hidden="true" />
          <span>{planner.searchError}</span>
        </div>
      )}

      {planner.submitError && (
        <div className={`${geoClass} ${geoClass}--warning`} role="alert">
          <Icon name="warning" size={14} aria-hidden="true" />
          <span>{planner.submitError}</span>
        </div>
      )}

      <div className={actionsClass}>
        <button type="submit" className={submitClass} disabled={planner.submitting}>
          {planner.submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {t('planner.searching')}
            </>
          ) : (
            <>
              {t(submitLabelKey)}
              <Icon name="arrowRight" size={17} aria-hidden="true" />
            </>
          )}
        </button>
        {showSigninHint && !isAuthenticated && (
          <p className={hintClass}>{t('landing.signin_prompt')}</p>
        )}
      </div>

      {showSearchHint && variant === 'hero' && (
        <p className="hero-search-hint">
          <Icon name="search" size={13} aria-hidden="true" /> {t('landing.search_hint')}
        </p>
      )}
    </form>
  )
}
