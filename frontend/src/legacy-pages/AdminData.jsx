import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Admin data-governance console: live data-quality indicators, import
 * history with provenance, audit history, and the governed rollback flow
 * (preview → explicit confirmation → executed + audited server-side).
 * Every number comes from the backend report — nothing is fabricated
 * client-side, and rows without data carry an honest "—" or UNKNOWN label.
 */

const QUALITY_CARDS = (t) => [
  { key: 'stops', label: t('admin.dq_stops'), icon: 'pin', pick: (q) => q?.stops?.total },
  { key: 'routes', label: t('admin.dq_routes'), icon: 'route', pick: (q) => q?.routes?.total },
  { key: 'variants', label: t('admin.dq_variants'), icon: 'layers', pick: (q) => q?.routes ? q.routes.total - q.routes.without_variants : undefined },
  { key: 'schedules', label: t('admin.dq_active_schedules'), icon: 'clock', pick: (q) => q?.schedules?.active },
  { key: 'missing_geom', label: t('admin.dq_missing_geometry'), icon: 'warning', warn: true, pick: (q) => q?.geometry?.variants_without_geometry },
  { key: 'suspicious_geom', label: t('admin.dq_suspicious_geometry'), icon: 'warning', warn: true, pick: (q) => q?.geometry?.suspicious_length },
  { key: 'real_fares', label: t('admin.dq_real_fares'), icon: 'badgeCheck', pick: (q) => q?.fares?.real },
  { key: 'demo_fares', label: t('admin.dq_estimated_fares'), icon: 'flaskConical', warn: true, pick: (q) => q?.fares?.demo_estimated },
  { key: 'stale', label: t('admin.dq_stale_datasets'), icon: 'history', warn: true, pick: (q) => q?.imports?.stale_datasets },
  { key: 'failed', label: t('admin.dq_failed_imports'), icon: 'zap', warn: true, pick: (q) => q?.imports?.failed_imports },
  { key: 'last_import', label: t('admin.dq_last_import'), icon: 'history', pick: (q) => q?.imports?.last_import_at, format: 'datetime' },
  { key: 'unresolved', label: t('admin.dq_critical_issues'), icon: 'warning', warn: true, pick: (q) => q?.summary?.critical_issues },
]

