import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { AuthLayout } from '../components/layout/AuthLayout'
import { resetPassword } from '../api/auth'
import { ApiError } from '../api/client'

/** Reset password — POST /auth/reset-password (email + token come from the email link). */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    email: searchParams.get('email') ?? '',
    password: '',
    password_confirmation: '',
  })
  const [done, setDone] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await resetPassword({
        email: form.email,
        token: searchParams.get('token') ?? '',
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError && error.errors) setFieldErrors(error.errors)
      else setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthLayout>
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="auth-brand__logo" aria-hidden="true"><Icon name="success" size={22} /></div>
          <h1>Password updated</h1>
        </div>
        <Alert severity="success" title="Success">
          Your password has been reset. You can log in with the new password.
        </Alert>
        <p className="auth-footer">
          <Link to="/login">Go to login</Link>
        </p>
      </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-brand__logo" aria-hidden="true"><Icon name="key" size={22} /></div>
        <h1>Reset password</h1>
      </div>

      {formError && (
        <Alert severity="error" title="Reset failed">
          {formError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="stack" noValidate>
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email?.[0]}
          required
        />
        <TextInput
          label="New password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={fieldErrors.password?.[0]}
          autoComplete="new-password"
          required
        />
        <TextInput
          label="Confirm new password"
          type="password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={fieldErrors.password_confirmation?.[0]}
          autoComplete="new-password"
          required
        />
        <Button type="submit" block size="lg" loading={submitting}>
          Reset password
        </Button>
      </form>
    </div>
    </AuthLayout>
  )
}
