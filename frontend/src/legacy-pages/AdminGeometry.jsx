import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Admin route-geometry console — browse stored variant polylines, inspect
 * provenance (length, points, first/last coordinates), and edit the point
 * list through the governed route-geometry apiResource (server-side
 * transit-data-edit permission). Coordinate validation happens client-side
 * (lat/lng ranges) and is re-validated server-side.
 *
 * The editor PUTs the full polyline as geometry=[[lat,lng],...] and the
 * backend recomputes the stored length — provenance stays truthful after
 * manual edits.
 */

const LAT_RE = /^-?([0-8]?\d|90)(\.\d+)?$/
const LNG_RE = /^-?((1[0-7]\d|[0-9]?\d)(\.\d+)?|180(\.0+)?)$/

const parseGeometry = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '[]') } catch { return [] }
  }
  return []
}

export default function AdminGeometry() {
  const { t } = useI18n()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [page, setPage] = useState(1)
  const [variantFilter, setVariantFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(null)
  const [draftPoints, setDraftPoints] = useState([])
  const [pointError, setPointError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20', sort_by: 'id', sort_order: 'asc' })
      if (variantFilter.trim()) params.set('route_variant_id', variantFilter.trim())
      const res = await apiRequest(`${endpoints.adminTransit.routeGeometry}?${params.toString()}`)
      setRows(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      setMeta({
        total: res?.meta?.total ?? 0,
        current_page: res?.meta?.current_page ?? 1,
        last_page: res?.meta?.last_page ?? 1,
      })
    } catch {
      setError(t('admin.geo_load_error'))
    } finally {
      setLoading(false)
    }
  }, [page, variantFilter, t])

  useEffect(() => {
    load()
  }, [load])

  const openEditor = (row) => {
    const geometry = parseGeometry(row.geometry)
    setEditing({ id: row.id, route_variant_id: row.route_variant_id, length_meters: row.length_meters })
    setDraftPoints(geometry.map(([lat, lng]) => ({ lat: String(lat), lng: String(lng) })))
    setPointError(null)
  }

  const addPoint = () => {
    const last = draftPoints[draftPoints.length - 1]
    setDraftPoints((pts) => [...pts, { lat: last?.lat ?? '', lng: last?.lng ?? '' }])
  }

  const updatePoint = (index, field, value) => {
    setDraftPoints((pts) => pts.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const removePoint = (index) => {
    setDraftPoints((pts) => pts.filter((_, i) => i !== index))
  }

  const validatePoints = () => {
    if (draftPoints.length < 2) return t('admin.geo_min_points')
    for (const [i, p] of draftPoints.entries()) {
      if (!LAT_RE.test(p.lat) || !LNG_RE.test(p.lng)) {
        return `${t('admin.geo_invalid_coord')} (#${i + 1})`
      }
    }
    return null
  }

  const saveGeometry = async () => {
    const invalid = validatePoints()
    if (invalid) {
      setPointError(invalid)
      return
    }
    setSaving(true)
    setPointError(null)
    try {
      const geometry = draftPoints.map((p) => [Number(p.lat), Number(p.lng)])
      await apiRequest(endpoints.adminTransit.routeGeometryItem(editing.id), {
        method: 'PUT',
        body: {
          route_variant_id: editing.route_variant_id,
          geometry,
        },
      })
      showToast(t('admin.geo_saved'))
      setEditing(null)
      load()
    } catch (err) {
      const detail = err?.errors ? Object.values(err.errors).flat().join(' ') : err?.message
      setPointError(detail || t('admin.geo_save_error'))
    } finally {
      setSaving(false)
    }
  }

  const removeGeometry = async (id) => {
    try {
      await apiRequest(endpoints.adminTransit.routeGeometryItem(id), { method: 'DELETE' })
      showToast(t('admin.geo_deleted'))
      load()
    } catch {
      showToast(t('admin.geo_save_error'), true)
    }
  }

  const pages = useMemo(() => {
    const list = []
    const start = Math.max(1, meta.current_page - 2)
    const end = Math.min(meta.last_page, start + 4)
    for (let p = start; p <= end; p += 1) list.push(p)
    return list
  }, [meta])

  const summarizeGeometry = (geom) => {
    if (!Array.isArray(geom) || geom.length === 0) return '—'
    const [firstLat, firstLng] = geom[0]
    const [lastLat, lastLng] = geom[geom.length - 1]
    return `${geom.length} pts · ${firstLat.toFixed(4)},${firstLng.toFixed(4)} → ${lastLat.toFixed(4)},${lastLng.toFixed(4)}`
  }

  return (
    <div className="admin-geometry">
      <header className="admin-fares__head">
        <div>
          <h1>
            <Icon name="route" size={20} aria-hidden="true" /> {t('admin.geo_title')}
          </h1>
          <p className="t-caption">{t('admin.geo_subtitle')}</p>
        </div>
      </header>

      {toast && (
        <div className={`admin-toast${toast.isError ? ' admin-toast--error' : ''}`} role="status">
          {toast.message}
        </div>
      )}

      <div className="admin-fares__filters">
        <input
          type="number"
          className="input"
          placeholder={t('admin.geo_filter_variant')}
          value={variantFilter}
          onChange={(e) => { setPage(1); setVariantFilter(e.target.value) }}
          aria-label={t('admin.geo_filter_variant')}
        />
      </div>

      {error && (
        <div className="empty-state">
          <Icon name="warning" size={20} aria-hidden="true" />
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={load}>{t('action.retry')}</button>
        </div>
      )}

      {!error && loading && <div className="skeleton skeleton--card" />}

      {!error && !loading && rows.length === 0 && (
        <div className="empty-state">
          <Icon name="route" size={20} aria-hidden="true" />
          <p>{t('admin.no_data')}</p>
        </div>
      )}

      {!error && !loading && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('admin.geo_variant')}</th>
                <th>{t('admin.geo_points')}</th>
                <th>{t('admin.geo_length')}</th>
                <th>{t('admin.fare_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const geom = parseGeometry(row.geometry)
                return (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>#{row.route_variant_id}</td>
                    <td className="t-caption">{summarizeGeometry(geom)}</td>
                    <td className="t-caption">{row.length_meters ? `${(row.length_meters / 1000).toFixed(1)} km` : '—'}</td>
                    <td>
                      <div className="admin-fares__row-actions">
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEditor(row)}>
                          {t('profile.edit')}
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeGeometry(row.id)}>
                          <Icon name="trash" size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta.last_page > 1 && (
        <nav className="admin-pagination" aria-label="Pagination">
          <button type="button" disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)}>‹</button>
          {pages.map((p) => (
            <button key={p} type="button" className={p === meta.current_page ? 'is-active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)}>›</button>
        </nav>
      )}

      {editing && (
        <div className="modal-scrim" onClick={() => setEditing(null)} aria-hidden="true">
          <div
            className="modal-card modal-card--wide"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.geo_edit')}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t('admin.geo_edit')} — {t('admin.geo_variant')} #{editing.route_variant_id}</h2>
            <p className="t-caption">
              {t('admin.geo_points_count').replace('{count}', String(draftPoints.length))}
            </p>

            <div className="admin-geo__points">
              {draftPoints.map((p, i) => (
                <div key={i} className="admin-geo__point-row">
                  <span className="t-caption">#{i + 1}</span>
                  <input
                    className="input"
                    value={p.lat}
                    onChange={(e) => updatePoint(i, 'lat', e.target.value)}
                    aria-label={`lat ${i + 1}`}
                  />
                  <input
                    className="input"
                    value={p.lng}
                    onChange={(e) => updatePoint(i, 'lng', e.target.value)}
                    aria-label={`lng ${i + 1}`}
                  />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => removePoint(i)} aria-label={`${t('action.close')} ${i + 1}`}>
                    <Icon name="close" size={13} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn--secondary btn--sm" onClick={addPoint}>
              <Icon name="plus" size={13} aria-hidden="true" /> {t('admin.geo_add_point')}
            </button>

            {pointError && <p className="form-error" role="alert">{pointError}</p>}

            <div className="admin-fares__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>{t('action.cancel')}</button>
              <button type="button" className="btn btn--primary" disabled={saving} onClick={saveGeometry}>
                {saving ? t('planner.searching') : t('action.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
