/**
 * Stale Session Cleanup Job
 *
 * Purges abandoned test sessions that are stuck in IN_PROGRESS status
 * beyond a configurable threshold. Unlike the TestExpiryJob (which handles
 * TIMED tests that exceed their time limit), this job handles:
 *
 *  - Untimed practice sessions abandoned mid-test (no timeLimit set)
 *  - Tests where the user closed the browser/app without submitting
 *  - Edge cases where the frontend crashed during a test
 *
 * Instead of scoring these, we mark them as ABANDONED so they don't
 * pollute analytics or block re-attempts.
 *
 * Schedule: Every 30 minutes (configurable via STALE_SESSION_INTERVAL_MS)
 * Threshold: Sessions older than 24 hours (configurable via STALE_SESSION_THRESHOLD_HOURS)
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes
const INTERVAL_MS = parseInt(
  process.env.STALE_SESSION_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS),
  10
)

const STALE_THRESHOLD_HOURS = parseInt(process.env.STALE_SESSION_THRESHOLD_HOURS ?? '24', 10)

let intervalId: ReturnType<typeof setInterval> | undefined

/**
 * Run a single stale session cleanup sweep.
 */
async function runStaleSessionSweep(): Promise<void> {
  try {
    const thresholdDate = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)

    // Find stale sessions: IN_PROGRESS with startedAt older than threshold
    // Only target tests with NO time limit (timed tests are handled by TestExpiryJob)
    const staleResult = await prisma.testResult.updateMany({
      where: {
        status: 'IN_PROGRESS',
        startedAt: { lt: thresholdDate },
        test: {
          timeLimit: { lte: 0 }, // Only untimed or 0-time-limit tests
        },
      },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
      },
    })

    if (staleResult.count > 0) {
      logger.info(
        `[StaleSessionJob] Cleaned up ${staleResult.count} abandoned test session(s) older than ${STALE_THRESHOLD_HOURS}h`
      )
    }

    // Also clean up old stale sessions for TIMED tests that somehow slipped
    // through the TestExpiryJob (e.g., server was down when they expired)
    const staleTimed = await prisma.testResult.updateMany({
      where: {
        status: 'IN_PROGRESS',
        startedAt: { lt: thresholdDate },
        test: {
          timeLimit: { gt: 0 },
        },
      },
      data: {
        status: 'TIMEOUT',
        completedAt: new Date(),
      },
    })

    if (staleTimed.count > 0) {
      logger.info(
        `[StaleSessionJob] Force-expired ${staleTimed.count} stale timed test(s) older than ${STALE_THRESHOLD_HOURS}h`
      )
    }
  } catch (error) {
    logger.error(
      '[StaleSessionJob] Sweep failed',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

/**
 * Start the stale session cleanup scheduler.
 */
export function startStaleSessionJob(): void {
  if (intervalId) return

  // Run initial sweep after a short delay (let other jobs initialize first)
  setTimeout(() => void runStaleSessionSweep(), 10_000)

  intervalId = setInterval(() => {
    void runStaleSessionSweep()
  }, INTERVAL_MS)

  intervalId.unref?.()

  logger.info(
    `[StaleSessionJob] Scheduler started (every ${Math.round(INTERVAL_MS / 60_000)}min, threshold: ${STALE_THRESHOLD_HOURS}h)`
  )
}

/**
 * Stop the stale session cleanup scheduler.
 */
export function stopStaleSessionJob(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = undefined
    logger.info('[StaleSessionJob] Scheduler stopped')
  }
}
