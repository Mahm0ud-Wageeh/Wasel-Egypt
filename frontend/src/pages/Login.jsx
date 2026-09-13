import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { LogoMark } from '../components/ui/Logo'
import { AuthLayout } from '../components/layout/AuthLayout'
import { ApiError } from '../api/client'

/** Login — POST /auth/login; 401 renders an inline error alert. */
export default function Login() {
  const { t } = useI18n()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from ?? '/home'

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await login(form)
      // Forward any carried router state (e.g. planner prefillStop) so
      // post-login landings (like /search) can honor the original intent.
      const { from: _from, ...rest } = location.state ?? {}
      navigate(from, { replace: true, ...(Object.keys(rest).length > 0 ? { state: rest } : {}) })
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.errors ?? {})
        if (!error.errors) {
          setFormError(
            error.isUnauthorized ? 'Invalid credentials. Try again.' : error.message
          )
        }
      } else {
        setFormError('Unexpected error. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-brand__logo" aria-hidden="true">
          <LogoMark size={56} />
        </div>
        <h1>{t('auth.welcome')}</h1>
        <p>{t('auth.subtitle')}</p>
      </div>

      {formError && (
        <Alert severity="error" title="Login failed">
          {formError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="stack" noValidate>
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErrors.email?.[0]}
          autoComplete="email"
          required
        />
        <TextInput
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={fieldErrors.password?.[0]}
          autoComplete="current-password"
          required
        />
        <Button type="submit" block size="lg" loading={submitting}>
          Log in
        </Button>
      </form>

      <Link to="/forgot-password" style={{ textAlign: 'center' }}>
        Forgot password?
      </Link>
      <p className="auth-footer">
        New to Wasel? <Link to="/register">{t('auth.register')}</Link>
      </p>
    </div>
    </AuthLayout>
  )
}
