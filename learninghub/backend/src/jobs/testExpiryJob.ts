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
import { jobQueueService } from '../services/JobQueueService'
import { prisma } from '../prismaClient'
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

      // Dispatch growth events for auto-submitted tests
      // We query the most recently timed-out tests to award XP
      const recentTimeouts = await prisma.testResult.findMany({
        where: {
          status: 'TIMEOUT',
          completedAt: {
            gte: new Date(Date.now() - INTERVAL_MS * 2), // Only very recent ones
          },
        },
        select: {
          userId: true,
          testId: true,
          percentage: true,
          passed: true,
          questionResults: true,
        },
        take: submittedCount,
      })

      for (const result of recentTimeouts) {
        // Award test_completed XP via job queue (gracefully degrades if Redis is down)
        await jobQueueService
          .addGrowthJob({
            userId: result.userId,
            action: 'test_completed',
          })
          .catch(e =>
            logger.error(
              '[TestExpiryJob] Failed to queue growth job',
              e instanceof Error ? e : new Error(String(e))
            )
          )

        // Dispatch analytics for topic performance tracking
        const questionResults = Array.isArray(result.questionResults)
          ? (result.questionResults as any[])
          : []

        if (questionResults.length > 0) {
          await jobQueueService
            .addAnalyticsJob({
              userId: result.userId,
              testResultId: result.testId,
              questionResults: questionResults.map((qr: any) => ({
                questionId: qr.question_id ?? '',
                topicName: qr.topic_name ?? 'General',
                isCorrect: qr.is_correct ?? false,
              })),
            })
            .catch(e =>
              logger.error(
                '[TestExpiryJob] Failed to queue analytics job',
                e instanceof Error ? e : new Error(String(e))
              )
            )
        }
      }
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
