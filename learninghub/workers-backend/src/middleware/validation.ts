import { ZodSchema, ZodError } from 'zod'
import { logger } from '../utils/logger'

/**
 * Validation error response
 */
interface ValidationErrorResponse {
  error: string
  message: string
  details: Array<{
    path: string
    message: string
  }>
}

/**
 * Middleware to validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (
    request: Request
  ): Promise<{ data: T; error: null } | { data: null; error: Response }> => {
    try {
      const body = await request.json()
      const validated = await schema.parseAsync(body)
      return { data: validated, error: null }
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))

        logger.warn('Validation failed', { details })

        const response: ValidationErrorResponse = {
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        }

        return {
          data: null,
          error: new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
        }
      }

      logger.error('Unexpected validation error', err as Error)

      return {
        data: null,
        error: new Response(
          JSON.stringify({
            error: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      }
    }
  }
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (request: Request): { data: T; error: null } | { data: null; error: Response } => {
    try {
      const url = new URL(request.url)
      const params = Object.fromEntries(url.searchParams)
      const validated = schema.parse(params)
      return { data: validated, error: null }
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))

        const response: ValidationErrorResponse = {
          error: 'QUERY_VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details,
        }

        return {
          data: null,
          error: new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
        }
      }

      return {
        data: null,
        error: new Response(
          JSON.stringify({
            error: 'INVALID_QUERY',
            message: 'Invalid query parameters',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      }
    }
  }
}

/**
 * Middleware to validate route parameters (from URL path)
 */
export function validateParams<T extends Record<string, string>>(
  schema: ZodSchema<T>,
  params: Record<string, string>
): { data: T; error: null } | { data: null; error: Response } {
  try {
    const validated = schema.parse(params)
    return { data: validated, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }))

      const response = {
        error: 'PARAM_VALIDATION_ERROR',
        message: 'Route parameter validation failed',
        details,
      }

      return {
        data: null,
        error: new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      }
    }

    return {
      data: null,
      error: new Response(
        JSON.stringify({
          error: 'INVALID_PARAMS',
          message: 'Invalid route parameters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    }
  }
}
