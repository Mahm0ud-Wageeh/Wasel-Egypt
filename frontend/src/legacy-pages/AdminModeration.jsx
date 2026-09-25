import { useI18n } from '../i18n/LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import {
  getReports,
  moderateReport,
  getReportModerations,
  getUserTrust,
  REPORT_TYPES,
} from '../api/reports'

export default function AdminModeration() {
  const { t, language } = useI18n()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')

  // Moderation action modal/panel state
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionTaken, setActionTaken] = useState('verify') // 'verify' | 'reject' | 'resolve'
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Author trust & moderation history
  const [authorTrust, setAuthorTrust] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingContext, setLoadingContext] = useState(false)

  const fetchReportsQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = {}
      if (statusFilter) query.status = statusFilter
      if (typeFilter) query.report_type = typeFilter
      const res = await getReports(query)
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setReports(list)
    } catch (err) {
      setError(err.message || t('admin.queue_load_error'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchReportsQueue()
  }, [fetchReportsQueue])

  const handleOpenModeration = async (report) => {
    setSelectedReport(report)
    setActionTaken('verify')
    setNotes('')
    setActionError(null)
    setActionSuccess(null)
    setAuthorTrust(null)
    setHistory([])
    setLoadingContext(true)

    try {
      const [trustData, histData] = await Promise.all([
        report.user_id ? getUserTrust(report.user_id).catch(() => null) : null,
        getReportModerations(report.id).catch(() => []),
      ])
      setAuthorTrust(trustData)
      setHistory(Array.isArray(histData) ? histData : (histData?.data ?? []))
    } catch {
      // ignore
    } finally {
      setLoadingContext(false)
    }
  }

  const handleSubmitModeration = async (e) => {
    e.preventDefault()
    if (!selectedReport) return
    setSubmitting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      await moderateReport(selectedReport.id, {
        action_taken: actionTaken,
        notes: notes.trim() || undefined,
      })
      setActionSuccess(t('admin.moderated').replace('{id}', selectedReport.id).replace('{action}', t('admin.action.' + actionTaken)))
      setTimeout(() => {
        setSelectedReport(null)
        fetchReportsQueue()
      }, 1200)
    } catch (err) {
      if (err.isConflict) {
        setActionError(err.message || t('admin.conflict_error'))
      } else {
        setActionError(err.message || t('admin.moderation_error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell__page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/admin" style={{ textDecoration: 'none', color: 'var(--p600)' }}>
              <Icon name="arrowLeft" size={14} aria-hidden="true" /> {t('admin.dashboard')} </Link>
            <span style={{ color: 'var(--ink300)' }}>/</span>
            <h1 className="t-h2" style={{ color: 'var(--p900)', margin: 0 }}> {t('admin.moderation_title')} </h1>
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}> {t('admin.moderation_subtitle')} </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 160, flex: 1 }}>
          <Select
            label={t('admin.queue_status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('reports.all_statuses')}</option>
            <option value="pending">{t('admin.pending_review')}</option>
            <option value="verified">{t('admin.verified_public')}</option>
            <option value="rejected">{t('reports.status.rejected')}</option>
            <option value="resolved">{t('reports.status.resolved')}</option>
          </Select>
        </div>

        <div style={{ minWidth: 160, flex: 1 }}>
          <Select
            label={t('admin.report_type')}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">{t('admin.all_issue_types')}</option>
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {t('reports.type.' + type.value)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <Alert severity="error" title={t('admin.queue_error')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="stack">
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
      ) : reports.length === 0 ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="success" size={22} aria-hidden="true" />}
            title={t('admin.queue_empty')}
            message={t('admin.queue_empty_body').replace('{status}', statusFilter ? t('reports.status.' + statusFilter) : t('admin.any'))}
          />
        </Card>
      ) : (
        <div className="stack">
          {reports.map((report) => {
            const typeInfo = REPORT_TYPES.find((type) => type.value === report.report_type) || {
              label: report.report_type,
              lucideIcon: 'pin',
            }

            return (
              <Card
                key={report.id}
                flat
                style={{
                  borderLeft: report.status === 'pending' ? '4px solid var(--w700)' : '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name={typeInfo.lucideIcon || 'pin'} size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <div>
                      <b style={{ fontSize: 14 }}> {t('admin.report_prefix')}{report.id} — {REPORT_TYPES.some((type) => type.value === report.report_type) ? t('reports.type.' + report.report_type) : typeInfo.label}
                      </b>
                      <div className="t-caption"> {t('admin.submitted')}{' '}
                        {new Date(report.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {report.user?.name ? t('admin.author_by').replace('{name}', report.user.name) : ''}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge value={report.status} label={t('reports.status.' + report.status)} />
                    <Button
                      size="sm"
                      variant={report.status === 'pending' ? 'primary' : 'secondary'}
                      onClick={() => handleOpenModeration(report)}
                    >
                      {report.status === 'pending' ? t('admin.moderate') : t('admin.inspect_details')}
                    </Button>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: 'var(--ink900)', margin: 0, lineHeight: 1.5 }}>
                  {report.description}
                </p>

                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {report.related_stop && (
                    <span className="badge badge--neutral">
                      <Icon name="pin" size={12} aria-hidden="true" /> {report.related_stop.name || report.related_stop.name_en || report.related_stop.name_ar}
                    </span>
                  )}
                  {report.related_route && (
                    <span className="badge badge--neutral">
                      <Icon name="bus" size={12} aria-hidden="true" /> {t('reports.route_prefix')}{report.related_route.route_short_name || report.related_route.id}
                    </span>
                  )}
                  {report.latitude && report.longitude && (
                    <span className="t-caption">
                      <Icon name="pin" size={12} aria-hidden="true" /> {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Moderation Action Modal */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r-xl)',
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: 'var(--sh-lg)',
            }}
          >
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h2 className="t-h2" style={{ margin: 0, color: 'var(--p900)' }}> {t('admin.moderate_prefix')}{selectedReport.id}
              </h2>
              <button
                className="topbar__back"
                onClick={() => setSelectedReport(null)}
                aria-label={t('action.close')}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {actionSuccess && (
              <Alert severity="success" title={t('common.success')}>
                {actionSuccess}
              </Alert>
            )}

            {actionError && (
              <Alert severity="error" title={t('admin.moderation_conflict')}>
                {actionError}
              </Alert>
            )}

            {/* Author Trust Box */}
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 'var(--r-md)',
                padding: 12,
                marginTop: 10,
                border: '1px solid var(--line)',
              }}
            >
              <b style={{ fontSize: 13, color: 'var(--ink900)', display: 'block', marginBottom: 4 }}> {t('admin.author_reputation')} </b>
              {loadingContext ? (
                <Skeleton height={30} />
              ) : authorTrust ? (
                <div className="row-between" style={{ fontSize: 12 }}>
                  <div> {t('admin.trust_score_label')} <b style={{ color: 'var(--s800)' }}>{authorTrust.score ?? 100}/100</b>
                  </div>
                  <div> {t('admin.verified_label')} <b>{authorTrust.verified_reports_count ?? 0}</b> {t('admin.rejected_label')}{' '}
                    <b>{authorTrust.rejected_reports_count ?? 0}</b>
                  </div>
                </div>
              ) : (
                <span className="t-caption">{t('admin.standard_contributor')}</span>
              )}
            </div>

            {/* Incident Description */}
            <div style={{ marginTop: 12 }}>
              <b style={{ fontSize: 13 }}>{t('admin.description')}</b>
              <p
                style={{
                  fontSize: 13.5,
                  background: 'var(--p50)',
                  padding: 10,
                  borderRadius: 'var(--r-md)',
                  margin: '4px 0 0',
                }}
              >
                {selectedReport.description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitModeration} className="stack" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="field__label">{t('admin.apply_action')}</label>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActionTaken('verify')}
                    className={`btn btn--sm ${actionTaken === 'verify' ? 'btn--primary' : 'btn--secondary'}`}
                    style={{ flex: 1 }}
                  >
                    <Icon name="success" size={14} aria-hidden="true" /> {t('admin.verify_publish')} </button>

                  <button
                    type="button"
                    onClick={() => setActionTaken('reject')}
                    className={`btn btn--sm ${actionTaken === 'reject' ? 'btn--danger' : 'btn--secondary'}`}
                    style={{ flex: 1 }}
                  >
                    <Icon name="close" size={14} /> {t('admin.reject')} </button>

                  <button
                    type="button"
                    onClick={() => setActionTaken('resolve')}
                    className={`btn btn--sm ${actionTaken === 'resolve' ? 'btn--primary' : 'btn--secondary'}`}
                    style={{ flex: 1, background: actionTaken === 'resolve' ? 'var(--nile)' : undefined }}
                  >
                    <Icon name="flag" size={14} aria-hidden="true" /> {t('admin.resolve')} </button>
                </div>
              </div>

              <div className="field">
                <label className="field__label">{t('admin.moderation_notes')}</label>
                <textarea
                  className="field__input"
                  style={{ height: 70, padding: 8, resize: 'vertical' }}
                  placeholder={t('admin.reason_hint')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* History list */}
              {history.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <b style={{ fontSize: 12, color: 'var(--ink700)' }}>{t('admin.audit_trail')}</b>
                  <div className="stack-sm" style={{ marginTop: 4 }}>
                    {history.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          fontSize: 11.5,
                          padding: 6,
                          background: 'var(--bg)',
                          borderRadius: 'var(--r-sm)',
                        }}
                      >
                        <b>{['verify', 'reject', 'resolve'].includes(h.action_taken) ? t('admin.action.' + h.action_taken) : h.action_taken}</b> {t('admin.by')} {h.moderator?.name || t('admin.moderator')} {t('admin.on')}{' '}
                        {new Date(h.created_at).toLocaleDateString()}
                        {h.notes ? ` — "${h.notes}"` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedReport(null)}
                > {t('action.cancel')} </Button>
                <Button type="submit" variant="primary" loading={submitting}> {t('admin.confirm_moderation')} </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
