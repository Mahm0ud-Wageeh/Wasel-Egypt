import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest } from '../api/client'

/**
 * Admin fare management — tables, filters, form, validation, pagination
 * and delete confirmation. Real and demo/estimated rows are managed in
 * one place so administrators can correct demo values without code
 * changes (the honesty contract stays intact: data_status is explicit
 * per row, never inferred).
 */

const EMPTY_FORM = {
  id: null,
  transit_mode_id: '',
  label: '',
  tier: '',
  amount: '',
  currency: 'EGP',
  data_status: 'demo_estimated',
  confidence: 'estimated',
  status: 'active',
  effective_from: '',
  effective_until: '',
  notes: '',
}

export default function AdminFares() {
  const { t } = useI18n()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modes, setModes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (statusFilter) params.set('data_status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await apiRequest(`/admin/fares?${params.toString()}`)
      setRows(Array.isArray(res?.data) ? res.data : [])
      setMeta({
        total: res?.meta?.total ?? 0,
        current_page: res?.meta?.current_page ?? 1,
        last_page: res?.meta?.last_page ?? 1,
      })
    } catch {
      setError(t('admin.fare_save_error'))
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    apiRequest('/transit-modes', { auth: false })
      .then((res) => setModes(Array.isArray(res) ? res : res?.data ?? []))
      .catch(() => setModes([]))
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setForm({
      id: row.id,
      transit_mode_id: row.transit_mode_id ?? '',
      label: row.label ?? '',
      tier: row.tier ?? '',
      amount: String(row.amount ?? ''),
      currency: row.currency ?? 'EGP',
      data_status: row.data_status ?? 'demo_estimated',
      confidence: row.confidence ?? 'estimated',
      status: row.status ?? 'active',
      effective_from: row.effective_from ?? '',
      effective_until: row.effective_until ?? '',
      notes: row.notes ?? '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  const save = async (e) => {
    e?.preventDefault?.()
    if (!form.label.trim() || form.amount === '') {
      setFormError(t('reports.validation'))
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        transit_mode_id: form.transit_mode_id ? Number(form.transit_mode_id) : null,
        label: form.label.trim(),
        tier: form.tier || null,
        amount: Number(form.amount),
        currency: form.currency || 'EGP',
        data_status: form.data_status,
        confidence: form.confidence,
        status: form.status,
        effective_from: form.effective_from || null,
        effective_until: form.effective_until || null,
        notes: form.notes || null,
      }
      if (form.id) {
        await apiRequest(`/admin/fares/${form.id}`, { method: 'PUT', body })
      } else {
        await apiRequest('/admin/fares', { method: 'POST', body })
      }
      setFormOpen(false)
      showToast(t('admin.fare_saved'))
      load()
    } catch (err) {
      const detail = err?.errors ? Object.values(err.errors).flat().join(' ') : err?.message
      setFormError(detail || t('admin.fare_save_error'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    try {
      await apiRequest(`/admin/fares/${id}`, { method: 'DELETE' })
      setConfirmDeleteId(null)
      showToast(t('admin.fare_deleted'))
      load()
    } catch {
      showToast(t('admin.fare_save_error'), true)
    }
  }

  const pages = useMemo(() => {
    const list = []
    const start = Math.max(1, meta.current_page - 2)
    const end = Math.min(meta.last_page, start + 4)
    for (let p = start; p <= end; p += 1) list.push(p)
    return list
  }, [meta])

  return (
    <div className="admin-fares">
      <header className="admin-fares__head">
        <div>
          <h1>
            <Icon name="wallet" size={20} aria-hidden="true" /> {t('admin.fares_title')}
          </h1>
          <p className="t-caption">{t('admin.fares_subtitle')}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Icon name="plus" size={15} aria-hidden="true" /> {t('admin.fare_new')}
        </button>
      </header>

      {toast && (
        <div className={`admin-toast${toast.isError ? ' admin-toast--error' : ''}`} role="status">
          {toast.message}
        </div>
      )}

      <div className="admin-fares__filters">
        <input
          type="search"
          className="input"
          placeholder={t('admin.search_fares')}
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
          aria-label={t('admin.search_fares')}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => {
            setPage(1)
            setStatusFilter(e.target.value)
          }}
          aria-label={t('admin.fare_status')}
        >
          <option value="">{t('reports.all_statuses')}</option>
          <option value="real">{t('admin.fare_real')}</option>
          <option value="demo_estimated">{t('admin.fare_demo')}</option>
        </select>
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
          <Icon name="wallet" size={20} aria-hidden="true" />
          <p>{t('admin.no_data')}</p>
        </div>
      )}

      {!error && !loading && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.fare_label')}</th>
                <th>{t('admin.fare_mode')}</th>
                <th>{t('admin.fare_amount')}</th>
                <th>{t('admin.fare_status')}</th>
                <th>{t('fares.effective')}</th>
                <th>{t('admin.fare_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.label}</strong>
                    {row.notes && <div className="t-caption" style={{ maxWidth: '280px' }}>{row.notes}</div>}
                  </td>
                  <td>{row.transit_mode?.name ?? '—'}</td>
                  <td><strong>{row.amount}</strong> {row.currency}</td>
                  <td>
                    {row.data_status === 'real' ? (
                      <span className="fare-badge fare-badge--real"><Icon name="badgeCheck" size={12} aria-hidden="true" /> {t('admin.fare_real')}</span>
                    ) : (
                      <span className="fare-badge fare-badge--demo"><Icon name="flaskConical" size={12} aria-hidden="true" /> {t('admin.fare_demo')}</span>
                    )}
                  </td>
                  <td className="t-caption">{row.effective_from ?? '—'}</td>
                  <td>
                    <div className="admin-fares__row-actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEdit(row)}>
                        {t('profile.edit')}
                      </button>
                      {confirmDeleteId === row.id ? (
                        <>
                          <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(row.id)}>{t('action.save')}</button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDeleteId(null)}>{t('action.cancel')}</button>
                        </>
                      ) : (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDeleteId(row.id)}>
                          <Icon name="trash" size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {formOpen && (
        <div className="modal-scrim" onClick={() => setFormOpen(false)} aria-hidden="true">
          <form
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? t('admin.fare_edit') : t('admin.fare_new')}
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <h2>{form.id ? t('admin.fare_edit') : t('admin.fare_new')}</h2>

            <label>
              {t('admin.fare_label')}
              <input
                className="input"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
                maxLength={160}
              />
            </label>

            <div className="admin-fares__form-grid">
              <label>
                {t('admin.fare_mode')}
                <select
                  className="input"
                  value={form.transit_mode_id}
                  onChange={(e) => setForm((f) => ({ ...f, transit_mode_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {modes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>
                {t('admin.fare_amount')}
                <input
                  className="input"
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="admin-fares__form-grid">
              <label>
                {t('admin.fare_status')}
                <select
                  className="input"
                  value={form.data_status}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    data_status: e.target.value,
                    confidence: e.target.value === 'real' ? 'verified' : 'estimated',
                  }))}
                >
                  <option value="demo_estimated">{t('admin.fare_demo')}</option>
                  <option value="real">{t('admin.fare_real')}</option>
                </select>
              </label>
              <label>
                {t('fares.effective')}
                <input
                  className="input"
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                />
              </label>
            </div>

            <label>
              {t('reports.moderation_notes')}
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                maxLength={2000}
              />
            </label>

            {formError && <p className="form-error" role="alert">{formError}</p>}

            <div className="admin-fares__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setFormOpen(false)}>{t('action.cancel')}</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? t('planner.searching') : t('action.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
