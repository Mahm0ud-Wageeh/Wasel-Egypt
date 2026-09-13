import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import { searchPublicStops } from '../api/journeys'

/**
 * Public fares page — the honest fare information surface.
 *
 * Shows every published fare with its provenance: official TfC metro
 * tiers (imported from the verified matrix) vs demo/estimated rows that
 * administrators can edit. Includes an exact station-to-station pricing
 * tool answered by the same matrix the journey planner uses, so the
 * number here and the number on a planned journey can never disagree.
 */
export default function Fares() {
  const { t, isRtl, language } = useI18n()

  const [fares, setFares] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modeFilter, setModeFilter] = useState('all')

  // Station-to-station pricing tool state
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [fromOptions, setFromOptions] = useState([])
  const [toOptions, setToOptions] = useState([])
  const [fromStop, setFromStop] = useState(null)
  const [toStop, setToStop] = useState(null)
  const [pricing, setPricing] = useState(false)
  const [pairResult, setPairResult] = useState(null) // {available, amount} | null

  useEffect(() => {
    let active = true
    apiRequest(endpoints.public.fares, { auth: false })
      .then((res) => {
        if (active) setFares(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => active && setLoadError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Exact matches read best (typing "Giza" should surface the Giza stop
  // before "...in Giza" bus stops); shortest name breaks ties — mirrors
  // how the AI provider resolves stop names.
  const rankStops = (stops, query) => {
    const q = query.trim().toLowerCase()
    return [...(stops ?? [])]
      .sort((a, b) => {
        const aExact = (a.name ?? '').toLowerCase() === q ? 0 : 1
        const bExact = (b.name ?? '').toLowerCase() === q ? 0 : 1
        if (aExact !== bExact) return aExact - bExact
        return (a.name ?? '').length - (b.name ?? '').length
      })
      .slice(0, 6)
  }

  // Debounced station autocomplete (public stop search endpoint).
  useEffect(() => {
    if (fromQuery.trim().length < 2) {
      setFromOptions([])
      return undefined
    }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const stops = await searchPublicStops(fromQuery.trim())
        if (active) setFromOptions(rankStops(stops, fromQuery))
      } catch {
        if (active) setFromOptions([])
      }
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fromQuery])

  useEffect(() => {
    if (toQuery.trim().length < 2) {
      setToOptions([])
      return undefined
    }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const stops = await searchPublicStops(toQuery.trim())
        if (active) setToOptions(rankStops(stops, toQuery))
      } catch {
        if (active) setToOptions([])
      }
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [toQuery])

  const pricePair = async () => {
    if (!fromStop || !toStop || fromStop.id === toStop.id) return
    setPricing(true)
    setPairResult(null)
    try {
      const res = await apiRequest(
        endpoints.public.fareEstimate(fromStop.id, toStop.id),
        { auth: false },
      )
      setPairResult({
        available: Boolean(res?.meta?.available),
        amount: res?.data?.amount ?? null,
      })
    } catch {
      setPairResult({ available: false, amount: null })
    } finally {
      setPricing(false)
    }
  }

  const modes = useMemo(() => {
    const seen = new Map()
    fares.forEach((f) => {
      const name = f.transit_mode?.name
      if (name && !seen.has(name)) seen.set(name, { name, icon: f.transit_mode?.icon })
    })
    return [...seen.values()]
  }, [fares])

  const filtered = useMemo(
    () => (modeFilter === 'all' ? fares : fares.filter((f) => f.transit_mode?.name === modeFilter)),
    [fares, modeFilter],
  )

  const pickStop = (setter, setQuery) => (stop) => {
    setter(stop)
    setQuery(stop.name ?? '')
  }

  return (
    <div className="fares-page">
      <header className="fares-page__head">
        <div>
          <h1 className="fares-page__title">
            <Icon name="wallet" size={22} aria-hidden="true" style={{ color: 'var(--p600)', verticalAlign: '-3px' }} />{' '}
            {t('fares.title')}
          </h1>
          <p className="fares-page__subtitle">{t('fares.subtitle')}</p>
        </div>
        <Link to="/home" className="btn btn--secondary btn--sm">{t('route.back_network')}</Link>
      </header>

      {/* Provenance legend — the honesty contract made visible */}
      <section className="fares-legend" aria-label={t('fares.legend_title')}>
        <div className="fares-legend__item fares-legend__item--real">
          <Icon name="badgeCheck" size={15} aria-hidden="true" />
          <div>
            <strong>{t('fares.real_badge')}</strong>
            <span>{t('fares.legend_real')}</span>
          </div>
        </div>
        <div className="fares-legend__item fares-legend__item--demo">
          <Icon name="flaskConical" size={15} aria-hidden="true" />
          <div>
            <strong>{t('fares.demo_badge')}</strong>
            <span>{t('fares.legend_demo')}</span>
          </div>
        </div>
      </section>

      {/* Station-to-station pricing from the official TfC matrix */}
      <section className="fares-pair card" aria-label={t('fares.pair_title')}>
        <h2 className="fares-pair__title">{t('fares.pair_title')}</h2>
        <p className="t-caption">{t('fares.pair_hint')}</p>
        <div className="fares-pair__grid">
          <div className="fares-pair__field">
            <label htmlFor="fare-from">{t('fares.pair_from')}</label>
            <input
              id="fare-from"
              type="text"
              value={fromQuery}
              onChange={(e) => {
                setFromQuery(e.target.value)
                setFromStop(null)
              }}
              placeholder={language === 'ar' ? 'مثال: التحرير' : 'e.g. Tahrir'}
              autoComplete="off"
            />
            {fromOptions.length > 0 && !fromStop && (
              <ul className="fares-pair__options">
                {fromOptions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-label={`Pick ${s.name} as origin`}
                      onClick={() => pickStop(setFromStop, setFromQuery)(s)}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="fares-pair__field">
            <label htmlFor="fare-to">{t('fares.pair_to')}</label>
            <input
              id="fare-to"
              type="text"
              value={toQuery}
              onChange={(e) => {
                setToQuery(e.target.value)
                setToStop(null)
              }}
              placeholder={language === 'ar' ? 'مثال: الجيزة' : 'e.g. Giza'}
              autoComplete="off"
            />
            {toOptions.length > 0 && !toStop && (
              <ul className="fares-pair__options">
                {toOptions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-label={`Pick ${s.name} as destination`}
                      onClick={() => pickStop(setToStop, setToQuery)(s)}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={pricePair}
            disabled={!fromStop || !toStop || fromStop?.id === toStop?.id || pricing}
          >
            {pricing ? t('planner.searching') : t('fares.pair_price')}
          </button>
        </div>
        {pairResult && (
          <div className={`fares-pair__result${pairResult.available ? '' : ' is-unavailable'}`} role="status">
            {pairResult.available ? (
              <>
                <Icon name="badgeCheck" size={16} aria-hidden="true" />
                <strong>
                  {t('fares.pair_result').replace(
                    '{amount}',
                    Number(pairResult.amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                  )}
                </strong>
                <span className="t-caption">{t('fares.real_note')}</span>
              </>
            ) : (
              <>
                <Icon name="info" size={16} aria-hidden="true" />
                <strong>{t('fares.pair_unavailable')}</strong>
                <span className="t-caption">{t('fares.pair_unavailable_hint')}</span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Published fares by mode */}
      <section className="fares-list" aria-label={t('fares.title')}>
        <div className="fares-list__filter">
          <button
            type="button"
            className={`chip${modeFilter === 'all' ? ' chip--active' : ''}`}
            onClick={() => setModeFilter('all')}
          >
            {t('fares.mode_all')}
          </button>
          {modes.map((m) => (
            <button
              key={m.name}
              type="button"
              className={`chip${modeFilter === m.name ? ' chip--active' : ''}`}
              onClick={() => setModeFilter(m.name)}
            >
              {m.name}
            </button>
          ))}
        </div>

        {loading && <div className="skeleton skeleton--card" aria-label={t('map.loading')} />}

        {loadError && (
          <div className="empty-state">
            <Icon name="warning" size={20} aria-hidden="true" />
            <p>{t('error.network')}</p>
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="empty-state">
            <Icon name="wallet" size={20} aria-hidden="true" />
            <p>{t('fares.empty_title')}</p>
            <span className="t-caption">{t('fares.empty_body')}</span>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="fares-table" role="table" aria-label={t('fares.title')}>
            <div className="fares-table__head" role="row">
              <span role="columnheader">{t('admin.fare_label')}</span>
              <span role="columnheader">{t('admin.fare_amount')}</span>
              <span role="columnheader">{t('fares.effective')}</span>
              <span role="columnheader">{t('fares.source')}</span>
            </div>
            {filtered.map((fare) => (
              <div className="fares-table__row" role="row" key={fare.id}>
                <span role="cell" className="fares-table__label">
                  <span className="fares-table__name">{fare.label}</span>
                  {fare.transit_operator?.name && (
                    <span className="t-caption">{t('fares.operator')}: {fare.transit_operator.name}</span>
                  )}
                </span>
                <span role="cell" className="fares-table__amount">
                  <strong>{Number(fare.amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</strong>
                  <span className="t-caption"> {fare.currency ?? 'EGP'}</span>
                </span>
                <span role="cell" className="t-caption">
                  {fare.effective_from ? String(fare.effective_from).slice(0, 10) : '—'}
                </span>
                <span role="cell">
                  {fare.data_status === 'real' ? (
                    <span className="fare-badge fare-badge--real" title={t('fares.real_note')}>
                      <Icon name="badgeCheck" size={12} aria-hidden="true" /> {t('fares.real_badge')}
                    </span>
                  ) : (
                    <span className="fare-badge fare-badge--demo" title={t('fares.demo_note')}>
                      <Icon name="flaskConical" size={12} aria-hidden="true" /> {t('fares.demo_badge')}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
