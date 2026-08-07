import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import logger from '../utils/logger'
import { sentryCaptureException } from '../utils/sentry'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../utils/errors'

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',
}

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

export const errorFactory = {
  unauthorized: (message = 'Unauthorized access') =>
    new AppError(message, 401, ErrorCode.UNAUTHORIZED),
  forbidden: (message = 'Access denied') => new AppError(message, 403, ErrorCode.FORBIDDEN),
  invalidToken: (message = 'Invalid token') => new AppError(message, 401, ErrorCode.INVALID_TOKEN),
  tokenExpired: (message = 'Token expired') => new AppError(message, 401, ErrorCode.TOKEN_EXPIRED),
  validationError: (message = 'Validation failed', details?: unknown) =>
    new AppError(message, 400, ErrorCode.VALIDATION_ERROR, true, details),
  invalidInput: (message = 'Invalid input', details?: unknown) =>
    new AppError(message, 400, ErrorCode.INVALID_INPUT, true, details),
  missingRequiredField: (field: string) =>
    new AppError(`Missing required field: ${field}`, 400, ErrorCode.MISSING_REQUIRED_FIELD),
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND),
  resourceNotFound: (resource: string, id?: string) =>
    new AppError(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404,
      ErrorCode.RESOURCE_NOT_FOUND
    ),
  conflict: (message = 'Conflict') => new AppError(message, 409, ErrorCode.CONFLICT),
  duplicateEntry: (resource: string, field: string) =>
    new AppError(`${resource} with this ${field} already exists`, 409, ErrorCode.DUPLICATE_ENTRY),
  alreadyExists: (resource: string) =>
    new AppError(`${resource} already exists`, 409, ErrorCode.ALREADY_EXISTS),
  rateLimited: (message = 'Too many requests') =>
    new AppError(message, 429, ErrorCode.RATE_LIMITED),
  tooManyRequests: (message = 'Too many requests') =>
    new AppError(message, 429, ErrorCode.TOO_MANY_REQUESTS),
  internalError: (message = 'Internal server error') =>
    new AppError(message, 500, ErrorCode.INTERNAL_ERROR, false),
  serviceUnavailable: (message = 'Service unavailable') =>
    new AppError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, false),
  databaseError: (message = 'Database error') =>
    new AppError(message, 500, ErrorCode.DATABASE_ERROR, false),
  externalServiceError: (service: string) =>
    new AppError(`${service} error`, 502, ErrorCode.EXTERNAL_SERVICE_ERROR, false),
  businessError: (message: string, details?: unknown) =>
    new AppError(message, 400, ErrorCode.BUSINESS_ERROR, true, details),
  operationNotAllowed: (operation: string) =>
    new AppError(`Operation not allowed: ${operation}`, 403, ErrorCode.OPERATION_NOT_ALLOWED),
  invalidState: (message = 'Invalid state') => new AppError(message, 400, ErrorCode.INVALID_STATE),
}

