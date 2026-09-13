import { useI18n } from '../i18n/LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Feedback'
import {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getUserTrustScore,
} from '../api/users'

export default function Profile() {
  const { t } = useI18n()
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [updatedUser, setUpdatedUser] = useState(null)
  const [trust, setTrust] = useState(null)
  const [preferences, setPreferences] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Edit user profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  // Notification & Transit preferences state
  const [notifyDeviation, setNotifyDeviation] = useState(true)
  const [notifyRecovery, setNotifyRecovery] = useState(true)
  const [notifyReports, setNotifyReports] = useState(true)
  const [notifyServiceAlerts, setNotifyServiceAlerts] = useState(true)
  const [quietHours, setQuietHours] = useState(false)
  const [quietStart, setQuietStart] = useState('22:00:00')
  const [quietEnd, setQuietEnd] = useState('07:00:00')

  // Routing preferences (synced with client & storage)
  const [walkSpeed, setWalkSpeed] = useState('average')
  const [wheelchair, setWheelchair] = useState(false)
  const [maxWalk, setMaxWalk] = useState(1500)
  const [maxTransfers, setMaxTransfers] = useState(3)

  const fetchProfileData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const [profileData, trustData, prefsData] = await Promise.all([
        getUserProfile(user.id).catch(() => null),
        getUserTrustScore(user.id).catch(() => null),
        getUserPreferences(user.id).catch(() => ({})),
      ])
      if (profileData) {
        setUpdatedUser(profileData?.data ?? profileData)
      }
      setTrust(trustData)
      const prefs = prefsData?.data ?? prefsData ?? {}
      setPreferences(prefs)

      // Sync state from preferences
      if (prefs) {
        if (prefs.notify_deviation_detected !== undefined) setNotifyDeviation(prefs.notify_deviation_detected)
        if (prefs.notify_recovery_available !== undefined) setNotifyRecovery(prefs.notify_recovery_available)
        if (prefs.notify_report_status_change !== undefined) setNotifyReports(prefs.notify_report_status_change)
        if (prefs.notify_service_alert_affected !== undefined) setNotifyServiceAlerts(prefs.notify_service_alert_affected)
        if (prefs.quiet_hours_enabled !== undefined) setQuietHours(prefs.quiet_hours_enabled)
        if (prefs.quiet_hours_start) setQuietStart(prefs.quiet_hours_start)
        if (prefs.quiet_hours_end) setQuietEnd(prefs.quiet_hours_end)
      }

      // Load client transit prefs from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('wasel.transit_prefs') || '{}')
        if (saved.walkSpeed) setWalkSpeed(saved.walkSpeed)
        if (saved.wheelchair !== undefined) setWheelchair(saved.wheelchair)
        if (saved.maxWalk) setMaxWalk(saved.maxWalk)
        if (saved.maxTransfers !== undefined) setMaxTransfers(saved.maxTransfers)
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err.message || t('profile.load_error'))
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await updateUserProfile(user.id, {
        name,
        phone: phone || null,
      })
      const nextU = res?.data ?? res ?? { name, phone }
      setUpdatedUser(nextU)
      if (refreshUser) await refreshUser()
      setIsEditingProfile(false)
      setSuccessMsg(t('profile.updated'))
    } catch (err) {
      setError(err.message || t('profile.update_error'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async (e) => {
    e.preventDefault()
    setSavingPrefs(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await updateUserPreferences(user.id, {
        notify_deviation_detected: notifyDeviation,
        notify_recovery_available: notifyRecovery,
        notify_report_status_change: notifyReports,
        notify_service_alert_affected: notifyServiceAlerts,
        quiet_hours_enabled: quietHours,
        ...(quietHours ? { quiet_hours_start: quietStart, quiet_hours_end: quietEnd } : {}),
      })

      // Save routing preferences locally
      localStorage.setItem(
        'wasel.transit_prefs',
        JSON.stringify({
          walkSpeed,
          wheelchair,
          maxWalk,
          maxTransfers,
        })
      )

      setSuccessMsg(t('profile.preferences_saved'))
    } catch (err) {
      setError(err.message || t('profile.preferences_error'))
    } finally {
      setSavingPrefs(false)
    }
  }

  const getTrustBadgeLevel = (score) => {
    const s = Number(score) || 0
    if (s >= 90) return { label: t('profile.legend'), color: 'badge--verified' }
    if (s >= 75) return { label: t('profile.scout'), color: 'badge--active' }
    if (s >= 50) return { label: t('profile.commuter'), color: 'badge--pending' }
    return { label: t('profile.contributor'), color: 'badge--neutral' }
  }

  if (loading) {
    return (
      <div className="app-shell__page">
        <Skeleton height={120} />
        <Skeleton height={140} />
        <Skeleton height={200} />
      </div>
    )
  }

  const displayUser = { ...(user || {}), ...(updatedUser || {}) }
  const trustScore = trust?.score ?? trust?.trust_score ?? 100
  const trustBadge = getTrustBadgeLevel(trustScore)

  return (
    <div className="app-shell__page">
      {/* Header */}
      <div className="page-head">
        <h1 className="t-h1" style={{ color: 'var(--p900)', margin: 0 }}> {t('profile.account_title')} </h1>
        <p className="t-caption" style={{ marginTop: 2 }}> {t('profile.subtitle')} </p>
      </div>

      {successMsg && (
        <Alert severity="success" title={t('common.success')}>
          {successMsg}
        </Alert>
      )}

      {error && (
        <Alert severity="error" title={t('common.notice')}>
          {error}
        </Alert>
      )}

      {/* Identity Card */}
      <Card flat className="profile-identity" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row-between">
          <div className="row" style={{ gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--p100)',
                color: 'var(--p700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {displayUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink900)' }}>{displayUser?.name}</b>
              <div className="t-caption">{displayUser?.email}</div>
              {displayUser?.phone && <div className="t-caption"><Icon name="phone" size={12} aria-hidden="true" /> {displayUser.phone}</div>}
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsEditingProfile(!isEditingProfile)
              setName(displayUser?.name || '')
              setPhone(displayUser?.phone || '')
            }}
          >
            {isEditingProfile ? t('action.cancel') : t('profile.edit')}
          </Button>
        </div>

        {/* Roles */}
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {(displayUser?.roles ?? [{ name: 'User' }]).map((r) => (
            <span key={r.id || r.name} className="badge badge--neutral">
              {['admin', 'moderator', 'user', 'passenger'].includes(r.name.toLowerCase()) ? t('common.role.' + r.name.toLowerCase()) : r.name}
            </span>
          ))}
        </div>

        {/* Inline Edit Form */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="stack-sm" style={{ marginTop: 8 }}>
            <Input
              label={t('profile.full_name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label={t('profile.phone_number')}
              value={phone}
              placeholder="+20 100 123 4567"
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingProfile(false)}
              > {t('action.cancel')} </Button>
              <Button type="submit" size="sm" variant="primary" loading={savingProfile}> {t('profile.save_profile')} </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Trust Score Card */}
      <Card
        flat
        style={{
          borderLeft: '4px solid var(--s700)',
          background: 'var(--s50)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div className="row-between">
          <div>
            <b style={{ fontSize: 14, color: 'var(--s700)' }}>{t('profile.trust_title')}</b>
            <div className="t-caption">{t('profile.trust_body')}</div>
          </div>
          <span className={`badge ${trustBadge.color}`}>{trustBadge.label}</span>
        </div>

        <div className="row" style={{ gap: 16, marginTop: 4 }}>
          <div>
            <span className="t-display t-num" style={{ color: 'var(--s700)', fontSize: 32 }}>
              {trustScore}
            </span>
            <span className="t-caption" style={{ color: 'var(--ink500)' }}>
              / 100
            </span>
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink700)' }}>
            <div>
              <Icon name="success" size={14} aria-hidden="true" /> <b>{trust?.verified_reports_count ?? trust?.verified_count ?? 0}</b> {t('profile.verified_reports')} </div>
            <div>
              <Icon name="close" size={14} aria-hidden="true" /> <b>{trust?.rejected_reports_count ?? trust?.rejected_count ?? 0}</b> {t('reports.status.rejected')} </div>
          </div>
        </div>
      </Card>

      {/* Preferences Form */}
      <Card flat style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <b style={{ fontSize: 15, color: 'var(--p900)' }}>{t('profile.preferences_title')}</b>
          <p className="t-caption" style={{ marginTop: 2 }}> {t('profile.preferences_body')} </p>
        </div>

        <form onSubmit={handleSavePreferences} className="stack">
          {/* Notification Toggles */}
          <div className="stack-sm">
            <b style={{ fontSize: 13 }}>{t('profile.notification_heading')}</b>

            <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
              <input
                type="checkbox"
                checked={notifyDeviation}
                onChange={(e) => setNotifyDeviation(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>{t('profile.notify_deviation')}</span>
            </label>

            <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
              <input
                type="checkbox"
                checked={notifyRecovery}
                onChange={(e) => setNotifyRecovery(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>{t('profile.notify_recovery')}</span>
            </label>

            <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
              <input
                type="checkbox"
                checked={notifyReports}
                onChange={(e) => setNotifyReports(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>{t('profile.notify_reports')}</span>
            </label>

            <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
              <input
                type="checkbox"
                checked={notifyServiceAlerts}
                onChange={(e) => setNotifyServiceAlerts(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>{t('profile.notify_service')}</span>
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="stack-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
              />
              <b style={{ fontSize: 13 }}>{t('profile.quiet_hours')}</b>
            </label>

            {quietHours && (
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label={t('landing.from')}
                    type="time"
                    value={quietStart.slice(0, 5)}
                    onChange={(e) => setQuietStart(`${e.target.value}:00`)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label={t('landing.to')}
                    type="time"
                    value={quietEnd.slice(0, 5)}
                    onChange={(e) => setQuietEnd(`${e.target.value}:00`)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Routing Defaults */}
          <div className="stack-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <b style={{ fontSize: 13 }}>{t('profile.routing_defaults')}</b>

            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Select
                  label={t('profile.walking_speed')}
                  value={walkSpeed}
                  onChange={(e) => setWalkSpeed(e.target.value)}
                >
                  <option value="slow">{t('profile.slow')}</option>
                  <option value="average">{t('profile.average')}</option>
                  <option value="fast">{t('profile.fast')}</option>
                </Select>
              </div>

              <div style={{ flex: 1, minWidth: 140 }}>
                <Input
                  label={t('profile.max_walk')}
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={maxWalk}
                  onChange={(e) => setMaxWalk(Number(e.target.value))}
                />
              </div>
            </div>

            <label className="row" style={{ cursor: 'pointer', gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                checked={wheelchair}
                onChange={(e) => setWheelchair(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>{t('profile.wheelchair')}</span>
            </label>
          </div>

          <Button type="submit" variant="primary" loading={savingPrefs}> {t('profile.save_preferences')} </Button>
        </form>
      </Card>

      {/* Logout button */}
      <Button
        block
        variant="ghost"
        style={{ color: 'var(--e700)' }}
        onClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      > {t('profile.sign_out')} </Button>
    </div>
  )
}
