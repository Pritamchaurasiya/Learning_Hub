import { Response } from 'express'

/**
 * Standardized API response helpers for LearningHub backend.
 *
 * All API responses MUST use one of these helpers to ensure consistent
 * response shape across all endpoints:
 *
 *   Success: { status: 'success', message?: string, data: T }
 *   Error:   { status: 'error', message: string, code?: string }
 */

interface SuccessResponsePayload<T = unknown> {
  status: 'success'
  message?: string
  data: T
  meta?: unknown
}

interface ErrorResponsePayload {
  status: 'error'
  message: string
  code?: string
  details?: unknown
}

/** Send a success JSON response */
export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: unknown
): void => {
  const payload: SuccessResponsePayload<T> = { status: 'success', data }
  if (message) payload.message = message
  if (meta) payload.meta = meta
  res.status(statusCode).json(payload)
}

/** Send a created (201) JSON response */
export const sendCreated = <T = unknown>(res: Response, data: T, message?: string): void => {
  sendSuccess(res, data, message, 201)
}

/** Send an error JSON response */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  code?: string,
  details?: unknown
): void => {
  const payload: ErrorResponsePayload = { status: 'error', message }
  if (code) payload.code = code
  if (details !== undefined) payload.details = details
  res.status(statusCode).json(payload)
}

/** Common error shortcuts */
export const sendUnauthorized = (
  res: Response,
  message = 'Authentication required',
  code = 'NO_TOKEN'
): void => sendError(res, message, 401, code)

export const sendForbidden = (
  res: Response,
  message = 'Insufficient permissions',
  code = 'FORBIDDEN'
): void => sendError(res, message, 403, code)

export const sendNotFound = (
  res: Response,
  message = 'Resource not found',
  code = 'NOT_FOUND'
): void => sendError(res, message, 404, code)

export const sendConflict = (res: Response, message: string, code = 'CONFLICT'): void =>
  sendError(res, message, 409, code)

export const sendInternalError = (
  res: Response,
  message = 'Internal server error',
  code = 'INTERNAL_ERROR'
): void => sendError(res, message, 500, code)

export const sendValidationError = (
  res: Response,
  message: string,
  code = 'VALIDATION_ERROR',
  details?: unknown
): void => sendError(res, message, 400, code, details)
