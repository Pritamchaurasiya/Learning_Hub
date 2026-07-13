/**
 * Test Expiry Job
 *
 * Periodically scans for IN_PROGRESS test attempts that have exceeded their
 * time limit and auto-submits them. This ensures:
 *  - Data integrity: stale IN_PROGRESS records don't pollute analytics
 *  - Fair scoring: students can't keep timed tests open indefinitely
 *  - Growth Engine: XP and topic performance are updated for timed-out tests
 *  - Leaderboard accuracy: scores from expired tests are correctly recorded
 *
 * Schedule: Every 2 minutes (configurable via TEST_EXPIRY_INTERVAL_MS env var)
 *
 * The job also feeds the analytics pipeline by dispatching growth events
 * and topic performance updates for each auto-submitted test.
 */

import { testEngineService } from '../services/TestEngineService'
// Removed unused imports
import logger from '../utils/logger'

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
const INTERVAL_MS = parseInt(process.env.TEST_EXPIRY_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS), 10)

let intervalId: ReturnType<typeof setInterval> | undefined

/**
 * Run a single expiry sweep:
 *  1. Auto-submit all expired timed tests
 *  2. For each auto-submitted test, dispatch growth + analytics events
 */
async function runExpirySweep(): Promise<void> {
  try {
    const submittedCount = await testEngineService.autoSubmitExpiredTests()

    if (submittedCount > 0) {
      logger.info(`[TestExpiryJob] Auto-submitted ${submittedCount} expired test(s)`)

      // Note: Growth and Analytics jobs are safely handled downstream
      // by TestScoringService during the actual transaction commit.
    }
  } catch (error) {
    logger.error(
      '[TestExpiryJob] Sweep failed',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

/**
 * Start the test expiry scheduler.
 * Runs immediately on first call, then repeats at INTERVAL_MS.
 */
export function startTestExpiryJob(): void {
  if (intervalId) return

  // Run initial sweep immediately
  void runExpirySweep()

  intervalId = setInterval(() => {
    void runExpirySweep()
  }, INTERVAL_MS)

  // Prevent the interval from keeping the process alive during shutdown
  intervalId.unref?.()

  logger.info(`[TestExpiryJob] Scheduler started (every ${Math.round(INTERVAL_MS / 1000)}s)`)
}

/**
 * Stop the test expiry scheduler.
 */
export function stopTestExpiryJob(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = undefined
    logger.info('[TestExpiryJob] Scheduler stopped')
  }
}
