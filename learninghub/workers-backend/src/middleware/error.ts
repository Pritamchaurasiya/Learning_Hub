import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/helpers';

/**
 * Custom API Error class with status code
 */
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Common error types
 */
export const Errors = {
  UNAUTHORIZED: (message = 'Unauthorized') => new APIError('UNAUTHORIZED', message, 401),
  FORBIDDEN: (message = 'Forbidden') => new APIError('FORBIDDEN', message, 403),
  NOT_FOUND: (message = 'Not found') => new APIError('NOT_FOUND', message, 404),
  CONFLICT: (message = 'Conflict') => new APIError('CONFLICT', message, 409),
  VALIDATION: (message = 'Validation failed', details?: Record<string, unknown>) => 
    new APIError('VALIDATION_ERROR', message, 400, details),
  INTERNAL: (message = 'Internal server error') => new APIError('INTERNAL_ERROR', message, 500),
  SERVICE_UNAVAILABLE: (message = 'Service unavailable') => new APIError('SERVICE_UNAVAILABLE', message, 503),
  RATE_LIMITED: (message = 'Too many requests', retryAfter?: number) => 
    new APIError('RATE_LIMITED', message, 429, retryAfter ? { retryAfter } : undefined),
};

/**
 * Handle errors and return appropriate response
 */
export function handleError(error: Error): Response {
  // Log all errors
  logger.error('Request error', error);

  if (error instanceof APIError) {
    return createErrorResponse(error.message, error.status, error.code, error.details);
  }

  // Handle specific error types
  if (error.name === 'JWTExpired') {
    return createErrorResponse('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  if (error.name === 'JWTInvalid') {
    return createErrorResponse('Invalid token', 401, 'TOKEN_INVALID');
  }

  if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    return createErrorResponse('Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Database errors
  if (error.message?.includes('database') || error.message?.includes('D1')) {
    return createErrorResponse('Database error', 503, 'DATABASE_ERROR');
  }

  // Generic internal error (don't expose details)
  return createErrorResponse(
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined
  );
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler<T extends (request: Request, ...args: unknown[]) => Promise<Response>>(
  fn: T
): (request: Request, ...args: unknown[]) => Promise<Response> {
  return async (request: Request, ...args: unknown[]) => {
    try {
      return await fn(request, ...args);
    } catch (error) {
      return handleError(error as Error);
    }
  };
}
