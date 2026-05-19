/**
 * Standardized Error Handling for Backend
 *
 * Provides consistent error handling across all controllers and services.
 */

import { Response } from 'express'
import logger from './logger'

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
    code: ErrorCode,
    isOperational = true,
    details?: unknown
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.details = details

    // Maintains proper stack trace for where our error was thrown
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

  // For generic errors
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
  error: Error | AppError,
  req: { requestId?: string },
  res: Response,

  _next: () => void
): void => {
  // Log error
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('AppError', error, {
        code: error.code,
        requestId: req.requestId,
        details: error.details,
      })
    } else {
      logger.warn(
        `AppError: ${error.message} [${error.code}] requestId=${req.requestId ?? 'unknown'}`
      )
    }
  } else {
    logger.error('Unhandled Error', error, {
      requestId: req.requestId,
    })
  }

  // Determine status code
  const statusCode = error instanceof AppError ? error.statusCode : 500

  // Format response
  const response = formatErrorResponse(error, req.requestId)

  // Send response
  res.status(statusCode).json(response)
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

/**
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: unknown, res: unknown, next: unknown) => Promise<unknown>
) => {
  return (req: unknown, res: unknown, next: unknown) => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      if (typeof next === 'function') (next as (e: unknown) => void)(err)
    })
  }
}

// ============================================================================
// Prisma Error Handler
// ============================================================================

import { Prisma } from '@prisma/client'

export const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const fields = error.meta?.target as string[] | undefined
      const field = fields?.join(', ') || 'field'
      return errorFactory.duplicateEntry('Record', field)

    case 'P2025':
      // Record not found
      return errorFactory.notFound('Record')

    case 'P2003':
      // Foreign key constraint violation
      return errorFactory.validationError('Foreign key constraint violation', error.meta)

    case 'P2014':
      // Required relation violation
      return errorFactory.validationError('Required relation violation', error.meta)

    case 'P2011':
      // Null constraint violation
      return errorFactory.missingRequiredField('Required field')

    default:
      return errorFactory.databaseError('Database operation failed')
  }
}

// ============================================================================
// Validation Error Handler
// ============================================================================

export const handleValidationError = (errors: unknown): AppError => {
  return errorFactory.validationError('Validation failed', errors)
}
