import { Request, Response, NextFunction } from 'express'
import { register, httpRequestDuration, httpRequestTotal, databaseQueryDuration, errorTotal } from '../utils/metrics'

export class MonitoringService {
  static trackDbQuery(queryType: string, durationMs: number) {
    databaseQueryDuration.observe({ operation: queryType }, durationMs / 1000)
  }

  static trackApiError(endpoint: string, errorType: string) {
    errorTotal.inc({ type: `${endpoint}:${errorType}` })
  }

  static async getPrometheusMetrics(): Promise<string> {
    return register.metrics()
  }

  static getContentType(): string {
    return register.contentType
  }
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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

export const monitoringService = MonitoringService
export default monitoringService