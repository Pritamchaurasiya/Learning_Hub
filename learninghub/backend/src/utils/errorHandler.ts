/**
 * Error Handling Utilities
 *
 * Re-exports from the canonical error handler in middleware.
 * This module exists for backward compatibility and convenience imports.
 */

import { Prisma } from '@prisma/client'
import {
  AppError as MiddlewareAppError,
  ErrorCode,
  errorFactory,
  errorHandler as middlewareErrorHandler,
  notFoundHandler,
} from '../middleware/errorHandler'

export { ErrorCode, errorFactory, notFoundHandler }

export class AppError extends MiddlewareAppError {}

export const errorHandler = middlewareErrorHandler

export { asyncHandler } from '../middleware/asyncHandler'

export const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      const fields = error.meta?.target as string[] | undefined
      const field = fields?.join(', ') ?? 'field'
      return errorFactory.duplicateEntry('Record', field)
    case 'P2025':
      return errorFactory.notFound('Record')
    case 'P2003':
      return errorFactory.validationError('Foreign key constraint violation', error.meta)
    case 'P2014':
      return errorFactory.validationError('Required relation violation', error.meta)
    case 'P2011':
      return errorFactory.missingRequiredField('Required field')
    default:
      return errorFactory.databaseError('Database operation failed')
  }
}

export const handleValidationError = (errors: unknown): AppError => {
  return errorFactory.validationError('Validation failed', errors)
}

export default errorHandler
