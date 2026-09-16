import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { LogoMark } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Feedback'
import { Alert } from '../components/ui/Alert'
import { AuthLayout } from '../components/layout/AuthLayout'

/**
 * OAuth Callback landing page — receives ?token=...&provider=... from backend
 * SocialAuthController, authenticates the session, and navigates to the app.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const { t } = useI18n()
  const [error, setError] = useState(null)

  useEffect(() => {
    // Read from URL hash fragment (#token=...&provider=...) first to prevent tokens
    // being logged in server access logs / referrers; fallback to searchParams.
    const hashText = window.location.hash ? window.location.hash.replace(/^#/, '') : ''
    const hashParams = new URLSearchParams(hashText)
    const token = hashParams.get('token') || searchParams.get('token')
    const err = hashParams.get('error') || searchParams.get('error')

    if (err) {
      setError(err === 'oauth_not_configured' ? t('auth.oauth_not_configured') : (decodeURIComponent(err) || t('auth.oauth_failed')))
      const timer = setTimeout(() => {
        navigate('/login', { replace: true, state: { error: err } })
      }, 3000)
      return () => clearTimeout(timer)
    }

    if (!token) {
      setError(t('auth.oauth_failed'))
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2500)
      return () => clearTimeout(timer)
    }

    let cancelled = false
    loginWithToken(token)
      .then(() => {
        if (!cancelled) {
          const redirectTo = sessionStorage.getItem('wasel.auth_redirect') || '/home'
          sessionStorage.removeItem('wasel.auth_redirect')
          navigate(redirectTo, { replace: true })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || t('auth.oauth_failed'))
          setTimeout(() => navigate('/login', { replace: true }), 3000)
        }
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, loginWithToken, navigate, t])

  return (
    <AuthLayout>
      <div className="auth-shell" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div className="auth-brand">
          <div className="auth-brand__logo" aria-hidden="true" style={{ margin: '0 auto 16px' }}>
            <LogoMark size={56} />
          </div>
          <h1>{t('app.name')}</h1>
          <p style={{ marginTop: 8 }}>{error ? t('error.generic') : t('auth.logging_in')}</p>
        </div>

        {error ? (
          <Alert severity="error" title={t('common.notice')}>
            {error}
          </Alert>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
