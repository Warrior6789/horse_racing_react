import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { logout as apiLogout, getMe } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe()
      console.log('[auth/me] response:', res.data)
      const me = res.data?.data || res.data || {}
      setUser(prev => {
        const next = { ...prev, requestedRole: me.requestedRole ?? null }
        localStorage.setItem('user', JSON.stringify(next))
        return next
      })
    } catch (err) {
      console.error('[auth/me] error:', err?.response?.status, err?.response?.data)
    }
  }, [])

  useEffect(() => {
    if (token) refreshUser()
  }, [token])

  const login = (tokenValue, userData) => {
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
  }

  const updateUser = (patch) => {
    setUser(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, refreshUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
