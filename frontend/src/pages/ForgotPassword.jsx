import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Icon } from '../components/ui/Icon'
import { forgotPassword } from '../api/auth'
import { ApiError } from '../api/client'

/** Forgot password — POST /auth/forgot-password; shows the success confirmation. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (error) {
      if (error instanceof ApiError && error.errors) setFieldErrors(error.errors)
      else setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="auth-brand__logo" aria-hidden="true"><Icon name="key" size={22} /></div>
          <h1>Check your email</h1>
        </div>
        <Alert severity="success" title="Link sent">
          We emailed a reset link to {email}. It expires soon.
        </Alert>
        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-brand__logo" aria-hidden="true"><Icon name="key" size={22} /></div>
        <h1>Forgot password</h1>
        <p>We will email you a reset link</p>
      </div>

      {formError && (
        <Alert severity="error" title="Request failed">
          {formError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="stack" noValidate>
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email?.[0]}
          autoComplete="email"
          required
        />
        <Button type="submit" block size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="auth-footer">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  )
}
