import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../../src/utils/errors'
import {
  AppError,
  handlePrismaError,
  handleValidationError,
  errorFactory,
} from '../../src/utils/errorHandler'
import { Prisma } from '@prisma/client'

describe('Errors and Error Handlers', () => {
  describe('Custom Error Classes', () => {
    it('creates AuthenticationError with default and custom messages', () => {
      const errDefault = new AuthenticationError()
      expect(errDefault.message).toBe('Authentication failed')
      expect(errDefault.name).toBe('AuthenticationError')

      const errCustom = new AuthenticationError('Invalid credentials')
      expect(errCustom.message).toBe('Invalid credentials')
    })

    it('creates AuthorizationError', () => {
      const err = new AuthorizationError('Forbidden action')
      expect(err.message).toBe('Forbidden action')
      expect(err.name).toBe('AuthorizationError')
    })

    it('creates ValidationError with details', () => {
      const details = [{ field: 'email', message: 'invalid' }]
      const err = new ValidationError('Invalid input', details)
      expect(err.message).toBe('Invalid input')
      expect(err.name).toBe('ValidationError')
      expect(err.details).toEqual(details)
    })

    it('creates NotFoundError', () => {
      const err = new NotFoundError('User not found')
      expect(err.message).toBe('User not found')
      expect(err.name).toBe('NotFoundError')
    })

    it('creates ConflictError', () => {
      const err = new ConflictError('Email already registered')
      expect(err.message).toBe('Email already registered')
      expect(err.name).toBe('ConflictError')
    })

    it('creates RateLimitError', () => {
      const err = new RateLimitError('Limit exceeded')
      expect(err.message).toBe('Limit exceeded')
      expect(err.name).toBe('RateLimitError')
    })
  })

  describe('handlePrismaError', () => {
    it('handles P2002 duplicate entry error', () => {
      const prismaErr = new Prisma.PrismaClientKnownRequestError('Duplicate key', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['email'] },
      })

      const appError = handlePrismaError(prismaErr)
      expect(appError.statusCode).toBe(409)
      expect(appError.message).toContain('Record')
    })

    it('handles P2025 record not found error', () => {
      const prismaErr = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '6.0.0',
      })

      const appError = handlePrismaError(prismaErr)
      expect(appError.statusCode).toBe(404)
      expect(appError.message).toContain('Record')
    })

    it('handles P2003 foreign key constraint error', () => {
      const prismaErr = new Prisma.PrismaClientKnownRequestError('FK error', {
        code: 'P2003',
        clientVersion: '6.0.0',
      })

      const appError = handlePrismaError(prismaErr)
      expect(appError.statusCode).toBe(400)
    })

    it('handles unknown prisma errors as 500 databaseError', () => {
      const prismaErr = new Prisma.PrismaClientKnownRequestError('Unknown error', {
        code: 'P9999',
        clientVersion: '6.0.0',
      })

      const appError = handlePrismaError(prismaErr)
      expect(appError.statusCode).toBe(500)
    })
  })

  describe('handleValidationError', () => {
    it('wraps validation issues into AppError', () => {
      const errors = [{ path: ['name'], message: 'Required' }]
      const appErr = handleValidationError(errors)
      expect(appErr.statusCode).toBe(400)
      expect(appErr.message).toBe('Validation failed')
    })
  })
})
