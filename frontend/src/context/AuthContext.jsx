import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [accountStatus, setAccountStatus] = useState(null) // 'active', 'disabled', 'archived'
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setRole(null)
      setProfile(null)
      setAccountStatus(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/api/auth/me')
      setUser(response.data.user)
      setRole(response.data.role)
      setProfile(response.data.profile)
      setAccountStatus(response.data.accountStatus || 'active')
    } catch (err) {
      setUser(null)
      setRole(null)
      setProfile(null)
      setAccountStatus(null)
      setError(err?.response?.data?.message || 'Unable to load session.')
      localStorage.removeItem('token')
      localStorage.removeItem('role')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setUser(null)
    setRole(null)
    setProfile(null)
    setAccountStatus(null)
    setError('')
  }, [])

  const value = useMemo(
    () => ({ user, role, profile, accountStatus, isLoading, error, refreshAuth, logout }),
    [user, role, profile, accountStatus, isLoading, error, refreshAuth, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
