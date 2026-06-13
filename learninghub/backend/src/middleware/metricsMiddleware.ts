import { Request, Response, NextFunction } from 'express'
import { httpRequestDuration, httpRequestTotal } from '../utils/metrics'

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const route = req.route?.path ?? req.path
    const method = req.method
    const statusCode = res.statusCode.toString()

    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)
    httpRequestTotal.inc({ method, route, status_code: statusCode })
  })

  next()
}
