import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userService } from './userService'

// Mock fetchApi function
vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { user: mockUser },
      })

      const result = await userService.getProfile()

      expect(fetchApi).toHaveBeenCalledWith('/auth/me')
      expect(result.data.username).toBe('testuser')
      expect(result.data.email).toBe('test@example.com')
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const { fetchApi } = await import('../utils/api')
      const updatedUser = {
        id: 'user-123',
        display_name: 'Updated Name',
        bio: 'New bio',
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: updatedUser,
      })

      const result = await userService.updateProfile({
        display_name: 'Updated Name',
        bio: 'New bio',
      })

      expect(fetchApi).toHaveBeenCalledWith('/auth/profile/', {
        method: 'PUT',
        body: JSON.stringify({ display_name: 'Updated Name', bio: 'New bio' }),
      })
      expect(result.data).toEqual(updatedUser)
    })
  })

  describe('uploadAvatar', () => {
    it('should upload user avatar', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockResponse = {
        avatar_url: 'https://example.com/avatar.jpg',
      }

      // Mock global fetch for avatar upload (uses direct fetch, not fetchApi)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockResponse }),
      } as Response)

      const result = await userService.uploadAvatar(mockFile)

      expect(result.data.avatar_url).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('changePassword', () => {
    it('should change user password', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { message: 'Password changed successfully' },
      })

      const result = await userService.changePassword('oldpass', 'newpass123')

      expect(fetchApi).toHaveBeenCalledWith('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpass123' }),
      })
      expect(result.data.message).toBe('Password changed successfully')
    })
  })

  describe('getStats', () => {
    it('should fetch user stats', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { user: { streak: 7, xp: 5000, level: 5 }, progress: [] },
      })

      const result = await userService.getStats()

      expect(fetchApi).toHaveBeenCalledWith('/auth/me')
      expect(result.data.current_streak).toBe(7)
    })
  })

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { message: 'Account deleted successfully' },
      })

      const result = await userService.deleteAccount()

      expect(fetchApi).toHaveBeenCalledWith('/auth/delete-account', {
        method: 'DELETE',
      })
      expect(result.data.message).toBe('Account deleted successfully')
    })
  })
})
