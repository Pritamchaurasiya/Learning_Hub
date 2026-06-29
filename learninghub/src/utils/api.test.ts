import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchApi } from './api'
import { invalidateCache } from './cache'

describe('API Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    invalidateCache()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('AbortController Support', () => {
    it('should pass AbortSignal to fetch', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const mockFetch = vi.fn().mockResolvedValue(mockResponse)
      vi.stubGlobal('fetch', mockFetch)

      const controller = new AbortController()
      await fetchApi('/test', { signal: controller.signal })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      )
    })

    it('should handle AbortError gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
      vi.stubGlobal('fetch', mockFetch)

      const controller = new AbortController()
      controller.abort()

      await expect(fetchApi('/test', { signal: controller.signal })).rejects.toThrow('Aborted')
    })

    it('should cancel in-flight requests on abort', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100)
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const controller = new AbortController()
      const promise = fetchApi('/test', { signal: controller.signal })

      controller.abort()

      await expect(promise).rejects.toThrow('Aborted')
    })
  })

  describe('Token Refresh', () => {
    it('should refresh token on 401', async () => {
      // Create a dummy token value and set it using the secure storage implementation
      const oldToken = 'old-token'
      const oldRefreshToken = 'old-refresh'

      // Need to mock SecureStorage or wait since getAccessToken reads from it async
      // But we can just rely on the API doing its retry flow.
      const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })

      const refreshResponse = new Response(JSON.stringify({ access_token: 'new-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const successResponse = new Response(JSON.stringify({ data: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(unauthorizedResponse)
        .mockResolvedValueOnce(refreshResponse)
        .mockResolvedValueOnce(successResponse)

      vi.stubGlobal('fetch', mockFetch)

      // The test previously failed because SecureStorage uses indexedDB or fallback
      // but without the mock for getRefreshToken, the refresh throws an error.
      // Let's set it up so getRefreshToken doesn't fail.
      const { SecureStorage } = await import('./security')
      await SecureStorage.setItem('refreshToken', oldRefreshToken)
      await SecureStorage.setItem('token', oldToken)

      await fetchApi('/test')

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: 'success' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )

      vi.stubGlobal('fetch', mockFetch)

      // We need to use fake timers to skip the delay in fetchApi, or just mock sleep.
      // But we can't easily mock local sleep, so let's mock Math.random to return 0 and change config?
      // Since it retries once, it takes ~1000ms.
      await fetchApi('/test')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 502/503/504 errors', async () => {
      const errorResponse = new Response(JSON.stringify({ error: 'Bad Gateway' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })

      const successResponse = new Response(JSON.stringify({ data: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse)

      vi.stubGlobal('fetch', mockFetch)

      await fetchApi('/test')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
