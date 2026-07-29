import { Request, Response, NextFunction } from 'express'
import {
  requireAdmin,
  requireAdminPermission,
  requireInstructorOrAdmin,
  requireRole,
} from '../../src/middleware/roleMiddleware'

function makeReqResNext(role?: string) {
  const req = {
    user: role ? { userId: 'user-123', email: 'test@example.com', role } : undefined,
  } as unknown as Request

  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const res = { status, json } as unknown as Response
  const next = jest.fn() as unknown as NextFunction

  return { req, res, next, json, status }
}

describe('roleMiddleware guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('requireRole', () => {
    it('allows configured roles case-insensitively', () => {
      const { req, res, next, status } = makeReqResNext('instructor')

      requireRole(['ADMIN', 'INSTRUCTOR'])(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated requests', () => {
      const { req, res, next, status, json } = makeReqResNext()

      requireRole(['ADMIN'])(req, res, next)

      expect(status).toHaveBeenCalledWith(401)
      expect(json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        code: 'NO_TOKEN',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('rejects users without an allowed role', () => {
      const { req, res, next, status, json } = makeReqResNext('STUDENT')

      requireRole(['ADMIN'])(req, res, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it.each(['ADMIN', 'SUPERADMIN'])('allows %s', role => {
      const { req, res, next, status } = makeReqResNext(role)

      requireAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('rejects non-admin users', () => {
      const { req, res, next, status, json } = makeReqResNext('STUDENT')

      requireAdmin(req, res, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
        code: 'FORBIDDEN',
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireAdminPermission', () => {
    it.each(['ADMIN', 'SUPERADMIN'])('allows %s for named admin permissions', role => {
      const { req, res, next, status } = makeReqResNext(role)

      requireAdminPermission(['analytics.read'])(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('rejects non-admin users', () => {
      const { req, res, next, status, json } = makeReqResNext('INSTRUCTOR')

      requireAdminPermission(['courses.write'])(req, res, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
        code: 'FORBIDDEN',
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireInstructorOrAdmin', () => {
    it.each(['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'])('allows %s', role => {
      const { req, res, next, status } = makeReqResNext(role)

      requireInstructorOrAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('rejects students', () => {
      const { req, res, next, status, json } = makeReqResNext('STUDENT')

      requireInstructorOrAdmin(req, res, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Instructor or Admin access required',
        code: 'FORBIDDEN',
      })
      expect(next).not.toHaveBeenCalled()
    })
  })
})
