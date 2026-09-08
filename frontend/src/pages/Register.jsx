import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { ApiError } from '../api/client'

/** Register — POST /auth/register (backend validates password confirmation, unique email). */
export default function Register() {
  const { t } = useI18n()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = async (event) => {
    event.preventDefault()
    setFieldErrors({})
    setSubmitting(true)
    try {
      await register(form)
      navigate('/home', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setFieldErrors(error.errors)
      } else {
        setFieldErrors({ email: error.message })
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-brand__logo" aria-hidden="true">
          <Icon name="bus" size={30} aria-hidden="true" />
        </div>
        <h1>Create account</h1>
        <p>Join Wasel Egypt</p>
      </div>

      <form onSubmit={onSubmit} className="stack" noValidate>
        <TextInput
          label="Full name"
          value={form.name}
          onChange={set('name')}
          error={fieldErrors.name?.[0]}
          autoComplete="name"
          required
        />
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email?.[0]}
          autoComplete="email"
          required
        />
        <TextInput
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          error={fieldErrors.phone?.[0]}
          autoComplete="tel"
        />
        <TextInput
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={fieldErrors.password?.[0]}
          hint="Min 8 characters"
          autoComplete="new-password"
          required
        />
        <TextInput
          label="Confirm password"
          type="password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={fieldErrors.password_confirmation?.[0]}
          autoComplete="new-password"
          required
        />
        <Button type="submit" block size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="auth-footer">
        Already registered? <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  )
}
