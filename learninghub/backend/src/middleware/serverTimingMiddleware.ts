import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      timing?: {
        start: (name: string, description?: string) => void
        end: (name: string) => void
        record: (name: string, durationMs: number, description?: string) => void
      }
    }
  }
}

interface TimingMetric {
  name: string
  duration: number
  description?: string
}

/**
 * ServerTimingMiddleware
 *
 * Implements the W3C Server-Timing specification.
 * Adds precise microsecond-resolution timing metrics to HTTP response headers.
 * Browser DevTools Network tab will show exact Server processing times (DB, Cache, Engine, etc).
 */
export const serverTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint()
  const metrics: Map<string, TimingMetric> = new Map()
  const activeTimers: Map<string, bigint> = new Map()

  req.timing = {
    start: (name: string, description?: string) => {
      activeTimers.set(name, process.hrtime.bigint())
      if (description) {
        const existing = metrics.get(name)
        if (existing) existing.description = description
      }
    },
    end: (name: string) => {
      const start = activeTimers.get(name)
      if (start !== undefined) {
        const elapsedNs = Number(process.hrtime.bigint() - start)
        const durationMs = Math.round((elapsedNs / 1_000_000) * 100) / 100
        const existing = metrics.get(name)
        metrics.set(name, {
          name,
          duration: (existing?.duration ?? 0) + durationMs,
          description: existing?.description,
        })
        activeTimers.delete(name)
      }
    },
    record: (name: string, durationMs: number, description?: string) => {
      const rounded = Math.round(durationMs * 100) / 100
      metrics.set(name, {
        name,
        duration: rounded,
        description,
      })
    },
  }

  // Hook into res.end to write headers before payload is sent
  const originalEnd = res.end
  res.end = function (this: any, ...args: any[]): any {
    if (!res.headersSent) {
      const totalNs = Number(process.hrtime.bigint() - startTime)
      const totalMs = Math.round((totalNs / 1_000_000) * 100) / 100

      const timingParts: string[] = [`total;dur=${totalMs};desc="Total Request Processing"`]

      for (const [name, metric] of metrics.entries()) {
        const descPart = metric.description ? `;desc="${metric.description}"` : ''
        timingParts.push(`${name};dur=${metric.duration}${descPart}`)
      }

      res.setHeader('Server-Timing', timingParts.join(', '))
      res.setHeader('X-Response-Time', `${totalMs}ms`)
      res.setHeader('Keep-Alive', 'timeout=65, max=1000')
    }

    return (originalEnd as any).apply(this, args)
  } as any

  next()
}
