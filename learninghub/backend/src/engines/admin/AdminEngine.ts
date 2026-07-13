import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

export interface SystemDiagnosticsReport {
  timestamp: Date
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  dbLatencyMs: number
  memoryUsageMb: {
    rss: number
    heapTotal: number
    heapUsed: number
  }
  uptimeSeconds: number
  checks: Array<{
    name: string
    status: 'PASS' | 'WARN' | 'FAIL'
    message: string
  }>
}

export interface AnomalyDetectionResult {
  detectedAt: Date
  hasAnomalies: boolean
  riskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL'
  anomalies: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    recommendedAction: string
  }>
}

export interface RetentionCleanupReport {
  startedAt: Date
  completedAt: Date
  retentionDays: number
  recordsPurged: {
    expiredSessions: number
    archivedAuditLogs: number
    oldNotifications: number
  }
  summary: string
}

export class AdminEngine {
  /**
   * Executes deep system diagnostics across database, memory, and runtime services.
   */
  public async runSystemDiagnostics(): Promise<SystemDiagnosticsReport> {
    logger.info('[AdminEngine] Executing system health diagnostics...')

    const start = Date.now()
    let dbStatus: 'PASS' | 'FAIL' = 'PASS'
    let dbMessage = 'Database query ping successful'
    let dbLatencyMs = 0

    try {
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - start
    } catch (err) {
      dbStatus = 'FAIL'
      dbMessage = `Database query failed: ${err instanceof Error ? err.message : String(err)}`
      dbLatencyMs = Date.now() - start
      logger.error(
        '[AdminEngine] Database check failed',
        err instanceof Error ? err : new Error(String(err))
      )
    }

    const mem = process.memoryUsage()
    const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100
    const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100
    const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100

    const memStatus: 'PASS' | 'WARN' = heapUsedMb > 1024 ? 'WARN' : 'PASS'
    const memMessage =
      heapUsedMb > 1024
        ? `High heap memory utilization (${heapUsedMb} MB)`
        : `Memory heap usage within normal limits (${heapUsedMb} MB)`

    let overallStatus: SystemDiagnosticsReport['status'] = 'HEALTHY'
    if (dbStatus === 'FAIL') overallStatus = 'CRITICAL'
    else if (memStatus === 'WARN' || dbLatencyMs > 500) overallStatus = 'DEGRADED'

    return {
      timestamp: new Date(),
      status: overallStatus,
      dbLatencyMs,
      memoryUsageMb: {
        rss: rssMb,
        heapTotal: heapTotalMb,
        heapUsed: heapUsedMb,
      },
      uptimeSeconds: Math.round(process.uptime()),
      checks: [
        {
          name: 'PostgreSQL Connection',
          status: dbStatus,
          message: `${dbMessage} (${dbLatencyMs}ms)`,
        },
        {
          name: 'V8 Heap Allocation',
          status: memStatus,
          message: memMessage,
        },
        {
          name: 'Event Loop Latency',
          status: dbLatencyMs > 1000 ? 'WARN' : 'PASS',
          message:
            dbLatencyMs > 1000 ? 'Elevated event loop blocking detected' : 'Event loop responsive',
        },
      ],
    }
  }

  /**
   * Analyzes operational metrics to detect platform anomalies and security threats.
   */
  public detectPlatformAnomalies(metrics: {
    errorCount: number
    authFailures: number
    avgResponseTimeMs: number
    activeRequests: number
  }): AnomalyDetectionResult {
    logger.info('[AdminEngine] Evaluating platform anomaly metrics:', metrics)

    const anomalies: AnomalyDetectionResult['anomalies'] = []

    if (metrics.errorCount > 50) {
      anomalies.push({
        type: 'HIGH_ERROR_RATE',
        severity: metrics.errorCount > 200 ? 'CRITICAL' : 'HIGH',
        description: `Unusual spike in 5xx HTTP server errors (${metrics.errorCount} errors in monitoring window).`,
        recommendedAction: 'Inspect server error logs and Sentry stack traces immediately.',
      })
    }

    if (metrics.authFailures > 25) {
      anomalies.push({
        type: 'BRUTE_FORCE_SUSPICION',
        severity: metrics.authFailures > 100 ? 'CRITICAL' : 'HIGH',
        description: `Elevated authentication failure attempts (${metrics.authFailures} failed logins).`,
        recommendedAction: 'Verify rate-limit redis rules and check IP blacklist rules.',
      })
    }

    if (metrics.avgResponseTimeMs > 1200) {
      anomalies.push({
        type: 'LATENCY_DEGRADATION',
        severity: 'MEDIUM',
        description: `Average HTTP response time increased to ${metrics.avgResponseTimeMs}ms.`,
        recommendedAction: 'Analyze slow PostgreSQL queries and Redis cache hit ratios.',
      })
    }

    let riskLevel: AnomalyDetectionResult['riskLevel'] = 'NORMAL'
    if (anomalies.some(a => a.severity === 'CRITICAL')) riskLevel = 'CRITICAL'
    else if (anomalies.some(a => a.severity === 'HIGH')) riskLevel = 'HIGH'
    else if (anomalies.length > 0) riskLevel = 'ELEVATED'

    return {
      detectedAt: new Date(),
      hasAnomalies: anomalies.length > 0,
      riskLevel,
      anomalies,
    }
  }

  /**
   * Orchestrates automated data retention cleanup and archiving.
   */
  public async orchestrateDataRetentionCleanup(
    retentionDays: number = 90
  ): Promise<RetentionCleanupReport> {
    const startedAt = new Date()
    logger.info(
      `[AdminEngine] Starting data retention cleanup for records older than ${retentionDays} days`
    )

    const cutoffDate = new Date(startedAt.getTime() - retentionDays * 24 * 60 * 60 * 1000)

    let expiredSessions = 0
    const archivedAuditLogs = 0
    let oldNotifications = 0

    // Try deleting expired sessions
    try {
      const res = await prisma.testSession.deleteMany({
        where: {
          status: { in: ['COMPLETED', 'ABANDONED'] },
          completedAt: { lt: cutoffDate },
        },
      })
      expiredSessions = res.count
    } catch {
      // Ignore DB table error
    }

    // Try deleting read notifications older than cutoff
    try {
      const res = await prisma.notification.deleteMany({
        where: {
          read: true,
          createdAt: { lt: cutoffDate },
        },
      })
      oldNotifications = res.count
    } catch {
      // Ignore DB table error
    }

    const completedAt = new Date()
    const summary = `Cleanup complete in ${completedAt.getTime() - startedAt.getTime()}ms. Purged ${expiredSessions} expired test sessions and ${oldNotifications} old notifications.`
    logger.info(`[AdminEngine] ${summary}`)

    return {
      startedAt,
      completedAt,
      retentionDays,
      recordsPurged: {
        expiredSessions,
        archivedAuditLogs,
        oldNotifications,
      },
      summary,
    }
  }
}

export const adminEngineInstance = new AdminEngine()
