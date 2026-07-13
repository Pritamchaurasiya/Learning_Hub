import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import { sendValidationError, sendInternalError } from '../utils/responseHelper'

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
      // and apply type coercions defined in Zod schemas
      if (parsed.body !== undefined) req.body = parsed.body
      if (parsed.query != null) {
        Object.defineProperty(req, 'query', {
          value: parsed.query,
          writable: true,
          configurable: true,
          enumerable: true,
        })
      }
      if (parsed.params != null) {
        Object.defineProperty(req, 'params', {
          value: parsed.params,
          writable: true,
          configurable: true,
          enumerable: true,
        })
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
      console.error('[Validation Error]', error)
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
