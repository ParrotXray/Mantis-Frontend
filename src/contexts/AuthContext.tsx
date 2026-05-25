import React, { createContext, useState, useCallback, useEffect, useContext } from 'react'
import { useRouter } from 'next/router'
import { setAuthToken } from '../utils/authStore'
import { urls, TokenKey } from '../config'

export interface UserInfo {
  id: string
  username: string
  role: string
}

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: true,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TokenKey)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const applyToken = useCallback(async (t: string): Promise<boolean> => {
    try {
      const res = await fetch(urls.auth.me, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data: UserInfo = await res.json()
        setAuthToken(t)
        setToken(t)
        setUser(data)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const issueToken = useCallback(async (rawToken: string) => {
    localStorage.setItem(TokenKey, rawToken)
    const valid = await applyToken(rawToken)
    if (!valid) throw new Error('Token validation failed')
  }, [applyToken])

  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await fetch(urls.auth.status)
        if (statusRes.ok) {
          const { initialized } = await statusRes.json()
          setIsInitialized(initialized)
          if (!initialized) {
            setIsLoading(false)
            return
          }
        }
      } catch {
        // If status endpoint fails, assume initialized
      }

      const stored = localStorage.getItem(TokenKey)
      if (stored) {
        const valid = await applyToken(stored)
        if (!valid) clearAuth()
      }
      setIsLoading(false)
    }
    init()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(urls.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.status === 501) {
      setAuthToken('disabled')
      setToken('disabled')
      setUser({ id: 'guest', username: 'Guest', role: 'admin' })
      return
    }
    if (!res.ok) throw new Error('Invalid credentials')
    const { token: newToken } = await res.json()
    await issueToken(newToken)
  }, [issueToken])

  const register = useCallback(async (username: string, password: string) => {
    const res = await fetch(urls.auth.register, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Registration failed')
      throw new Error(msg)
    }
    const { token: newToken } = await res.json()
    setIsInitialized(true)
    await issueToken(newToken)
  }, [issueToken])

  const logout = useCallback(() => {
    if (token && token !== 'disabled') {
      fetch(urls.auth.logout, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    clearAuth()
  }, [token, clearAuth])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isInitialized,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const PUBLIC_ROUTES = ['/login', '/setup']

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isInitialized && router.pathname !== '/setup') {
      router.replace('/setup')
      return
    }
    if (isInitialized && !isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
      router.replace('/login')
    }
  }, [isAuthenticated, isInitialized, isLoading, router.pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!isInitialized && router.pathname !== '/setup') return null
  if (isInitialized && !isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) return null

  return <>{children}</>
}
