import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest, getToken, setToken, setUnauthorizedHandler } from '../api/client'
import { endpoints } from '../api/endpoints'

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  roles?: { id: number, name: string }[]
  status?: string
  created_at?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await apiRequest<any>(endpoints.auth.user, { method: 'GET' })
      const u = res?.data || res
      setUser(u)
    } catch {
      // If failed, token might be invalid or backend unreachable
      setUser(null)
      setToken(null)
      setTokenState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const currentToken = getToken()
    if (currentToken) {
      setTokenState(currentToken)
    }
    setUnauthorizedHandler(() => {
      setToken(null)
      setTokenState(null)
      setUser(null)
    })
    fetchCurrentUser()
  }, [fetchCurrentUser])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await apiRequest<any>(endpoints.auth.login, {
        method: 'POST',
        body: { email, password },
        auth: false,
      })
      const data = res?.data || res
      const newToken = data?.token || data?.access_token || res?.token || res?.access_token
      if (newToken) {
        setToken(newToken)
        setTokenState(newToken)
      }
      const u = data?.user || res?.user
      if (u) {
        setUser(u)
      } else {
        await fetchCurrentUser()
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, phone?: string) => {
    setLoading(true)
    try {
      const res = await apiRequest<any>(endpoints.auth.register, {
        method: 'POST',
        body: { name, email, password, password_confirmation: password, phone },
        auth: false,
      })
      const data = res?.data || res
      const newToken = data?.token || data?.access_token || res?.token || res?.access_token
      if (newToken) {
        setToken(newToken)
        setTokenState(newToken)
      }
      const u = data?.user || res?.user
      if (u) {
        setUser(u)
      } else {
        await fetchCurrentUser()
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiRequest(endpoints.auth.logout, { method: 'POST' })
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken(null)
      setTokenState(null)
      setUser(null)
      try {
        localStorage.removeItem('wasel.activeJourney.v1')
        localStorage.removeItem('wasel.saved_trips')
        localStorage.removeItem('wasel.wallet.balance')
        localStorage.removeItem('wasel.lastSearch.v1')
      } catch { /* ignore */ }
    }
  }

  const isAdmin = Boolean(
    user?.roles?.some(r => r.name === 'admin' || (r as any) === 'admin') ||
    user?.email === 'admin@example.com'
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: Boolean(user || token),
        isAdmin,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