function mapStatusToErrorCode(statusCode: number): ErrorCode {
  const map: Record<number, ErrorCode> = {
    400: ErrorCode.VALIDATION_ERROR,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    429: ErrorCode.RATE_LIMITED,
    500: ErrorCode.INTERNAL_ERROR,
    502: ErrorCode.EXTERNAL_SERVICE_ERROR,
    503: ErrorCode.SERVICE_UNAVAILABLE,
  }
  return map[statusCode] ?? ErrorCode.INTERNAL_ERROR
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500
  let message = 'Internal server error'
  let errors: Array<{ field: string; message: string }> | undefined

  const requestId = req.requestId

  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.isOperational ? err.message : 'Internal Server Error'
    if (err.statusCode >= 500) {
      logger.error('AppError', err, { code: err.code, requestId, details: err.details })
      sentryCaptureException(err, { code: err.code, requestId, details: err.details })
    } else {
      logger.warn(`AppError: ${err.message} [${err.code}] requestId=${requestId ?? 'unknown'}`)
    }
  } else if (err instanceof ZodError) {
    statusCode = 400
    message = 'Validation failed'
    errors = err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
    logger.warn(`ZodError: ${message} requestId=${requestId ?? 'unknown'}`, { errors, requestId })
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode: sc, message: msg } = handlePrismaError(err)
    statusCode = sc
    message = msg
    logger.error(`PrismaError [${err.code}]: ${message}`, err, { requestId })
    sentryCaptureException(err, { requestId, prismaCode: err.code })
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid request data'
    logger.warn(`PrismaValidationError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500
    message = 'Internal Server Error'
    logger.error('PrismaUnknownError', err, { requestId })
    sentryCaptureException(err, { requestId })
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    logger.warn(`JWT Error: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400
    message = 'Invalid JSON in request body'
    logger.warn(`SyntaxError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof AuthenticationError) {
    statusCode = 401
    message = err.message
    logger.warn(`AuthenticationError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof AuthorizationError) {
    statusCode = 403
    message = err.message
    logger.warn(`AuthorizationError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof ValidationError) {
    statusCode = 400
    message = err.message
    if (err.details) {
      errors = Array.isArray(err.details)
        ? (err.details as Array<{ field: string; message: string }>)
        : undefined
    }
    logger.warn(`ValidationError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof NotFoundError) {
    statusCode = 404
    message = err.message
    logger.warn(`NotFoundError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof ConflictError) {
    statusCode = 409
    message = err.message
    logger.warn(`ConflictError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else if (err instanceof RateLimitError) {
    statusCode = 429
    message = err.message
    logger.warn(`RateLimitError: ${message} requestId=${requestId ?? 'unknown'}`)
  } else {
    logger.error('Unhandled Error', err, { requestId })
    sentryCaptureException(err, { requestId })
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[ErrorHandler] ${statusCode} - ${message}`, err)
  }

  const payload: any = {
    status: 'error',
    message,
  }

  if (err instanceof AppError && err.code) {
    payload.code = err.code
  } else if (err instanceof AuthenticationError) {
    payload.code = 'UNAUTHORIZED'
  } else if (err instanceof AuthorizationError) {
    payload.code = 'FORBIDDEN'
  } else if (err instanceof ValidationError) {
    payload.code = 'VALIDATION_ERROR'
  } else if (err instanceof NotFoundError) {
    payload.code = 'NOT_FOUND'
  } else if (err instanceof ConflictError) {
    payload.code = 'CONFLICT'
  } else if (err instanceof RateLimitError) {
    payload.code = 'RATE_LIMIT_EXCEEDED'
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
     payload.code = 'DATABASE_ERROR'
  } else if (err instanceof ZodError) {
     payload.code = 'VALIDATION_ERROR'
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
     payload.code = 'INVALID_TOKEN'
  } else if (err instanceof SyntaxError && 'body' in err) {
     payload.code = 'INVALID_INPUT'
  } else if ((err as any).code) {
      payload.code = (err as any).code
  }

  if (requestId) payload.requestId = requestId
  if (errors) payload.errors = errors
  if (process.env.NODE_ENV === 'development') payload.stack = err.stack

  res.status(statusCode).json(payload)
}

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number
  message: string
} {
  switch (err.code) {
    case 'P2002': {
      const target = err.meta?.target as string[] | undefined
      return {
        statusCode: 409,
        message: `A record with this ${target ? target.join(', ') : 'field'} already exists`,
      }
    }
    case 'P2025':
    case 'P2001':
    case 'P2018':
      return { statusCode: 404, message: 'Record not found' }
    case 'P2003':
      return { statusCode: 400, message: 'Invalid reference to related record' }
    case 'P2014':
      return { statusCode: 400, message: 'Invalid relation data' }
    case 'P2021':
      return { statusCode: 500, message: 'Database table not found' }
    case 'P2022':
      return { statusCode: 500, message: 'Database column not found' }
    default:
      return { statusCode: 500, message: 'Database error' }
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl || req.url}`,
  })
}

export { handlePrismaError as prismaErrorHandler }
export default errorHandler
