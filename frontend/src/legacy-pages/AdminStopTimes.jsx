import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useI18n } from '../i18n/LanguageContext'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'

/**
 * Admin stop-times console — list, search, filter, edit, validate and save
 * schedule stop times through the governed stop-times apiResource
 * (server-side transit-data-edit permission). Time edits are validated
 * client-side to H:MM:SS before submission; the server re-validates.
 */

const EMPTY_FORM = {
  id: null,
  schedule_id: '',
  transit_stop_id: '',
  sequence: '',
  arrival_time: '',
  departure_time: '',
  timepoint: '1',
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/

export default function AdminStopTimes() {
  const { t } = useI18n()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [page, setPage] = useState(1)
  const [scheduleFilter, setScheduleFilter] = useState('')
  const [stopFilter, setStopFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
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
      const params = new URLSearchParams({ page: String(page), per_page: '20', sort_by: 'sequence', sort_order: 'asc' })
      if (scheduleFilter.trim()) params.set('schedule_id', scheduleFilter.trim())
      if (stopFilter.trim()) params.set('transit_stop_id', stopFilter.trim())
      const res = await apiRequest(`${endpoints.adminTransit.stopTimes}?${params.toString()}`)
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      // Server-side search is not part of the resource; filter client-side
      // over the current page (search narrows within the visible set).
      const needle = search.trim().toLowerCase()
      const filtered = needle
        ? data.filter((r) =>
            (r.transit_stop?.name ?? '').toLowerCase().includes(needle)
            || String(r.schedule?.gtfs_trip_id ?? '').toLowerCase().includes(needle))
        : data
      setRows(filtered)
      setMeta({
        total: res?.meta?.total ?? 0,
        current_page: res?.meta?.current_page ?? 1,
        last_page: res?.meta?.last_page ?? 1,
      })
    } catch {
      setError(t('admin.st_load_error'))
    } finally {
      setLoading(false)
    }
  }, [page, scheduleFilter, stopFilter, search, t])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (row) => {
    setForm({
      id: row.id,
      schedule_id: String(row.schedule?.id ?? ''),
      transit_stop_id: String(row.transit_stop?.id ?? ''),
      sequence: String(row.sequence ?? ''),
      arrival_time: row.arrival_time ?? '',
      departure_time: row.departure_time ?? '',
      timepoint: row.timepoint ? '1' : '0',
    })
    setFormError(null)
    setFormOpen(true)
  }

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, schedule_id: scheduleFilter.trim(), transit_stop_id: stopFilter.trim() })
    setFormError(null)
    setFormOpen(true)
  }

  const validateForm = () => {
    if (!form.schedule_id || !form.transit_stop_id || form.sequence === '') {
      return t('admin.st_validation_required')
    }
    if (!Number.isInteger(Number(form.sequence)) || Number(form.sequence) < 0) {
      return t('admin.st_validation_sequence')
    }
    for (const field of ['arrival_time', 'departure_time']) {
      const v = form[field]
      if (v && !TIME_RE.test(v)) {
        const label = field === 'arrival_time' ? t('admin.st_arrival') : t('admin.st_departure')
        return `${label}: ${t('admin.st_validation_time')}`
      }
    }
    return null
  }

  const save = async (e) => {
    e?.preventDefault?.()
    const invalid = validateForm()
    if (invalid) {
      setFormError(invalid)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        schedule_id: Number(form.schedule_id),
        transit_stop_id: Number(form.transit_stop_id),
        sequence: Number(form.sequence),
        arrival_time: form.arrival_time || null,
        departure_time: form.departure_time || null,
        timepoint: form.timepoint === '1',
      }
      if (form.id) {
        await apiRequest(endpoints.adminTransit.stopTime(form.id), { method: 'PUT', body })
      } else {
        await apiRequest(endpoints.adminTransit.stopTimes, { method: 'POST', body })
      }
      setFormOpen(false)
      showToast(t('admin.st_saved'))
      load()
    } catch (err) {
      const detail = err?.errors ? Object.values(err.errors).flat().join(' ') : err?.message
      setFormError(detail || t('admin.st_save_error'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    try {
      await apiRequest(endpoints.adminTransit.stopTime(id), { method: 'DELETE' })
      showToast(t('admin.st_deleted'))
      load()
    } catch {
      showToast(t('admin.st_save_error'), true)
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
    <div className="admin-stoptimes">
      <header className="admin-fares__head">
        <div>
          <h1>
            <Icon name="clock" size={20} aria-hidden="true" /> {t('admin.st_title')}
          </h1>
          <p className="t-caption">{t('admin.st_subtitle')}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Icon name="plus" size={15} aria-hidden="true" /> {t('admin.st_new')}
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
          placeholder={t('admin.st_search_hint')}
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value) }}
          aria-label={t('admin.st_search_hint')}
        />
        <input
          type="number"
          className="input"
          placeholder={t('admin.st_filter_schedule')}
          value={scheduleFilter}
          onChange={(e) => { setPage(1); setScheduleFilter(e.target.value) }}
          aria-label={t('admin.st_filter_schedule')}
        />
        <input
          type="number"
          className="input"
          placeholder={t('admin.st_filter_stop')}
          value={stopFilter}
          onChange={(e) => { setPage(1); setStopFilter(e.target.value) }}
          aria-label={t('admin.st_filter_stop')}
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
          <Icon name="clock" size={20} aria-hidden="true" />
          <p>{t('admin.no_data')}</p>
        </div>
      )}

      {!error && !loading && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.st_trip')}</th>
                <th>{t('admin.st_stop')}</th>
                <th>#</th>
                <th>{t('admin.st_arrival')}</th>
                <th>{t('admin.st_departure')}</th>
                <th>{t('admin.fare_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="t-caption">{row.schedule?.gtfs_trip_id ?? '—'}</td>
                  <td><strong>{row.transit_stop?.name ?? '—'}</strong></td>
                  <td>{row.sequence}</td>
                  <td className="t-caption">{row.arrival_time ?? '—'}</td>
                  <td className="t-caption">{row.departure_time ?? '—'}</td>
                  <td>
                    <div className="admin-fares__row-actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEdit(row)}>
                        {t('profile.edit')}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(row.id)}>
                        <Icon name="trash" size={13} aria-hidden="true" />
                      </button>
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
            aria-label={form.id ? t('admin.st_edit') : t('admin.st_new')}
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <h2>{form.id ? t('admin.st_edit') : t('admin.st_new')}</h2>

            <div className="admin-fares__form-grid">
              <label>
                {t('admin.st_filter_schedule')}
                <input
                  className="input"
                  type="number"
                  value={form.schedule_id}
                  onChange={(e) => setForm((f) => ({ ...f, schedule_id: e.target.value }))}
                  required
                />
              </label>
              <label>
                {t('admin.st_filter_stop')}
                <input
                  className="input"
                  type="number"
                  value={form.transit_stop_id}
                  onChange={(e) => setForm((f) => ({ ...f, transit_stop_id: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="admin-fares__form-grid">
              <label>
                {t('admin.st_sequence')}
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.sequence}
                  onChange={(e) => setForm((f) => ({ ...f, sequence: e.target.value }))}
                  required
                />
              </label>
              <label>
                {t('admin.st_timepoint')}
                <select
                  className="input"
                  value={form.timepoint}
                  onChange={(e) => setForm((f) => ({ ...f, timepoint: e.target.value }))}
                >
                  <option value="1">{t('common.success')}</option>
                  <option value="0">—</option>
                </select>
              </label>
            </div>

            <div className="admin-fares__form-grid">
              <label>
                {t('admin.st_arrival')}
                <input
                  className="input"
                  placeholder="HH:MM:SS"
                  value={form.arrival_time}
                  onChange={(e) => setForm((f) => ({ ...f, arrival_time: e.target.value }))}
                />
              </label>
              <label>
                {t('admin.st_departure')}
                <input
                  className="input"
                  placeholder="HH:MM:SS"
                  value={form.departure_time}
                  onChange={(e) => setForm((f) => ({ ...f, departure_time: e.target.value }))}
                />
              </label>
            </div>

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
