import { fetchApi } from '../utils/api'

export type AdminRole = 'admin' | 'superadmin' | 'moderator'
export type AdminPermission =
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'courses.read'
  | 'courses.write'
  | 'courses.delete'
  | 'analytics.read'
  | 'settings.read'
  | 'settings.write'
  | 'system.read'
  | 'system.write'
  | 'audit.read'

export interface AdminUser {
  id: string
  email: string
  username: string
  role: AdminRole
  permissions: AdminPermission[]
  isActive: boolean
  lastLogin?: string
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminLoginResponse {
  status: string
  data: {
    token: string
    user: {
      id: string
      email: string
      username: string
      role: string
    }
  }
}

// Permission matrix for roles
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [
    'users.read',
    'users.write',
    'users.delete',
    'courses.read',
    'courses.write',
    'courses.delete',
    'analytics.read',
    'settings.read',
    'settings.write',
    'system.read',
    'system.write',
    'audit.read',
  ],
  admin: [
    'users.read',
    'users.write',
    'courses.read',
    'courses.write',
    'courses.delete',
    'analytics.read',
    'settings.read',
    'audit.read',
  ],
  moderator: ['users.read', 'courses.read', 'courses.write', 'analytics.read'],
}

const ADMIN_TOKEN_KEY = 'adminToken'
const ADMIN_USER_KEY = 'adminUser'

export const adminAuthService = {
  /**
   * Login as admin with email/password
   */
  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = (await fetchApi('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })) as AdminLoginResponse

    if (response.status === 'success') {
      const userData = response.data.user
      const role = userData.role?.toLowerCase() as AdminRole
      const validRole = ['admin', 'superadmin', 'moderator'].includes(role) ? role : 'admin'

      const token =
        (response.data as unknown as Record<string, string>).access_token ?? response.data.token

      localStorage.setItem(ADMIN_TOKEN_KEY, token)
      localStorage.setItem(
        ADMIN_USER_KEY,
        JSON.stringify({
          ...userData,
          role: validRole,
          permissions: ROLE_PERMISSIONS[validRole] || [],
          isActive: true,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )
    }

    return response
  },

  /**
   * Logout admin and clear session
   */
  async logout(): Promise<void> {
    // For JWT, we just clear local storage (token will expire)
    this.clearSession()
  },

  /**
   * Get current admin from storage
   */
  getAdminUser(): AdminUser | null {
    try {
      const user = localStorage.getItem(ADMIN_USER_KEY)
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  },

  /**
   * Get admin token
   */
  getToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  },

  /**
   * Check if admin is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  /**
   * Clear all admin session data
   */
  clearSession(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
  },

  /**
   * Check if admin has specific permission
   */
  hasPermission(permission: AdminPermission): boolean {
    const user = this.getAdminUser()
    if (!user) return false
    return user.permissions?.includes(permission) || false
  },

  /**
   * Check if admin has any of the specified permissions
   */
  hasAnyPermission(permissions: AdminPermission[]): boolean {
    return permissions.some(p => this.hasPermission(p))
  },

  /**
   * Check if admin has all of the specified permissions
   */
  hasAllPermissions(permissions: AdminPermission[]): boolean {
    return permissions.every(p => this.hasPermission(p))
  },

  /**
   * Check if admin has required role
   */
  hasRole(role: AdminRole | AdminRole[]): boolean {
    const user = this.getAdminUser()
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role as AdminRole)
    }
    return user.role === role
  },
}
