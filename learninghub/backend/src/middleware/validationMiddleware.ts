import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import { sendValidationError, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

type ParsedRequestParts = {
  body?: unknown
  query?: unknown
  params?: unknown
}

export const validate =
  (schema: z.ZodType<ParsedRequestParts>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })

      // Re-assign sanitized data back to req to strip unknown fields
      // and apply type coercions defined in Zod schemas (safely for Express 5)
      if (parsed.body !== undefined) {
        req.body = parsed.body
      }
      if (parsed.query != null) {
        try {
          req.query = parsed.query as any
        } catch {
          Object.defineProperty(req, 'query', {
            value: parsed.query,
            configurable: true,
            enumerable: true,
            writable: true,
          })
        }
      }
      if (parsed.params != null) {
        try {
          req.params = parsed.params as any
        } catch {
          Object.defineProperty(req, 'params', {
            value: parsed.params,
            configurable: true,
            enumerable: true,
            writable: true,
          })
        }
      }

      return next()
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))
        return sendValidationError(res, 'Validation failed', 'VALIDATION_ERROR', details)
      }
      logger.error(
        '[Validation Error]',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Internal server error during validation')
    }
  }

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const validateUUIDParam = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const val = req.params[paramName]
    if (typeof val !== 'string' || !uuidRegex.test(val)) {
      sendValidationError(res, `Invalid UUID format for parameter: ${paramName}`)
      return
    }
    next()
  }
}
