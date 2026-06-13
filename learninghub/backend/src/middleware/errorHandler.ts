/**
 * Standardized Error Handling for Backend
 *
 * Provides consistent error handling across all controllers and services.
 * Single source of truth for all error-related utilities.
 */

import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import logger from '../utils/logger'
import { sentryCaptureException } from '../utils/sentry'

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Rate Limiting
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Business Logic
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly isOperational: boolean
  public readonly details?: unknown

  constructor(
    message: string,
    statusCode: number,
    code?: ErrorCode,
    isOperational = true,
    details?: unknown
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code ?? mapStatusToErrorCode(statusCode)
    this.isOperational = isOperational
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

export const errorFactory = {
  // Authentication & Authorization
  unauthorized: (message = 'Unauthorized access') =>
    new AppError(message, 401, ErrorCode.UNAUTHORIZED),
  forbidden: (message = 'Access denied') => new AppError(message, 403, ErrorCode.FORBIDDEN),
  invalidToken: (message = 'Invalid token') => new AppError(message, 401, ErrorCode.INVALID_TOKEN),
  tokenExpired: (message = 'Token expired') => new AppError(message, 401, ErrorCode.TOKEN_EXPIRED),

  // Validation
  validationError: (message = 'Validation failed', details?: unknown) =>
    new AppError(message, 400, ErrorCode.VALIDATION_ERROR, true, details),
  invalidInput: (message = 'Invalid input', details?: unknown) =>
    new AppError(message, 400, ErrorCode.INVALID_INPUT, true, details),
  missingRequiredField: (field: string) =>
    new AppError(`Missing required field: ${field}`, 400, ErrorCode.MISSING_REQUIRED_FIELD),

  // Resource Not Found
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND),
  resourceNotFound: (resource: string, id?: string) =>
    new AppError(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404,
      ErrorCode.RESOURCE_NOT_FOUND
    ),

  // Conflict
  conflict: (message = 'Conflict') => new AppError(message, 409, ErrorCode.CONFLICT),
  duplicateEntry: (resource: string, field: string) =>
    new AppError(`${resource} with this ${field} already exists`, 409, ErrorCode.DUPLICATE_ENTRY),
  alreadyExists: (resource: string) =>
    new AppError(`${resource} already exists`, 409, ErrorCode.ALREADY_EXISTS),

  // Rate Limiting
  rateLimited: (message = 'Too many requests') =>
    new AppError(message, 429, ErrorCode.RATE_LIMITED),
  tooManyRequests: (message = 'Too many requests') =>
    new AppError(message, 429, ErrorCode.TOO_MANY_REQUESTS),

  // Server Errors
  internalError: (message = 'Internal server error') =>
    new AppError(message, 500, ErrorCode.INTERNAL_ERROR, false),
  serviceUnavailable: (message = 'Service unavailable') =>
    new AppError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, false),
  databaseError: (message = 'Database error') =>
    new AppError(message, 500, ErrorCode.DATABASE_ERROR, false),
  externalServiceError: (service: string) =>
    new AppError(`${service} error`, 502, ErrorCode.EXTERNAL_SERVICE_ERROR, false),

  // Business Logic
  businessError: (message: string, details?: unknown) =>
    new AppError(message, 400, ErrorCode.BUSINESS_ERROR, true, details),
  operationNotAllowed: (operation: string) =>
    new AppError(`Operation not allowed: ${operation}`, 403, ErrorCode.OPERATION_NOT_ALLOWED),
  invalidState: (message = 'Invalid state') => new AppError(message, 400, ErrorCode.INVALID_STATE),
}

function mapStatusToErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400: return ErrorCode.VALIDATION_ERROR
    case 401: return ErrorCode.UNAUTHORIZED
    case 403: return ErrorCode.FORBIDDEN
    case 404: return ErrorCode.NOT_FOUND
    case 409: return ErrorCode.CONFLICT
    case 429: return ErrorCode.RATE_LIMITED
    case 500: return ErrorCode.INTERNAL_ERROR
    case 502: return ErrorCode.EXTERNAL_SERVICE_ERROR
    case 503: return ErrorCode.SERVICE_UNAVAILABLE
    default: return ErrorCode.INTERNAL_ERROR
  }
}

