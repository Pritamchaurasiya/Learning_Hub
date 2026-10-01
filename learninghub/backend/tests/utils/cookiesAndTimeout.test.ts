import {
  parseCookies,
  cookieMiddleware,
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookie,
  getAccessTokenFromCookie,
} from '../../src/utils/cookies'
import { withTimeout, TimeoutError } from '../../src/utils/timeout'
import { Request, Response } from 'express'

describe('Cookies and Timeout Utilities', () => {
  describe('parseCookies', () => {
    it('returns empty object when header is undefined or empty', () => {
      expect(parseCookies(undefined)).toEqual({})
      expect(parseCookies('')).toEqual({})
    })

    it('parses valid cookie string', () => {
      const header = 'access_token=token123; refresh_token=refresh456; theme=dark'
      const parsed = parseCookies(header)
      expect(parsed).toEqual({
        access_token: 'token123',
        refresh_token: 'refresh456',
        theme: 'dark',
      })
    })
  })

  describe('cookieMiddleware', () => {
    it('populates req.cookies and calls next', () => {
      const req = {
        headers: {
          cookie: 'session_id=abc123xyz',
        },
      } as unknown as Request

      const res = {} as Response
      const next = jest.fn()

      cookieMiddleware(req, res, next)
      expect(req.cookies).toEqual({ session_id: 'abc123xyz' })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('setAuthCookies & clearAuthCookies', () => {
    it('sets access and refresh cookies on response', () => {
      const cookieMock = jest.fn()
      const res = { cookie: cookieMock } as unknown as Response
      const req = { secure: true, headers: {} } as unknown as Request

      setAuthCookies(res, { accessToken: 'acc1', refreshToken: 'ref1' }, req)

      expect(cookieMock).toHaveBeenCalledWith(
        'access_token',
        'acc1',
        expect.objectContaining({ httpOnly: true, secure: true })
      )
      expect(cookieMock).toHaveBeenCalledWith(
        'refresh_token',
        'ref1',
        expect.objectContaining({ httpOnly: true, secure: true })
      )
    })

    it('clears access and refresh cookies on response', () => {
      const clearCookieMock = jest.fn()
      const res = { clearCookie: clearCookieMock } as unknown as Response

      clearAuthCookies(res)

      expect(clearCookieMock).toHaveBeenCalledWith('access_token', expect.any(Object))
      expect(clearCookieMock).toHaveBeenCalledWith('refresh_token', expect.any(Object))
    })

    it('extracts tokens from cookie map', () => {
      const req = {
        cookies: {
          access_token: 'my-access-token',
          refresh_token: 'my-refresh-token',
        },
      } as unknown as Request

      expect(getAccessTokenFromCookie(req)).toBe('my-access-token')
      expect(getRefreshTokenFromCookie(req)).toBe('my-refresh-token')
    })
  })

  describe('withTimeout', () => {
    it('resolves when promise finishes before timeout', async () => {
      const fastPromise = new Promise(resolve => setTimeout(() => resolve('fast-data'), 10))
      const result = await withTimeout(fastPromise, 100)
      expect(result).toBe('fast-data')
    })

    it('rejects with TimeoutError when promise takes too long', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow-data'), 100))
      await expect(withTimeout(slowPromise, 10)).rejects.toThrow(TimeoutError)
    })

    it('propagates underlying promise rejection', async () => {
      const failingPromise = Promise.reject(new Error('underlying failure'))
      await expect(withTimeout(failingPromise, 100)).rejects.toThrow('underlying failure')
    })
  })
})
