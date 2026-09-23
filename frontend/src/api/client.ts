/**
 * HTTP Client for Wasel Egypt Laravel API v1.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  '/api/v1'
const TOKEN_STORAGE_KEY = 'wasel.auth.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]> | null
  data: any
  aborted?: boolean
  isValidation: boolean
  isConflict: boolean
  isUnauthorized: boolean
  isForbidden: boolean
  isNotFound: boolean

  constructor(status: number, message: string, { errors = null, data = null }: { errors?: any, data?: any } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.data = data
    this.isValidation = status === 422
    this.isConflict = status === 409
    this.isUnauthorized = status === 401
    this.isForbidden = status === 403
    this.isNotFound = status === 404
  }
}

function buildUrl(path: string, query?: Record<string, any>): string {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') {
      params.append(k, String(v))
    }
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function apiRequest<T = any>(
  path: string,
  {
    method = 'GET',
    body,
    query,
    auth = true,
    signal,
  }: {
    method?: string
    body?: any
    query?: Record<string, any>
    auth?: boolean
    signal?: AbortSignal
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const err = new ApiError(0, 'Request aborted')
      err.aborted = true
      throw err
    }
    throw new ApiError(0, e?.message || 'Network connection failed')
  }

  const text = await response.text()
  let parsed: any = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { raw: text }
  }

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized()
    }
    const message = parsed?.message || `Request failed with status ${response.status}`
    throw new ApiError(response.status, message, {
      errors: parsed?.errors,
      data: parsed?.data,
    })
  }

  return (parsed?.data !== undefined ? parsed.data : parsed) as T
}
