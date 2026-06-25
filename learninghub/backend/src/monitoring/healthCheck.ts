import { Request, Response } from 'express'
import { prisma } from '../config'

const startTime = Date.now()

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  uptimeHuman: string
  timestamp: string
  environment: string
  checks: {
    database: { status: string; latencyMs: number; error?: string }
    memory: {
      status: string
      heapUsedMB: number
      heapTotalMB: number
      rssMB: number
      percentUsed: number
    }
    system: { status: string; nodeVersion: string; platform: string; cpuUsage: NodeJS.CpuUsage }
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Comprehensive health check endpoint
 *     description: Reports database connectivity, redis connectivity, memory usage, system info, and uptime.
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System is completely healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 uptimeHuman:
 *                   type: string
 *       503:
 *         description: System is degraded or unhealthy
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const uptimeMs = Date.now() - startTime
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100
  const heapTotalMB = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100
  const rssMB = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100
  const percentUsed = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

  // Database check
  let dbStatus = 'ok'
  let dbLatency = 0
  let dbError: string | undefined

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    if (dbLatency > 1000) {
      dbStatus = 'slow'
    }
  } catch (err) {
    dbStatus = 'error'
    dbError = err instanceof Error ? err.message : 'Unknown database error'
  }

  // Redis check
  const { cacheService } = await import('../services/CacheService')
  let redisStatus = 'ok'
  const redisEnabled = process.env.REDIS_ENABLED === 'true'
  if (redisEnabled) {
    const isRedisHealthy = await cacheService.healthCheck()
    if (!isRedisHealthy) {
      redisStatus = 'error'
    }
  } else {
    redisStatus = 'disabled'
  }

  // Memory check
  const memoryStatus = percentUsed > 90 ? 'critical' : percentUsed > 75 ? 'warning' : 'ok'

  // Overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (dbStatus === 'error') overallStatus = 'unhealthy'
  else if (dbStatus === 'slow' || memoryStatus === 'warning' || redisStatus === 'error')
    overallStatus = 'degraded'
  else if (memoryStatus === 'critical') overallStatus = 'unhealthy'

  const health: HealthStatus & { checks: { redis: { status: string } } } = {
    status: overallStatus,
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: uptimeMs,
    uptimeHuman: formatUptime(uptimeMs),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        ...(dbError && { error: dbError }),
      },
      redis: {
        status: redisStatus,
      },
      memory: {
        status: memoryStatus,
        heapUsedMB,
        heapTotalMB,
        rssMB,
        percentUsed,
      },
      system: {
        status: 'ok',
        nodeVersion: process.version,
        platform: process.platform,
        cpuUsage: process.cpuUsage(),
      },
    },
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200
  res.status(statusCode).json(health)
}

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Lightweight liveness probe
 *     description: Returns 200 if the process is alive. No dependency checks.
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Service is alive
 */
export function livenessProbe(_req: Request, res: Response): void {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() })
}

/**
 * Readiness probe — checks if the service can handle requests.
 * Verifies database connectivity.
 *
 * GET /api/v1/health/ready
 */
export async function readinessProbe(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`

    let redisReady = true
    if (process.env.REDIS_ENABLED === 'true') {
      const { cacheService } = await import('../services/CacheService')
      redisReady = await cacheService.healthCheck()
    }

    if (!redisReady) {
      res.status(503).json({
        status: 'not_ready',
        reason: 'redis_unavailable',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({
      status: 'not_ready',
      reason: 'database_unavailable',
      timestamp: new Date().toISOString(),
    })
  }
}
