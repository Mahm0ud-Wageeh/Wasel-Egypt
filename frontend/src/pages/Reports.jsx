import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import {
  getReports,
  getPublicReports,
  createReport,
  deleteReport,
  getReportModerations,
  REPORT_TYPES,
} from '../api/reports'
import { getPublicStops } from '../api/journeys'

export default function Reports() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'mine'
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Report submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  // Form fields
  const [reportType, setReportType] = useState('delay')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('30.0444')
  const [longitude, setLongitude] = useState('31.2357')
  const [relatedStopId, setRelatedStopId] = useState('')
  const [mediaUrls, setMediaUrls] = useState([''])
  const [validationErrors, setValidationErrors] = useState({})

  // Stops list for stop picker
  const [stops, setStops] = useState([])

  // Moderation detail expansion
  const [activeModerations, setActiveModerations] = useState({})
  const [loadingModeration, setLoadingModeration] = useState({})

  // Fetch stops for selector
  useEffect(() => {
    getPublicStops()
      .then((data) => setStops(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => {})
  }, [])

  const fetchReportsList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'mine' && isAuthenticated) {
        const query = {}
        if (typeFilter) query.report_type = typeFilter
        if (statusFilter) query.status = statusFilter
        const res = await getReports(query)
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setReports(list)
      } else {
        const query = {}
        if (typeFilter) query.report_type = typeFilter
        const res = await getPublicReports(query)
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setReports(list)
      }
    } catch (err) {
      setError(err.message || 'Failed to load community reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, isAuthenticated, typeFilter, statusFilter])

  useEffect(() => {
    fetchReportsList()
  }, [fetchReportsList])

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6))
          setLongitude(pos.coords.longitude.toFixed(6))
        },
        () => {
          // fallback to Cairo downtown
          setLatitude('30.0444')
          setLongitude('31.2357')
        }
      )
    }
  }

  const handleMediaUrlChange = (index, value) => {
    const updated = [...mediaUrls]
    updated[index] = value
    setMediaUrls(updated)
  }

  const handleAddMediaUrl = () => {
    if (mediaUrls.length < 3) {
      setMediaUrls([...mediaUrls, ''])
    }
  }

  const handleRemoveMediaUrl = (index) => {
    const updated = mediaUrls.filter((_, i) => i !== index)
    setMediaUrls(updated.length ? updated : [''])
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)
    setValidationErrors({})

    const errs = {}
    if (!reportType) errs.report_type = 'Please select a report type.'
    if (!description || description.trim().length < 10) {
      errs.description = 'Please describe the issue in at least 10 characters.'
    }
    if (!latitude || isNaN(latitude)) errs.latitude = 'Valid latitude is required.'
    if (!longitude || isNaN(longitude)) errs.longitude = 'Valid longitude is required.'

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const validMedia = mediaUrls.map((u) => u.trim()).filter(Boolean)
      const payload = {
        report_type: reportType,
        description: description.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        ...(relatedStopId ? { related_stop_id: parseInt(relatedStopId, 10) } : {}),
        ...(validMedia.length > 0 ? { media_urls: validMedia } : {}),
      }

      await createReport(payload)
      setSubmitSuccess('Your report has been submitted for moderation. Thank you for helping fellow commuters!')
      setDescription('')
      setMediaUrls([''])
      setRelatedStopId('')
      setTimeout(() => {
        setShowSubmitModal(false)
        setSubmitSuccess(null)
        fetchReportsList()
      }, 1500)
    } catch (err) {
      if (err.isConflict) {
        setSubmitError(err.message || 'Duplicate or rate-limited report. Please wait before reporting the same issue.')
      } else if (err.isValidation && err.errors) {
        setValidationErrors(err.errors)
        setSubmitError('Please correct the validation errors below.')
      } else {
        setSubmitError(err.message || 'Failed to submit report. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this report?')) return
    try {
      await deleteReport(id)
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      alert(err.message || 'Could not delete report.')
    }
  }

  const handleToggleModerationHistory = async (reportId) => {
    if (activeModerations[reportId]) {
      setActiveModerations((prev) => ({ ...prev, [reportId]: null }))
      return
    }

    setLoadingModeration((prev) => ({ ...prev, [reportId]: true }))
    try {
      const history = await getReportModerations(reportId)
      const list = Array.isArray(history) ? history : (history?.data ?? [])
      setActiveModerations((prev) => ({ ...prev, [reportId]: list }))
    } catch {
      setActiveModerations((prev) => ({ ...prev, [reportId]: [] }))
    } finally {
      setLoadingModeration((prev) => ({ ...prev, [reportId]: false }))
    }
  }

  return (
    <div className="app-shell__page">
      {/* Header / Intro */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-h1" style={{ color: 'var(--p900)', margin: 0 }}>
            Community Reports
          </h1>
          <p className="t-caption" style={{ marginTop: 2 }}>
            Real-time crowdsourced alerts, delays, and transit updates
          </p>
        </div>
        {isAuthenticated && (
          <Button
            size="md"
            variant="primary"
            onClick={() => {
              setShowSubmitModal(true)
              setSubmitError(null)
              handleGetCurrentLocation()
            }}
          >
            + New Report
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8, gap: 16 }}>
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className="btn btn--ghost"
          style={{
            fontWeight: 700,
            color: activeTab === 'feed' ? 'var(--p600)' : 'var(--ink500)',
            borderBottom: activeTab === 'feed' ? '2px solid var(--p600)' : '2px solid transparent',
            borderRadius: 0,
            padding: '4px 8px',
          }}
        >
          Public Feed (Verified)
        </button>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className="btn btn--ghost"
            style={{
              fontWeight: 700,
              color: activeTab === 'mine' ? 'var(--p600)' : 'var(--ink500)',
              borderBottom: activeTab === 'mine' ? '2px solid var(--p600)' : '2px solid transparent',
              borderRadius: 0,
              padding: '4px 8px',
            }}
          >
            My Reports
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 160, flex: 1 }}>
          <Select
            label="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        {activeTab === 'mine' && (
          <div style={{ minWidth: 140, flex: 1 }}>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" title="Failed to load reports">
          {error}
        </Alert>
      )}

      {/* Report List */}
      {loading ? (
        <div className="stack">
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
      ) : reports.length === 0 ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="reports" size={22} aria-hidden="true" />}
            title="No reports found"
            message={
              activeTab === 'mine'
                ? "You haven't submitted any reports yet."
                : 'No community reports match the selected filters.'
            }
            action={
              isAuthenticated && (
                <Button size="sm" onClick={() => setShowSubmitModal(true)}>
                  Submit a report
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="stack">
          {reports.map((report) => {
            const typeInfo = REPORT_TYPES.find((t) => t.value === report.report_type) || {
              label: report.report_type,
              lucideIcon: 'pin',
            }
            const isOwner = user && report.user_id === user.id
            const canDelete = isOwner && report.status === 'pending'
            const moderations = activeModerations[report.id]

            return (
              <Card key={report.id} flat style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name={typeInfo.lucideIcon || 'pin'} size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <div>
                      <b style={{ fontSize: 14, color: 'var(--ink900)' }}>{typeInfo.label}</b>
                      <div className="t-caption">
                        {report.occurred_at
                          ? new Date(report.occurred_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(report.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </div>
                    </div>
                  </div>
                  <Badge value={report.status} />
                </div>

                {/* Description */}
                <p style={{ fontSize: 13.5, color: 'var(--ink900)', lineHeight: 1.5, margin: 0 }}>
                  {report.description}
                </p>

                {/* Stop / Route / Coordinates */}
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {report.related_stop && (
                    <span className="badge badge--neutral">
                      <Icon name="pin" size={12} aria-hidden="true" /> {report.related_stop.name || report.related_stop.name_en || report.related_stop.name_ar}
                    </span>
                  )}
                  {report.related_route && (
                    <span className="badge badge--neutral">
                      <Icon name="bus" size={12} aria-hidden="true" /> Route #{report.related_route.route_short_name || report.related_route.id}
                    </span>
                  )}
                  {report.latitude && report.longitude && (
                    <span className="t-caption" style={{ color: 'var(--ink500)' }}>
                      <Icon name="pin" size={12} aria-hidden="true" /> {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </span>
                  )}
                </div>

                {/* Media previews if any */}
                {report.media_urls && Array.isArray(report.media_urls) && report.media_urls.length > 0 && (
                  <div className="row" style={{ gap: 8, overflowX: 'auto', padding: '4px 0' }}>
                    {report.media_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-block',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--r-sm)',
                          padding: '4px 8px',
                          fontSize: 12,
                          background: 'var(--bg)',
                          textDecoration: 'none',
                        }}
                      >
                        <Icon name="image" size={12} aria-hidden="true" /> Photo {idx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* Action footer */}
                <div
                  className="row-between"
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: 0 }}
                    onClick={() => handleToggleModerationHistory(report.id)}
                  >
                    {loadingModeration[report.id] ? 'Loading history...' : 'Moderation notes ▾'}
                  </button>

                  {canDelete && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>

                {/* Moderation History Accordion */}
                {moderations && (
                  <div
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 'var(--r-md)',
                      padding: 10,
                      marginTop: 4,
                    }}
                  >
                    <b style={{ fontSize: 12, color: 'var(--ink700)' }}>Moderation Timeline:</b>
                    {moderations.length === 0 ? (
                      <p className="t-caption" style={{ margin: '4px 0 0' }}>
                        No moderation actions recorded yet.
                      </p>
                    ) : (
                      <div className="stack-sm" style={{ marginTop: 6 }}>
                        {moderations.map((mod) => (
                          <div
                            key={mod.id}
                            style={{
                              fontSize: 12,
                              borderLeft: '2px solid var(--p600)',
                              paddingLeft: 8,
                            }}
                          >
                            <div className="row-between">
                              <b>Action: {mod.action_taken}</b>
                              <span className="t-caption">
                                {new Date(mod.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {mod.notes && <div style={{ color: 'var(--ink700)' }}>{mod.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Submit Report Modal */}
      {showSubmitModal && (
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
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: 'var(--sh-lg)',
            }}
          >
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h2 className="t-h2" style={{ margin: 0, color: 'var(--p900)' }}>
                Report an Issue
              </h2>
              <button
                className="topbar__back"
                onClick={() => setShowSubmitModal(false)}
                aria-label="Close"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {submitSuccess && (
              <Alert severity="success" title="Success">
                {submitSuccess}
              </Alert>
            )}

            {submitError && (
              <Alert severity="error" title="Submission Error">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmitReport} noValidate className="stack" style={{ marginTop: 12 }}>
              {/* Type Grid */}
              <div className="field">
                <label className="field__label">Issue Type *</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 8,
                  }}
                >
                  {REPORT_TYPES.map((t) => {
                    const isSelected = reportType === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setReportType(t.value)}
                        style={{
                          border: isSelected ? '2px solid var(--p600)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--p50)' : 'var(--surface)',
                          borderRadius: 'var(--r-md)',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                          textAlign: 'left',
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--p700)' : 'var(--ink900)',
                        }}
                      >
                        <Icon name={t.lucideIcon} size={16} aria-hidden="true" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
                {validationErrors.report_type && (
                  <div className="field__error">{validationErrors.report_type}</div>
                )}
              </div>

              {/* Description */}
              <div className="field">
                <label className="field__label">Description (min 10 characters) *</label>
                <textarea
                  className={`field__input ${validationErrors.description ? 'field__input--error' : ''}`}
                  style={{ height: 80, padding: 10, resize: 'vertical' }}
                  placeholder="Provide clear details on what happened (e.g. bus #104 delayed by 25 mins at Ramses station)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minLength={10}
                  maxLength={2000}
                />
                {validationErrors.description && (
                  <div className="field__error">{validationErrors.description}</div>
                )}
              </div>

              {/* Related Stop (Optional) */}
              <div className="field">
                <label className="field__label">Related Station / Stop (Optional)</label>
                <select
                  className="field__input"
                  value={relatedStopId}
                  onChange={(e) => {
                    setRelatedStopId(e.target.value)
                    const st = stops.find((s) => s.id === parseInt(e.target.value, 10))
                    if (st && st.latitude && st.longitude) {
                      setLatitude(String(st.latitude))
                      setLongitude(String(st.longitude))
                    }
                  }}
                >
                  <option value="">Select a known stop...</option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_en || s.name_ar} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates */}
              <div className="row" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Latitude *"
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    error={validationErrors.latitude}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Longitude *"
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    error={validationErrors.longitude}
                  />
                </div>
              </div>

              <div className="row-between">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleGetCurrentLocation}
                >
                  <Icon name="locate" size={14} aria-hidden="true" /> Auto-detect GPS Location
                </Button>
              </div>

              {/* Media URLs (up to 3) */}
              <div className="field">
                <div className="row-between">
                  <label className="field__label">Evidence Photos / URLs (Max 3)</label>
                  {mediaUrls.length < 3 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddMediaUrl}
                    >
                      + Add Photo URL
                    </Button>
                  )}
                </div>
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="row" style={{ gap: 8, marginTop: 4 }}>
                    <input
                      className="field__input"
                      type="url"
                      placeholder={`https://example.com/photo${idx + 1}.jpg`}
                      value={url}
                      onChange={(e) => handleMediaUrlChange(idx, e.target.value)}
                    />
                    {mediaUrls.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMediaUrl(idx)}
                        aria-label="Remove URL"
                      >
                        <Icon name="close" size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
