import { Request, Response } from 'express'
import {
  csrfProtection,
  csrfTokenHandler,
  generateCsrfTokenForSession,
} from '../../src/middleware/csrfMiddleware'

describe('CSRF Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let nextFn: jest.Mock

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      originalUrl: '/api/v1/courses/enroll',
      headers: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFn = jest.fn()
  })

  it('should bypass CSRF check on safe HTTP methods (GET, HEAD, OPTIONS)', async () => {
    mockReq.method = 'GET'
    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should bypass CSRF check on webhook endpoints', async () => {
    mockReq.method = 'POST'
    mockReq.originalUrl = '/api/v1/payments/webhook'
    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).toHaveBeenCalled()
  })

  it('should bypass CSRF check on exempted auth endpoints (e.g. login)', async () => {
    mockReq.method = 'POST'
    mockReq.originalUrl = '/api/v1/auth/login'
    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).toHaveBeenCalled()
  })

  it('should reject request when session id is missing on state-changing method', async () => {
    mockReq.method = 'POST'
    mockReq.headers = {}
    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CSRF_MISSING_SESSION',
      })
    )
  })

  it('should reject request when csrf token header is missing', async () => {
    mockReq.method = 'POST'
    mockReq.headers = {
      'x-session-id': 'session-12345',
    }
    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CSRF_MISSING_TOKEN',
      })
    )
  })

  it('should allow request with valid CSRF token matching session ID', async () => {
    const sessionId = 'session-test-valid-999'
    const validToken = await generateCsrfTokenForSession(sessionId)

    mockReq.method = 'POST'
    mockReq.headers = {
      'x-session-id': sessionId,
      'x-csrf-token': validToken,
    }

    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should reject request when token belongs to different session ID', async () => {
    const validTokenForAnotherSession = await generateCsrfTokenForSession('session-A')

    mockReq.method = 'POST'
    mockReq.headers = {
      'x-session-id': 'session-B',
      'x-csrf-token': validTokenForAnotherSession,
    }

    await csrfProtection(mockReq as Request, mockRes as Response, nextFn)
    expect(nextFn).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CSRF_SESSION_MISMATCH',
      })
    )
  })

  it('should generate token via csrfTokenHandler for valid session header', async () => {
    mockReq.headers = {
      'x-session-id': 'session-handler-test',
    }
    await csrfTokenHandler(mockReq as Request, mockRes as Response)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          csrfToken: expect.any(String),
        }),
      })
    )
  })
})
