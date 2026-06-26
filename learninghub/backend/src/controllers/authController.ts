import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../prismaClient'
import { generateToken, generateRefreshToken, verifyRefreshToken, hashToken } from '../utils/auth'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { cacheService } from '../services/CacheService'
import { emailService } from '../services/EmailService'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'
import { bcryptConfig } from '../config'

const REFRESH_TOKEN_DAYS = 7

const refreshTokenExpiresAt = (): Date =>
  new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

const storeRefreshToken = (userId: string, token: string) => {
  const tokenHash = hashToken(token)
  return prisma.refreshToken.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt: refreshTokenExpiresAt(),
    },
  })
}

// Extend Express Request for multer file uploads (reserved for future use)

type _MulterFile = {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination: string
  filename: string
  path: string
  buffer: Buffer
}

interface RequestWithFile extends Request {
  file?: Express.Multer.File
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail || !password) {
      sendValidationError(res, 'Email and password are required')
      return
    }

    // Validate password strength (defense in depth — Zod schema also validates at route level)
    const passwordErrors: string[] = []
    if (password.length < 8) passwordErrors.push('Password must be at least 8 characters')
    if (!/[A-Z]/.test(password)) passwordErrors.push('Password must contain an uppercase letter')
    if (!/[a-z]/.test(password)) passwordErrors.push('Password must contain a lowercase letter')
    if (!/[0-9]/.test(password)) passwordErrors.push('Password must contain a number')
    if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push('Password must contain a special character')
    if (password.length > 128) passwordErrors.push('Password must not exceed 128 characters')
    if (passwordErrors.length > 0) {
      sendValidationError(res, passwordErrors.join('; '))
      return
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      sendConflict(res, 'Email already exists')
      return
    }

    const hashedPassword = await bcrypt.hash(password, bcryptConfig.rounds)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        password: hashedPassword,
        role: 'STUDENT',
      },
    })

    const token = generateToken(user.id, user.email, user.role)
    const refreshToken = generateRefreshToken(user.id, user.email, user.role)
    await storeRefreshToken(user.id, refreshToken)

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    sendCreated(
      res,
      {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
        },
      },
      'Registration successful'
    )
  } catch (error) {
    logger.error('Register error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip,
    })
    sendInternalError(res)
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      sendUnauthorized(res, 'Invalid email or password')
      return
    }

    // SECURITY: Check account lockout before attempting password verification
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      sendUnauthorized(
        res,
        `Account temporarily locked. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
      )
      return
    }

    // SECURITY: Always verify password - no bypass allowed in any environment
    const isValidPassword = await bcrypt.compare(password, user.password)
    // SECURITY: Never log password validity — only log email (no auth result leakage)
    logger.info('Login attempt', { email: normalizedEmail })

    if (!isValidPassword) {
      // SECURITY: Increment failed login counter and lock after threshold
      const MAX_FAILED_ATTEMPTS = process.env.NODE_ENV === 'production' ? 5 : 100
      const LOCKOUT_MINUTES = 15
      const newFailedCount = (user.failedLogins ?? 0) + 1
      const lockUpdate: { failedLogins: number; lockedUntil?: Date } = {
        failedLogins: newFailedCount,
      }
      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        lockUpdate.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        logger.warn('Account locked due to multiple failed logins', {
          email: normalizedEmail,
          failedAttempts: newFailedCount,
          lockedUntilMinutes: LOCKOUT_MINUTES,
        })
      }
      await prisma.user.update({ where: { id: user.id }, data: lockUpdate })

      sendUnauthorized(res, 'Invalid email or password')
      return
    }

    // Successful login: reset failed attempts, track login metrics
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActive: new Date(),
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLogins: 0,
        lockedUntil: null,
      },
    })

    const token = generateToken(user.id, user.email, user.role)
    const refreshToken = generateRefreshToken(user.id, user.email, user.role)
    await storeRefreshToken(user.id, refreshToken)

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    sendSuccess(
      res,
      {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
          lastActive: user.lastActive,
        },
      },
      'Login successful'
    )
  } catch (error) {
    logger.error('Login error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip,
    })
    sendInternalError(res)
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token ?? req.body.refresh_token ?? req.body.refresh
    if (refreshToken) {
      // Revoke the specific refresh token
      const tokenHash = hashToken(refreshToken)
      await prisma.refreshToken.updateMany({
        where: { token: tokenHash },
        data: { revokedAt: new Date() },
      })
    }

    res.clearCookie('refresh_token')
    res.clearCookie('csrf-token')

    // Optionally update user session if using session tracking
    const userId = req.user?.userId
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActive: new Date() },
      })
    }

    sendSuccess(res, null, 'Logged out successfully')
  } catch (error) {
    logger.error('Logout error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
      ip: req.ip,
    })
    sendInternalError(res)
  }
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token ?? req.body.refresh_token ?? req.body.refresh
    if (!refreshToken) {
      sendValidationError(res, 'Refresh token is required')
      return
    }

    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded?.userId) {
      sendUnauthorized(res, 'Invalid refresh token')
      return
    }

    const tokenHash = hashToken(refreshToken)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    })

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.usedAt ||
      storedToken.expiresAt < new Date()
    ) {
      if (storedToken) {
        await prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        })
      }
      sendUnauthorized(res, 'Invalid or expired refresh token')
      return
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.deletedAt) {
      sendUnauthorized(res, 'User no longer exists')
      return
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    })

    const access_token = generateToken(user.id, user.email, user.role)
    const new_refresh_token = generateRefreshToken(user.id, user.email, user.role)

    const newTokenHash = hashToken(new_refresh_token)
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newTokenHash,
        expiresAt: refreshTokenExpiresAt(),
      },
    })

    res.cookie('refresh_token', new_refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    sendSuccess(res, {
      access_token,
    })
  } catch (error) {
    logger.error('Token refresh error', error instanceof Error ? error : new Error(String(error)))
    sendUnauthorized(res, 'Invalid or expired refresh token')
  }
}

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const [user, bookmarks, achievements, progress] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.bookmark.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.userAchievement.findMany({
        where: { userId },
        take: 20,
        orderBy: { unlockedAt: 'desc' },
      }),
      prisma.userProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          course: {
            select: { id: true, title: true, thumbnail: true },
          },
        },
      }),
    ])

    if (!user) {
      sendNotFound(res, 'User not found')
      return
    }

    const cacheKey = cacheService.generateKey('user_perf', userId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let performance = await cacheService.get<any>(cacheKey)

    if (!performance) {
      performance = {
        test_stats: {
          total_tests: 0,
          average_score: 0,
          best_score: 0,
          worst_score: 0,
        },
        recent_tests: [] as Array<{
          title: string
          mode: string
          score: number
          passed: boolean
          completed_at: Date | null
        }>,
      }

      try {
        performance = await queryOptimizationService.getUserPerformanceSummary(userId)
        await cacheService.set(cacheKey, performance, 120) // Cache for 2 minutes
      } catch (error) {
        logger.warn('Get user profile performance summary unavailable', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const lastActiveKey = cacheService.generateKey('last_active', userId)
    const lastActiveUpdate = await cacheService.get<number>(lastActiveKey)
    const now = Date.now()
    if (!lastActiveUpdate || now - lastActiveUpdate > 300_000) {
      void prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } }).catch(() => {})
      void cacheService.set(lastActiveKey, now, 300)
    }

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        lastActive: user.lastActive,
        progress,
      },
      performance: performance.test_stats,
      recent_tests: performance.recent_tests,
      bookmarks,
      achievements,
    })
  } catch (error) {
    logger.error(
      'Get user profile error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }
    const { username, email, bio, location, website } = req.body

    // Check if email is already taken by another user
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined
    if (normalizedEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: userId } },
      })
      if (existingUser) {
        sendConflict(res, 'Email is already in use')
        return
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(normalizedEmail && {
          email: normalizedEmail,
          emailVerified: false, // Require re-verification when email changes
        }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        xp: true,
        level: true,
        streak: true,
        lastActive: true,
      },
    })

    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully')
  } catch (error) {
    logger.error(
      'Update profile error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        email: req.body.email,
      }
    )
    sendInternalError(res)
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      sendValidationError(res, 'Current password and new password are required')
      return
    }

    // Validate new password complexity
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      sendValidationError(
        res,
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      )
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      sendNotFound(res, 'User not found')
      return
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      sendUnauthorized(res, 'Current password is incorrect')
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.rounds)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      }),
    ])

    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    logger.error(
      'Change password error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    sendInternalError(res)
  }
}

export const uploadAvatar = async (req: RequestWithFile, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    // Support both multipart (req.file) and base64 (req.body.avatar)
    let avatarPath: string

    if (req.file) {
      // Multer uploaded file
      avatarPath = `/avatars/${req.file.filename}`
    } else if (req.body.avatar && typeof req.body.avatar === 'string') {
      const avatar = req.body.avatar.trim()
      const isDataUrl = avatar.startsWith('data:image/')
      const isHttpsUrl = avatar.startsWith('https://')
      if ((!isDataUrl && !isHttpsUrl) || avatar.length > 2_000_000) {
        sendValidationError(res, 'Invalid avatar format')
        return
      }
      avatarPath = avatar
    } else {
      sendValidationError(res, 'No avatar provided')
      return
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    })

    sendSuccess(res, { user: updatedUser }, 'Avatar uploaded successfully')
  } catch (error) {
    logger.error('Upload avatar error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
    })
    sendInternalError(res)
  }
}

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.local`,
        username: null,
      },
    })

    await prisma.refreshToken.deleteMany({
      where: { userId },
    })

    await prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'account_deleted' },
    })

    logger.audit('ACCOUNT_DELETION', userId, { reason: 'user_requested' })

    sendSuccess(res, null, 'Account deleted successfully')
  } catch (error) {
    logger.error(
      'Delete account error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      sendNotFound(res, 'User not found')
      return
    }

    if (user.emailVerified) {
      sendValidationError(res, 'Email already verified')
      return
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const token = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.verificationToken.upsert({
      where: { userId },
      update: { token, expiresAt },
      create: {
        userId,
        token,
        expiresAt,
      },
    })

    await emailService.sendVerificationEmail(user.email, rawToken, user.username ?? undefined)

    sendSuccess(res, null, 'Verification email sent')
  } catch (error) {
    logger.error(
      'Send verification email error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.params.token as string
    const hashedToken = hashToken(rawToken)

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    })

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      sendValidationError(res, 'Invalid or expired verification token')
      return
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ])

    sendSuccess(res, null, 'Email verified successfully')
  } catch (error) {
    logger.error('Verify email error', error instanceof Error ? error : new Error(String(error)), {
      token: req.params.token,
    })
    sendInternalError(res)
  }
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail) {
      sendValidationError(res, 'Email is required')
      return
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      sendSuccess(
        res,
        null,
        'If an account exists with that email, a password reset link has been sent'
      )
      return
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const token = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    await emailService.sendPasswordResetEmail(user.email, rawToken, user.username ?? undefined)

    sendSuccess(
      res,
      null,
      'If an account exists with that email, a password reset link has been sent'
    )
  } catch (error) {
    logger.error(
      'Forgot password error',
      error instanceof Error ? error : new Error(String(error)),
      { email: req.body.email }
    )
    sendInternalError(res)
  }
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      sendValidationError(res, 'Token and new password are required')
      return
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      sendValidationError(
        res,
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      )
      return
    }

    // Hash the token before lookup (security fix - tokens stored hashed in DB)
    const hashedToken = hashToken(token)
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    })

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      sendValidationError(res, 'Invalid or expired reset token')
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.rounds)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      // Invalidate ALL pending reset tokens for this user (prevent token reuse)
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ])

    sendSuccess(res, null, 'Password reset successfully')
  } catch (error) {
    logger.error(
      'Reset password error',
      error instanceof Error ? error : new Error(String(error)),
      { token: req.body.token }
    )
    sendInternalError(res)
  }
}

export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) return sendUnauthorized(res, 'User not authenticated')

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: { include: { course: true } },
        achievements: true,
        certificates: true,
      },
    })

    if (!userData) return sendNotFound(res, 'User not found')

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        createdAt: userData.createdAt,
      },
      progress: userData.progress,
      achievements: userData.achievements,
      certificates: userData.certificates,
      enrollments: userData.progress.map(e => ({
        courseId: e.courseId,
        courseTitle: e.course.title,
        enrolledAt: e.createdAt,
        progress: e.progress,
      })),
    }

    res.setHeader('Content-disposition', 'attachment; filename=my-learninghub-data.json')
    res.setHeader('Content-type', 'application/json')
    res.write(JSON.stringify(exportData, null, 2), function () {
      res.end()
    })
  } catch (error) {
    logger.error(
      'Error exporting user data',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    sendInternalError(res, 'Failed to export user data')
  }
}