// ============================================================================
// Error Response Formatter
// ============================================================================

export interface ErrorResponse {
  status: 'error'
  code: ErrorCode
  message: string
  details?: unknown
  timestamp: string
  requestId?: string
}

export const formatErrorResponse = (error: AppError | Error, requestId?: string): ErrorResponse => {
  if (error instanceof AppError) {
    return {
      status: 'error',
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    }
  }

  return {
    status: 'error',
    code: ErrorCode.INTERNAL_ERROR,
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId,
  }
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500
  let message = 'Internal server error'
  let errors: Array<{ field: string; message: string }> | undefined = undefined

  // Log all errors
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.isOperational ? err.message : 'Internal Server Error'

    if (err.statusCode >= 500) {
      logger.error('AppError', err, {
        code: err.code,
        requestId: req.requestId,
        details: err.details,
      })
      sentryCaptureException(err, {
        code: err.code,
        requestId: req.requestId,
        details: err.details,
      })
    } else {
      logger.warn(
        `AppError: ${err.message} [${err.code}] requestId=${req.requestId ?? 'unknown'}`
      )
    }
  } else if (err instanceof ZodError) {
    statusCode = 400
    message = 'Validation failed'
    errors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    logger.warn(`ZodError: ${message} requestId=${req.requestId ?? 'unknown'}`, {
      errors,
      requestId: req.requestId,
    })
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err)
    statusCode = prismaError.statusCode
    message = prismaError.message
    logger.error(`PrismaError [${err.code}]: ${message}`, err, { requestId: req.requestId })
    sentryCaptureException(err, { requestId: req.requestId, prismaCode: err.code })
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid request data'
    logger.warn(`PrismaValidationError: ${message} requestId=${req.requestId ?? 'unknown'}`)
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500
    message = 'Internal Server Error'
    logger.error('PrismaUnknownError', err, { requestId: req.requestId })
    sentryCaptureException(err, { requestId: req.requestId })
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
    logger.warn(`JWT Error: ${message} requestId=${req.requestId ?? 'unknown'}`)
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
    logger.warn(`JWT Error: ${message} requestId=${req.requestId ?? 'unknown'}`)
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400
    message = 'Invalid JSON in request body'
    logger.warn(`SyntaxError: ${message} requestId=${req.requestId ?? 'unknown'}`)
  } else {
    message = 'Internal Server Error'
    logger.error('Unhandled Error', err, {
      requestId: req.requestId,
    })
    sentryCaptureException(err, { requestId: req.requestId })
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[ErrorHandler] ${statusCode} - ${message}`, err)
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

// ============================================================================
// Prisma Error Handler
// ============================================================================

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number
  message: string
} {
  switch (err.code) {
    case 'P2002':
      const target = err.meta?.target as string[] | undefined
      const field = target ? target.join(', ') : 'field'
      return {
        statusCode: 409,
        message: `A record with this ${field} already exists`,
      }
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
      }
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Invalid reference to related record',
      }
    case 'P2014':
      return {
        statusCode: 400,
        message: 'Invalid relation data',
      }
    case 'P2001':
    case 'P2018':
      return {
        statusCode: 404,
        message: 'Record not found',
      }
    case 'P2021':
      return {
        statusCode: 500,
        message: 'Database table not found',
      }
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Database column not found',
      }
    default:
      return {
        statusCode: 500,
        message: 'Database error',
      }
  }
}

// ============================================================================
// Route Not Found Handler
// ============================================================================

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

export const asyncHandler = (
  fn: (req: unknown, res: unknown, next: unknown) => Promise<unknown>
) => {
  return (req: unknown, res: unknown, next: unknown) => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      if (typeof next === 'function') (next as (e: unknown) => void)(err)
    })
  }
}

// Export public Prisma error handler for programmatic use
export { handlePrismaError as prismaErrorHandler }

export default errorHandler
