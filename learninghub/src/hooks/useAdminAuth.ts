import { useState, useEffect, useCallback } from 'react'
import {
  adminAuthService,
  type AdminUser,
  type AdminLoginRequest,
  type AdminPermission,
  type AdminRole,
} from '../services/adminAuthService'

interface UseAdminAuthReturn {
  // State
  admin: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: AdminLoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void

  // RBAC
  hasPermission: (permission: AdminPermission) => boolean
  hasAnyPermission: (permissions: AdminPermission[]) => boolean
  hasAllPermissions: (permissions: AdminPermission[]) => boolean
  hasRole: (role: AdminRole | AdminRole[]) => boolean
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize from storage on mount
  useEffect(() => {
    const storedAdmin = adminAuthService.getAdminUser()
    if (storedAdmin && adminAuthService.isAuthenticated()) {
      setAdmin(storedAdmin)
      setIsAuthenticated(true)
    }
  }, [])

  /**
   * Login with email/password
   */
  const login = useCallback(async (credentials: AdminLoginRequest): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAuthService.login(credentials)

      if (response.status === 'success') {
        setAdmin(adminAuthService.getAdminUser())
        setIsAuthenticated(true)
        return true
      }

      setError('Login failed')
      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Logout and clear session
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await adminAuthService.logout()
    } finally {
      setAdmin(null)
      setIsAuthenticated(false)
      setError(null)
      setIsLoading(false)
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * RBAC: Check if admin has specific permission
   */
  const hasPermission = useCallback(
    (permission: AdminPermission): boolean => {
      return adminAuthService.hasPermission(permission)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin]
  )

  /**
   * RBAC: Check if admin has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: AdminPermission[]): boolean => {
      return adminAuthService.hasAnyPermission(permissions)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin]
  )

  /**
   * RBAC: Check if admin has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: AdminPermission[]): boolean => {
      return adminAuthService.hasAllPermissions(permissions)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin]
  )

  /**
   * RBAC: Check if admin has required role
   */
  const hasRole = useCallback(
    (role: AdminRole | AdminRole[]): boolean => {
      return adminAuthService.hasRole(role)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin]
  )

  return {
    // State
    admin,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    logout,
    clearError,

    // RBAC
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  }
}
