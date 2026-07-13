import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminAuthService, AdminLoginRequest } from './adminAuthService'
import { fetchApi } from '../utils/api'
import { SecureStorage } from '../utils/security'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

vi.mock('../utils/security', () => ({
  SecureStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

describe('adminAuthService', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    await adminAuthService.clearSession()
  })

  describe('login', () => {
    it('successfully logs in and stores user data (token handled via httpOnly cookie)', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          user: { id: '1', email: 'admin@test.com', username: 'admin', role: 'admin' },
        },
      }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

      const credentials: AdminLoginRequest = { email: 'admin@test.com', password: 'password' }
      const response = await adminAuthService.login(credentials)

      expect(fetchApi).toHaveBeenCalledWith('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      expect(response).toEqual(mockResponse)
      expect(SecureStorage.setItem).toHaveBeenCalledWith(
        'adminUser',
        expect.stringContaining('"id":"1"')
      )
      // Tokens are no longer mirrored to local storage — they live in httpOnly cookies
      expect(SecureStorage.setItem).not.toHaveBeenCalledWith('adminToken', expect.anything())

      const user = adminAuthService.getAdminUser()
      expect(user?.role).toBe('admin')
      expect(user?.permissions).toContain('users.read')
    })

    it('handles unexpected roles gracefully', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          user: { id: '1', email: 'test@test.com', username: 'test', role: 'unknown_role' },
        },
      }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

      await adminAuthService.login({ email: 'test', password: 'password' })
      const user = adminAuthService.getAdminUser()
      // fallback to 'admin' role if unknown
      expect(user?.role).toBe('admin')
    })
  })

  describe('logout and clearSession', () => {
    it('clears session from memory and storage', async () => {
      await adminAuthService.logout()
      expect(SecureStorage.removeItem).toHaveBeenCalledWith('adminUser')
      expect(adminAuthService.getToken()).toBeNull()
      expect(adminAuthService.getAdminUser()).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns false if no user is present', () => {
      expect(adminAuthService.isAuthenticated()).toBe(false)
    })

    it('returns true once a user is loaded into memory', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          user: { id: '1', email: 'admin@test.com', username: 'admin', role: 'admin' },
        },
      }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)
      await adminAuthService.login({ email: 'admin@test.com', password: 'password' })
      expect(adminAuthService.isAuthenticated()).toBe(true)
    })
  })

  describe('Role and Permission checks', () => {
    beforeEach(async () => {
      const mockResponse = {
        status: 'success',
        data: {
          user: { id: '1', email: 'super@test.com', username: 'super', role: 'superadmin' },
        },
      }
      vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)
      await adminAuthService.login({ email: 'super@test.com', password: 'password' })
    })

    it('checks roles', () => {
      expect(adminAuthService.hasRole('superadmin')).toBe(true)
      expect(adminAuthService.hasRole('admin')).toBe(false)
      expect(adminAuthService.hasRole(['admin', 'superadmin'])).toBe(true)
    })

    it('checks permissions', () => {
      expect(adminAuthService.hasPermission('system.write')).toBe(true)
      // @ts-expect-error testing invalid permission
      expect(adminAuthService.hasPermission('unknown.permission')).toBe(false)
    })

    it('checks any permission', () => {
      // @ts-expect-error testing invalid permission
      expect(adminAuthService.hasAnyPermission(['system.write', 'unknown.permission'])).toBe(true)
      // @ts-expect-error testing invalid permission
      expect(adminAuthService.hasAnyPermission(['unknown1', 'unknown2'])).toBe(false)
    })

    it('checks all permissions', () => {
      expect(adminAuthService.hasAllPermissions(['system.write', 'users.read'])).toBe(true)
      expect(
        // @ts-expect-error testing invalid permission
        adminAuthService.hasAllPermissions(['system.write', 'unknown.permission'])
      ).toBe(false)
    })
  })

  describe('initFromStorage', () => {
    it('loads user from storage', async () => {
      const mockUser = { id: '1', role: 'moderator' }
      vi.mocked(SecureStorage.getItem).mockImplementation(async key => {
        if (key === 'adminUser') return JSON.stringify(mockUser)
        return null
      })

      await adminAuthService.initFromStorage()
      expect(adminAuthService.getAdminUser()?.role).toBe('moderator')
    })

    it('handles invalid user JSON in storage', async () => {
      vi.mocked(SecureStorage.getItem).mockImplementation(async key => {
        if (key === 'adminUser') return 'invalid-json'
        return null
      })

      await adminAuthService.initFromStorage()
      expect(adminAuthService.getAdminUser()).toBeNull()
    })
  })
})
