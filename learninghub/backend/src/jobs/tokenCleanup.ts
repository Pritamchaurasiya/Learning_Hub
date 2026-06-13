/**
 * Token Cleanup Job
 *
 * Periodically purges expired and used tokens from the database
 * to prevent table bloat. Covers:
 * - RefreshToken (expired or used/revoked)
 * - PasswordResetToken (expired or used)
 * - VerificationToken (expired)
 *
 * Run on server startup and then every 6 hours.
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

/**
 * Delete tokens that are expired, used, or revoked.
 * Returns counts of deleted rows for logging.
 */
export async function cleanupExpiredTokens(): Promise<{
  refreshTokens: number
  passwordResetTokens: number
  verificationTokens: number
}> {
  const now = new Date()

  try {
    const [refreshResult, resetResult, verificationResult] = await Promise.all([
      // Refresh tokens: delete if expired OR (revoked/used more than 24h ago)
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            {
              AND: [
                { revokedAt: { not: null } },
                { revokedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
              ],
            },
            {
              AND: [
                { usedAt: { not: null } },
                { usedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
              ],
            },
          ],
        },
      }),
      // Password reset tokens: delete if expired or used
      prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      }),
      // Verification tokens: delete if expired
      prisma.verificationToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      }),
    ])

    return {
      refreshTokens: refreshResult.count,
      passwordResetTokens: resetResult.count,
      verificationTokens: verificationResult.count,
    }
  } catch (error) {
    logger.error('Token cleanup failed', error instanceof Error ? error : new Error(String(error)))
    return { refreshTokens: 0, passwordResetTokens: 0, verificationTokens: 0 }
  }
}

/**
 * Start the token cleanup scheduler.
 * Runs immediately on first call, then repeats every CLEANUP_INTERVAL_MS.
 */
let cleanupTimer: ReturnType<typeof setInterval> | undefined

export function startTokenCleanupScheduler(): void {
  // Run immediately on startup
  void cleanupExpiredTokens().then(counts => {
    const total = counts.refreshTokens + counts.passwordResetTokens + counts.verificationTokens
    if (total > 0) {
      logger.info('Token cleanup completed', {
        deletedRefreshTokens: counts.refreshTokens,
        deletedPasswordResetTokens: counts.passwordResetTokens,
        deletedVerificationTokens: counts.verificationTokens,
      })
    }
  })

  // Schedule recurring cleanup
  cleanupTimer = setInterval(async () => {
    const counts = await cleanupExpiredTokens()
    const total = counts.refreshTokens + counts.passwordResetTokens + counts.verificationTokens
    if (total > 0) {
      logger.info('Scheduled token cleanup completed', {
        deletedRefreshTokens: counts.refreshTokens,
        deletedPasswordResetTokens: counts.passwordResetTokens,
        deletedVerificationTokens: counts.verificationTokens,
      })
    }
  }, CLEANUP_INTERVAL_MS)

  logger.info(`Token cleanup scheduler started (every ${CLEANUP_INTERVAL_MS / 3600000}h)`)
}

export function stopTokenCleanupScheduler(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = undefined
    logger.info('Token cleanup scheduler stopped')
  }
}
