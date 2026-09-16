import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setToken, setUnauthorizedHandler } from '../api/client'
import * as authApi from '../api/auth'

export const AuthContext = createContext(null)

const USER_STORAGE_KEY = 'wasel.auth.user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  // Boot-flash fix (audit F3): when a cached user exists, render
  // optimistically as authenticated and revalidate in the background,
  // so protected routes don't flash a spinner on every reload.
  const [status, setStatus] = useState(() => (readStoredUser() ? 'authenticated' : 'loading'))

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser)
    storeUser(nextUser)
    setStatus(nextUser ? 'authenticated' : 'guest')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.fetchCurrentUser()
      applyUser(me)
      return me
    } catch {
      // Network failure: keep the cached user rather than logging out.
      return user
    }
  }, [applyUser, user])

  // Restore the session from the persisted token on first load.
  useEffect(() => {
    let cancelled = false
    authApi
      .fetchCurrentUser()
      .then((me) => {
        if (!cancelled) applyUser(me)
      })
      .catch(() => {
        if (!cancelled) setStatus(user ? 'authenticated' : 'guest')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // API client notifies this store when a 401 arrives mid-session.
  useEffect(() => {
    setUnauthorizedHandler(() => applyUser(null))
  }, [applyUser])

  const login = useCallback(
    async (credentials) => {
      const { user: nextUser } = await authApi.login(credentials)
      applyUser(nextUser)
      return nextUser
    },
    [applyUser]
  )

  const register = useCallback(
    async (payload) => {
      const { user: nextUser } = await authApi.register(payload)
      applyUser(nextUser)
      return nextUser
    },
    [applyUser]
  )

  const loginWithToken = useCallback(
    async (token) => {
      setToken(token)
      const me = await authApi.fetchCurrentUser()
      applyUser(me)
      return me
    },
    [applyUser]
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    applyUser(null)
  }, [applyUser])

  const value = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles.map((r) => r.name) : []
    return {
      user,
      status,
      isAuthenticated: status === 'authenticated' && !!user,
      isGuest: status === 'guest',
      isAdmin: roles.includes('admin'),
      isModerator: roles.includes('moderator') || roles.includes('admin'),
      login,
      register,
      loginWithToken,
      logout,
      refresh,
    }
  }, [user, status, login, register, loginWithToken, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
