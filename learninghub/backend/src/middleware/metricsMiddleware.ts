import { Request, Response, NextFunction } from 'express'
import { httpRequestDuration, httpRequestTotal } from '../utils/metrics'

function normalizeMetricsRoute(rawPath: string): string {
  if (!rawPath) return '/'
  return rawPath
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b[c0-9a-z]{24,25}\b/gi, ':id')
    .replace(/\/(\d+)(?=\/|$)/g, '/:id')
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const rawRoute = req.route
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.baseUrl
        ? `${req.baseUrl}${req.path}`
        : req.path
    const route = normalizeMetricsRoute(rawRoute)
    const method = req.method
    const statusCode = res.statusCode.toString()

    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)
    httpRequestTotal.inc({ method, route, status_code: statusCode })
  })

  next()
}
