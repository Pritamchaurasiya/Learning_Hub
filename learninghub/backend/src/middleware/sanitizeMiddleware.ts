import { Request, Response, NextFunction } from 'express'
import { sanitizeInput } from '../config/security'

const SKIP_FIELDS = new Set([
  'code',
  'content',
  'body',
  'markdown',
  'latex',
  'math',
  'solution',
  'explanation',
  'options',
  'metadata',
  'config',
])

const shouldSanitize = (fieldName: string): boolean => {
  if (process.env.STRICT_SANITIZE) return true
  if (SKIP_FIELDS.has(fieldName)) return false
  return true
}

const sanitizeObject = (obj: unknown, path = ''): unknown => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    const fieldName = path.split('.').pop() ?? ''
    if (!shouldSanitize(fieldName)) return obj
    return sanitizeInput(obj)
  }
  if (Array.isArray(obj)) return obj.map((item, i) => sanitizeObject(item, `${path}[${i}]`))
  if (typeof obj === 'object' && !Buffer.isBuffer(obj)) {
    const sanitized: Record<string, unknown> = {}
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(
          (obj as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key
        )
      }
    }
    return sanitized
  }
  return obj
}

const replaceObjectContents = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
) => {
  for (const key of Object.keys(target)) {
    delete target[key]
  }
  Object.assign(target, source)
}

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObject(req.body) as Record<string, unknown>
  if (req.query && typeof req.query === 'object') {
    replaceObjectContents(
      req.query as Record<string, unknown>,
      sanitizeObject(req.query) as Record<string, unknown>
    )
  }
  if (req.params) req.params = sanitizeObject(req.params) as Record<string, string>
  next()
}