export default function AdminData() {
  const { t } = useI18n()

  const [tab, setTab] = useState('quality')
  const [quality, setQuality] = useState(null)
  const [imports, setImports] = useState([])
  const [importsMeta, setImportsMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [audit, setAudit] = useState([])
  const [auditMeta, setAuditMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(null)
  const [rollbackBusy, setRollbackBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3600)
  }, [])

  const loadQuality = useCallback(async () => {
    try {
      const res = await apiRequest(endpoints.admin.dataQuality)
      setQuality(res?.data ?? res)
    } catch {
      setError(t('admin.dq_load_error'))
    }
  }, [t])

  const loadImports = useCallback(async (page = 1) => {
    try {
      const res = await apiRequest(`${endpoints.admin.dataImports}?page=${page}&per_page=15`)
      setImports(Array.isArray(res?.data) ? res.data : [])
      setImportsMeta({
        total: res?.meta?.total ?? 0,
        current_page: res?.meta?.current_page ?? 1,
        last_page: res?.meta?.last_page ?? 1,
      })
    } catch {
      setError(t('admin.dq_load_error'))
    }
  }, [t])

  const loadAudit = useCallback(async (page = 1) => {
    try {
      const res = await apiRequest(`${endpoints.admin.dataAudit}?page=${page}&per_page=15`)
      setAudit(Array.isArray(res?.data) ? res.data : [])
      setAuditMeta({
        total: res?.meta?.total ?? 0,
        current_page: res?.meta?.current_page ?? 1,
        last_page: res?.meta?.last_page ?? 1,
      })
    } catch {
      setError(t('admin.dq_load_error'))
    }
  }, [t])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([loadQuality(), loadImports(1), loadAudit(1)]).finally(() => setLoading(false))
  }, [loadQuality, loadImports, loadAudit])

  const openPreview = async (id) => {
    setPreviewLoading(id)
    setPreview(null)
    try {
      const res = await apiRequest(endpoints.admin.rollbackPreview(id))
      setPreview(res?.data ?? null)
    } catch {
      showToast(t('admin.dq_load_error'), true)
    } finally {
      setPreviewLoading(null)
    }
  }

  const executeRollback = async (id) => {
    setRollbackBusy(true)
    try {
      const res = await apiRequest(endpoints.admin.rollback(id), {
        method: 'POST',
        body: { confirm: true, reason: t('admin.rollback_reason_default') },
      })
      setPreview(null)
      showToast(t('admin.rollback_done'))
      await Promise.all([loadQuality(), loadImports(importsMeta.current_page)])
      void res
    } catch (err) {
      showToast(err?.message || t('admin.dq_load_error'), true)
    } finally {
      setRollbackBusy(false)
    }
  }

  const cards = useMemo(() => QUALITY_CARDS(t), [t])

  const fmtTime = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return iso
    }
  }

  return (
    <div className="admin-data">
      <header className="admin-data__head">
        <div>
          <h1>
            <Icon name="layers" size={20} aria-hidden="true" /> {t('admin.data_title')}
          </h1>
          <p className="t-caption">{t('admin.data_subtitle')}</p>
        </div>
      </header>

      {toast && (
        <div className={`admin-toast${toast.isError ? ' admin-toast--error' : ''}`} role="status">
          {toast.message}
        </div>
      )}

      <div className="admin-data__tabs" role="tablist">
        {['quality', 'imports', 'audit'].map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`admin-data__tab${tab === k ? ' is-active' : ''}`}
            onClick={() => setTab(k)}
          >
            {t(`admin.data_tab_${k}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="empty-state">
          <Icon name="warning" size={20} aria-hidden="true" />
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => window.location.reload()}>
            {t('action.retry')}
          </button>
        </div>
      )}

      {!error && loading && <div className="skeleton skeleton--card" />}

      {/* ── Quality dashboard ── */}
      {!error && !loading && tab === 'quality' && (
        <section aria-label={t('admin.data_tab_quality')}>
          <div className="admin-data__cards">
            {cards.map((c) => {
              const raw = c.pick(quality)
              const value = c.format === 'datetime' ? fmtTime(raw) : (raw ?? '—')
              return (
                <div key={c.key} className={`admin-data__card${c.warn && Number(raw) > 0 ? ' is-warn' : ''}`}>
                  <span className="admin-data__card-icon">
                    <Icon name={c.icon} size={16} aria-hidden="true" />
                  </span>
                  <strong>{value}</strong>
                  <span className="t-caption">{c.label}</span>
                </div>
              )
            })}
          </div>

          {quality?.fares && (
            <p className="admin-data__note t-caption">
              <Icon name="info" size={13} aria-hidden="true" /> {t('admin.dq_fares_note')}
            </p>
          )}
          {quality?.summary?.note && (
            <p className="admin-data__note t-caption">
              <Icon name="info" size={13} aria-hidden="true" /> {quality.summary.note}
            </p>
          )}
        </section>
      )}

      {/* ── Import history ── */}
      {!error && !loading && tab === 'imports' && (
        <section aria-label={t('admin.data_tab_imports')}>
          {imports.length === 0 ? (
            <div className="empty-state">
              <Icon name="layers" size={20} aria-hidden="true" />
              <p>{t('admin.no_data')}</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.imp_source')}</th>
                    <th>{t('admin.imp_version')}</th>
                    <th>{t('admin.imp_imported_at')}</th>
                    <th>{t('admin.imp_status')}</th>
                    <th>{t('admin.imp_validation')}</th>
                    <th>{t('admin.imp_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.source}</strong>
                        {row.license && <div className="t-caption">{row.license}</div>}
                      </td>
                      <td className="t-caption">{row.dataset_version ?? '—'}</td>
                      <td className="t-caption">{fmtTime(row.imported_at)}</td>
                      <td>
                        <span className={`admin-status admin-status--${row.status === 'completed' ? 'ok' : row.status === 'failed' ? 'bad' : 'warn'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="t-caption">
                        {row.validation?.status === 'passed'
                          ? t('admin.validation_passed')
                          : row.validation?.status === 'failed'
                            ? t('admin.validation_failed')
                            : (row.validation?.message ?? '—')}
                      </td>
                      <td>
                        {row.rollbackable ? (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            disabled={previewLoading === row.id}
                            onClick={() => openPreview(row.id)}
                          >
                            {previewLoading === row.id ? t('planner.searching') : t('admin.rollback_preview')}
                          </button>
                        ) : (
                          <span className="t-caption">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {importsMeta.last_page > 1 && (
            <nav className="admin-pagination" aria-label="Pagination">
              <button type="button" disabled={importsMeta.current_page <= 1} onClick={() => loadImports(importsMeta.current_page - 1)}>‹</button>
              <span className="admin-pagination__info t-caption">{importsMeta.current_page} / {importsMeta.last_page}</span>
              <button type="button" disabled={importsMeta.current_page >= importsMeta.last_page} onClick={() => loadImports(importsMeta.current_page + 1)}>›</button>
            </nav>
          )}
        </section>
      )}

      {/* ── Audit history ── */}
      {!error && !loading && tab === 'audit' && (
        <section aria-label={t('admin.data_tab_audit')}>
          {audit.length === 0 ? (
            <div className="empty-state">
              <Icon name="shield" size={20} aria-hidden="true" />
              <p>{t('admin.no_data')}</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.audit_actor')}</th>
                    <th>{t('admin.audit_action')}</th>
                    <th>{t('admin.audit_object')}</th>
                    <th>{t('admin.audit_when')}</th>
                    <th>{t('admin.audit_changes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <td className="t-caption">{row.user?.email ?? 'system'}</td>
                      <td><code className="admin-chip">{row.action}</code></td>
                      <td className="t-caption">{row.resource_type}{row.resource_id != null ? ` #${row.resource_id}` : ''}</td>
                      <td className="t-caption">{fmtTime(row.occurred_at)}</td>
                      <td className="t-caption admin-audit__changes">
                        {row.changes
                          ? <details><summary>{t('admin.audit_view')}</summary><pre>{JSON.stringify(row.changes, null, 2)}</pre></details>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {auditMeta.last_page > 1 && (
            <nav className="admin-pagination" aria-label="Pagination">
              <button type="button" disabled={auditMeta.current_page <= 1} onClick={() => loadAudit(auditMeta.current_page - 1)}>‹</button>
              <span className="admin-pagination__info t-caption">{auditMeta.current_page} / {auditMeta.last_page}</span>
              <button type="button" disabled={auditMeta.current_page >= auditMeta.last_page} onClick={() => loadAudit(auditMeta.current_page + 1)}>›</button>
            </nav>
          )}
        </section>
      )}

      {/* ── Rollback preview modal ── */}
      {preview && (
        <div className="modal-scrim" onClick={() => setPreview(null)} aria-hidden="true">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.rollback_title')}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t('admin.rollback_title')}: {preview.import?.source}</h2>
            <p className="t-caption">{t('admin.rollback_subtitle')}</p>

            <table className="admin-table admin-table--compact">
              <thead>
                <tr><th>{t('admin.rollback_entity')}</th><th>{t('admin.rollback_rows')}</th></tr>
              </thead>
              <tbody>
                {Object.entries(preview.affected ?? {}).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td><strong>{v}</strong></td></tr>
                ))}
              </tbody>
            </table>

            <ul className="admin-rollback__warnings">
              {(preview.warnings ?? []).map((w) => (
                <li key={w} className="t-caption"><Icon name="warning" size={13} aria-hidden="true" /> {w}</li>
              ))}
            </ul>

            <div className="admin-fares__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPreview(null)}>
                {t('action.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={rollbackBusy || Object.keys(preview.affected ?? {}).length === 0}
                onClick={() => executeRollback(preview.import?.id)}
              >
                {rollbackBusy ? t('planner.searching') : t('admin.rollback_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
