/**
 * HTTP client for the Wasel Egypt Laravel API.
 *
 * Backend responses follow one envelope:
 *   { success, message?, data?, errors?, meta? }
 *
 * Every non-2xx response is thrown as an ApiError with:
 *   status   – HTTP status code
 *   message  – human-readable message (backend `message` or fallback)
 *   errors   – field errors object (422) e.g. { email: ['...'] }
 *   data     – payload on backend-reported failures that include it
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const TOKEN_STORAGE_KEY = 'wasel.auth.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* storage unavailable — session-only auth */
  }
}

/** Called on 401 so the auth store can reset its state. */
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(status, message, { errors, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors ?? null
    this.data = data ?? null
    this.isValidation = status === 422
    this.isConflict = status === 409
    this.isUnauthorized = status === 401
    this.isForbidden = status === 403
    this.isNotFound = status === 404
  }
}

function buildUrl(path, query) {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString()
  return qs ? `${url}?${qs}` : url
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

/**
 * Perform an API request.
 * @param {string} path Endpoint path (from endpoints.js), relative to the API base.
 * @param {{method?: string, body?: object, query?: object, auth?: boolean, signal?: AbortSignal}} options
 * @returns {Promise<object>} parsed response body
 */
export async function apiRequest(path, { method = 'GET', body, query, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(signal ? { signal } : {}),
    })
  } catch (e) {
    if (e?.name === 'AbortError') {
      const aborted = new ApiError(0, 'Request aborted.')
      aborted.aborted = true
      throw aborted
    }
    throw new ApiError(0, 'Network unreachable. Check your connection and try again.')
  }

  const payload = await parseBody(response)

  if (response.ok) return payload

  // Session revoked / token expired → reset auth state.
  if (response.status === 401 && auth && onUnauthorized) {
    onUnauthorized()
  }

  const message =
    payload?.message ??
    (response.status === 0
      ? 'Network unreachable.'
      : `Request failed with status ${response.status}.`)

  throw new ApiError(response.status, message, {
    errors: payload?.errors,
    data: payload?.data,
  })
}

/** GET helper that unwraps the standard `{ data }` envelope. */
export async function getData(path, options) {
  const payload = await apiRequest(path, options)
  return payload?.data ?? payload
}
