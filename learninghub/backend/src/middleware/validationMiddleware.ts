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
      if (parsed.query != null) req.query = parsed.query as Request['query']
      if (parsed.params != null) req.params = parsed.params as Request['params']

      return next()
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))
        return sendValidationError(res, 'Validation failed', 'VALIDATION_ERROR', details)
      }
      return sendInternalError(res, 'Internal server error during validation')
    }
  }
