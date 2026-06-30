import { fetchApi } from '../utils/api'
import { SecureStorage } from '../utils/security'

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

let memoryToken: string | null = null
let memoryUser: AdminUser | null = null

async function loadFromStorage(): Promise<void> {
  memoryToken ??= await SecureStorage.getItem(ADMIN_TOKEN_KEY)
  if (!memoryUser) {
    const raw = await SecureStorage.getItem(ADMIN_USER_KEY)
    if (raw) {
      try {
        memoryUser = JSON.parse(raw) as AdminUser
      } catch {
        memoryUser = null
      }
    }
  }
}

export const adminAuthService = {
  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = (await fetchApi('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })) as AdminLoginResponse

    if (response.status === 'success') {
      const userData = response.data.user
      const role = userData.role?.toLowerCase() as AdminRole
      const validRole = (
        ['admin', 'superadmin', 'moderator'].includes(role) ? role : 'admin'
      ) as AdminRole

      const token =
        (response.data as unknown as Record<string, string>).access_token ?? response.data.token

      const user: AdminUser = {
        ...userData,
        role: validRole,
        permissions: ROLE_PERMISSIONS[validRole] || [],
        isActive: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      memoryToken = token
      memoryUser = user

      await Promise.all([
        SecureStorage.setItem(ADMIN_TOKEN_KEY, token),
        SecureStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user)),
      ])
    }

    return response
  },

  async logout(): Promise<void> {
    this.clearSession()
  },

  getAdminUser(): AdminUser | null {
    return memoryUser
  },

  getToken(): string | null {
    return memoryToken
  },

  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false
    try {
      const [, payload] = token.split('.')
      if (!payload) return false
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const pad = base64.length % 4
      const padded = pad ? base64 + '='.repeat(4 - pad) : base64
      const decoded = JSON.parse(atob(padded))
      return typeof decoded.exp === 'number' ? decoded.exp * 1000 > Date.now() : false
    } catch {
      return false
    }
  },

  async clearSession(): Promise<void> {
    memoryToken = null
    memoryUser = null
    await Promise.all([
      SecureStorage.removeItem(ADMIN_TOKEN_KEY),
      SecureStorage.removeItem(ADMIN_USER_KEY),
    ])
  },

  async initFromStorage(): Promise<void> {
    await loadFromStorage()
  },

  hasPermission(permission: AdminPermission): boolean {
    const user = this.getAdminUser()
    if (!user) return false
    return user.permissions?.includes(permission) || false
  },

  hasAnyPermission(permissions: AdminPermission[]): boolean {
    return permissions.some(p => this.hasPermission(p))
  },

  hasAllPermissions(permissions: AdminPermission[]): boolean {
    return permissions.every(p => this.hasPermission(p))
  },

  hasRole(role: AdminRole | AdminRole[]): boolean {
    const user = this.getAdminUser()
    if (!user) return false
    if (Array.isArray(role)) return role.includes(user.role as AdminRole)
    return user.role === role
  },
}
