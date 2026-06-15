import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import os from 'os'
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendInternalError,
} from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.user?.userId) {
    sendUnauthorized(res)
    return false
  }
  const role = (req.user as Record<string, unknown>).role as string | undefined
  if (!role || (role !== 'ADMIN' && role !== 'SUPERADMIN')) {
    sendForbidden(res)
    return false
  }
  return true
}

async function checkDatabase(): Promise<{
  status: string
  latency?: string
  error?: string
}> {
  const start = performance.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = (performance.now() - start).toFixed(2)
    return { status: 'healthy', latency: `${latency}ms` }
  } catch (fetchErr) {
    logger.error(
      'Failed to fetch app stats for metrics',
      fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr))
    )
    return {
      status: 'unhealthy',
      error: fetchErr instanceof Error ? fetchErr.message : 'Unknown database error',
    }
  }
}

async function checkCache(): Promise<{
  status: string
  backend?: string
  latency?: string
  error?: string
}> {
  if (!cacheService.isAvailable()) {
    return { status: 'healthy', backend: 'in-memory' }
  }
  try {
    const start = performance.now()
    await cacheService.set('health_ping', 'pong', 10)
    const pong = await cacheService.get<string>('health_ping')
    if (pong === 'pong') {
      const latency = (performance.now() - start).toFixed(2)
      return { status: 'healthy', backend: 'redis', latency: `${latency}ms` }
    }
    return { status: 'unhealthy', error: 'Invalid cache ping response' }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown cache error',
    }
  }
}

export async function deepHealthCheck(req: Request, res: Response): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN'

    const [db, cache] = await Promise.all([checkDatabase(), checkCache()])

    const report: Record<string, unknown> = {
      status: db.status === 'healthy' && cache.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      components: {
        database: { status: db.status, latency: db.latency },
        cache: { status: cache.status, backend: cache.backend, latency: cache.latency },
      },
    }

    if (isAdmin) {
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const cpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += (cpu.times as Record<string, number>)[type]
        }
        totalIdle += cpu.times.idle
      }
      const cpuPercent = totalTick > 0 ? Math.round(((totalTick - totalIdle) / totalTick) * 100) : 0

      if (db.status !== 'healthy') report.status = 'critical'
      else if (usedMem / totalMem > 0.9 || cpuPercent > 90) report.status = 'degraded'
      ;(report.components as Record<string, unknown>).system = {
        memory_used_percent: Math.round((usedMem / totalMem) * 100),
        cpu_percent: cpuPercent,
        status: cpuPercent > 90 ? 'high-load' : 'ok',
      }
    }

    const httpStatus = report.status === 'critical' ? 503 : 200
    sendSuccess(res, report, undefined, httpStatus)
  } catch (error) {
    logger.error('deepHealthCheck error', error instanceof Error ? error : new Error(String(error)))
    sendInternalError(res)
  }
}

export async function getMetrics(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as Record<string, number>)[type]
      }
      totalIdle += cpu.times.idle
    }
    const cpuPercent = totalTick > 0 ? Math.round(((totalTick - totalIdle) / totalTick) * 100) : 0

    let appStats = { total_users: 0, total_courses: 0, total_enrollments: 0 }
    try {
      const [userCount, courseCount, enrollCount] = await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.userProgress.count(),
      ])
      appStats = {
        total_users: userCount,
        total_courses: courseCount,
        total_enrollments: enrollCount,
      }
    } catch (err) {
      logger.error(
        'Failed to fetch app stats for metrics',
        err instanceof Error ? err : new Error(String(err))
      )
    }

    sendSuccess(res, {
      timestamp: new Date().toISOString(),
      system: {
        cpu_percent: cpuPercent,
        cpu_count: cpus.length,
        memory_percent: Math.round((usedMem / totalMem) * 100),
        memory_used_gb: parseFloat((usedMem / 1073741824).toFixed(2)),
        memory_total_gb: parseFloat((totalMem / 1073741824).toFixed(2)),
      },
      application: appStats,
    })
  } catch (error) {
    logger.error('getMetrics error', error instanceof Error ? error : new Error(String(error)))
    sendInternalError(res)
  }
}

export async function getDatabaseStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const start = performance.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = parseFloat((performance.now() - start).toFixed(2))
    sendSuccess(res, {
      status: 'connected',
      response_time_ms: responseTime,
    })
  } catch {
    sendError(res, 'Database check failed', 503, 'DATABASE_ERROR')
  }
}

export async function getCacheStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const start = performance.now()
    if (!cacheService.isAvailable()) {
      sendSuccess(res, {
        status: 'connected',
        response_time_ms: parseFloat((performance.now() - start).toFixed(2)),
        test_value: 'in-memory',
      })
      return
    }
    await cacheService.set('health_ping', 'pong', 10)
    const pong = await cacheService.get<string>('health_ping')
    const responseTime = parseFloat((performance.now() - start).toFixed(2))
    if (pong === 'pong') {
      sendSuccess(res, { status: 'connected', response_time_ms: responseTime, test_value: 'ok' })
    } else {
      sendError(res, 'Invalid cache ping response', 503, 'CACHE_ERROR')
    }
  } catch {
    sendError(res, 'Cache check failed', 503, 'CACHE_ERROR')
  }
}

export async function getProcesses(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    sendSuccess(res, {
      processes: [
        {
          name: 'learninghub-api',
          status: 'running',
          uptime_seconds: Math.round(os.uptime()),
        },
      ],
    })
  } catch (error) {
    logger.error('getProcesses error', error instanceof Error ? error : new Error(String(error)))
    sendInternalError(res)
  }
}
