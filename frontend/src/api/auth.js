import { apiRequest, getData, setToken } from './client'
import { endpoints } from './endpoints'

/**
 * Authentication endpoints. All payloads/shapes mirror the backend exactly:
 * register/login return { data: { user, token } }, auth/user returns { data: user }.
 */

export async function login({ email, password }) {
  const payload = await apiRequest(endpoints.auth.login, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  const { user, token } = payload.data
  setToken(token)
  return { user, token }
}

export async function register({ name, email, phone, password, password_confirmation }) {
  const payload = await apiRequest(endpoints.auth.register, {
    method: 'POST',
    body: { name, email, phone, password, password_confirmation },
    auth: false,
  })
  const { user, token } = payload.data
  setToken(token)
  return { user, token }
}

export async function logout() {
  try {
    await apiRequest(endpoints.auth.logout, { method: 'POST' })
  } finally {
    setToken(null)
  }
}

/** Fetch the authenticated user; null when the token is missing/invalid. */
export async function fetchCurrentUser() {
  if (!localStorage.getItem('wasel.auth.token')) return null
  try {
    return await getData(endpoints.auth.user)
  } catch (error) {
    if (error.isUnauthorized) {
      setToken(null)
      return null
    }
    throw error
  }
}

export async function forgotPassword(email) {
  return apiRequest(endpoints.auth.forgotPassword, {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export async function resetPassword({ email, token, password, password_confirmation }) {
  return apiRequest(endpoints.auth.resetPassword, {
    method: 'POST',
    body: { email, token, password, password_confirmation },
    auth: false,
  })
}
