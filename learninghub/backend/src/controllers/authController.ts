import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { generateToken, generateRefreshToken } from '../utils/auth'
import { AuthService } from '../services/AuthService'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { cacheService } from '../services/CacheService'
import { MfaService } from '../services/MfaService'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendValidationError,
} from '../utils/responseHelper'
import { validatePasswordStrength } from '../config'
import { config } from '../utils/env'
import { asyncHandler } from '../utils/errorHandler'
import { trackFailedAuth, clearFailedAuth } from '../middleware/anomalyDetection'
import jwt from 'jsonwebtoken'

function generateMfaSessionToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'mfa_login' }, config.jwtRefreshSecret, {
    expiresIn: '5m',
  })
}

function verifyMfaSessionToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret) as {
      userId: string
      purpose: string
    }
    if (decoded.purpose !== 'mfa_login') return null
    return decoded.userId
  } catch {
    return null
  }
}
import { uploadFileToStorage, FileType } from '../services/FileUploadService'
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookie,
  getAccessTokenFromCookie,
} from '../utils/cookies'

const authService = new AuthService(prisma as any)

interface RequestWithFile extends Request {
  file?: Express.Multer.File
}

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, username } = req.body
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || !password) {
    sendValidationError(res, 'Email and password are required')
    return
  }

  const validation = validatePasswordStrength(password)
  if (!validation.valid) {
    sendValidationError(res, validation.errors.join('; '))
    return
  }

  try {
    const result = await authService.register(
      { email: normalizedEmail, password, username },
      req.ip
    )

    setAuthCookies(res, {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    })

    sendCreated(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
          xp: result.user.xp,
          level: result.user.level,
          streak: result.user.streak,
        },
        // COMPAT DUALITY NOTE: tokens are returned in the body AND as httpOnly
        // cookies. Body exposure is kept only for legacy SPA/mobile clients that
        // cannot read httpOnly cookies; web clients MUST use the cookies and
        // ignore the body copy (never persist it to localStorage). Mitigations
        // kept: 15-min access TTL, single-use rotating refresh tokens with reuse
        // detection (AuthService.refreshToken marks usedAt atomically), hashed
        // storage, per-access-token blacklist (`bl:token:*`) and global
        // logout-all blacklist (`bl:user:*`) enforced in authMiddleware.
        token: result.tokens.accessToken,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        tokens: {
          access: result.tokens.accessToken,
          refresh: result.tokens.refreshToken,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      },
      'Registration successful'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      message === 'Registration failed: Invalid request' ||
      message === 'Email already registered' ||
      message === 'Username already taken'
    ) {
      sendValidationError(res, 'Registration failed. Email or username may be unavailable')
      return
    }
    if (message.startsWith('Password validation failed')) {
      sendValidationError(res, message.replace('Password validation failed: ', ''))
      return
    }
    throw error
  }
})

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  try {
    const result = await authService.login({
      email: normalizedEmail,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.user.mfaEnabled) {
      const mfaSessionToken = generateMfaSessionToken(result.user.id)
      sendSuccess(
        res,
        {
          mfaRequired: true,
          mfaSessionToken,
        },
        'MFA verification required'
      )
      return
    }

    setAuthCookies(res, {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    })

    const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    void clearFailedAuth(clientIp)

    sendSuccess(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
          xp: result.user.xp,
          level: result.user.level,
          streak: result.user.streak,
          lastActive: result.user.lastActive,
        },
        // COMPAT DUALITY NOTE (see register): body copy kept for legacy clients;
        // web clients must prefer the httpOnly cookies. Refresh rotation +
        // blacklists (see authMiddleware/AuthService.logout) still apply.
        token: result.tokens.accessToken,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        tokens: {
          access: result.tokens.accessToken,
          refresh: result.tokens.refreshToken,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      },
      'Login successful'
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('Account locked')) {
      sendUnauthorized(res, message)
      return
    }
    if (message === 'Invalid credentials' || message === 'Invalid email or password') {
      const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown'
      void trackFailedAuth(clientIp)
      sendUnauthorized(res, 'Invalid email or password')
      return
    }
    throw error
  }
})

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.body.refresh_token ?? req.body.refresh ?? getRefreshTokenFromCookie(req)
  const accessToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : getAccessTokenFromCookie(req)
  const userId = req.user?.userId

  await authService.logout(userId, refreshToken, req.ip, accessToken)

  clearAuthCookies(res)

  sendSuccess(res, null, 'Logged out successfully')
})

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const refreshToken =
    req.body.refresh_token ?? req.body.refresh ?? req.body.refreshToken ?? getRefreshTokenFromCookie(req)
  if (!refreshToken) {
    sendValidationError(res, 'Refresh token is required')
    return
  }

  try {
    const result = await authService.refreshToken(refreshToken)
    // COMPAT DUALITY NOTE (see register): cookies are primary; body copy is for
    // legacy clients. Rotation is single-use with reuse detection in AuthService.
    setAuthCookies(res, result)
    sendSuccess(res, {
      message: 'Token refreshed',
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })
  } catch {
    sendUnauthorized(res, 'Invalid or expired refresh token')
  }
})

export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const [user, achievements, bookmarks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xp: true,
        level: true,
        streak: true,
        lastActive: true,
        emailVerified: true,
        examPreference: {
          include: {
            exam: { select: { id: true, name: true, slug: true } },
            country: { select: { id: true, name: true, code: true } },
            subjects: { select: { id: true, name: true } },
          },
        },
      },
    }),
    // PAGINATION ENFORCED: hard-capped take (20/50) with recency ordering so /me
    // cannot fan out to unbounded rows. Full history lives behind dedicated
    // paginated endpoints (achievements/bookmarks) — do not raise these caps.
    prisma.userAchievement.findMany({
      where: { userId },
      take: 20,
      orderBy: { unlockedAt: 'desc' },
    }),
    Promise.resolve(
      prisma.questionBookmark.findMany({
        where: { userId },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { question: { select: { id: true, text: true, type: true } } },
      })
    )
      .catch(() => [])
      .then(res => res || []),
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
      recent_tests: [],
    }

    try {
      performance = await queryOptimizationService.getUserPerformanceSummary(userId)
      await cacheService.set(cacheKey, performance, 120)
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
    void prisma.user
      .update({ where: { id: userId }, data: { lastActive: new Date() } })
      .catch((err: any) => {
        logger.warn('Failed to update lastActive', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
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
      emailVerified: user.emailVerified,
      examPreference: user.examPreference,
    },
    performance: performance.test_stats,
    recent_tests: performance.recent_tests,
    bookmarks,
    achievements,
  })
})

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { username, email, bio, location, website } = req.body

  try {
    const updatedUser = await authService.updateProfile(
      userId,
      { username, email, bio, location, website },
      req.ip
    )
    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Email is already in use') {
      sendConflict(res, 'Email is already in use')
      return
    }
    if (error instanceof Error && error.message === 'Invalid email format') {
      sendValidationError(res, 'Invalid email format')
      return
    }
    throw error
  }
})

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    sendValidationError(res, 'Current password and new password are required')
    return
  }

  try {
    await authService.changePassword(userId, currentPassword, newPassword, req.ip)
    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      sendNotFound(res, 'User not found')
      return
    }
    if (error instanceof Error && error.message === 'Current password is incorrect') {
      sendUnauthorized(res, 'Current password is incorrect')
      return
    }
    if (error instanceof Error && error.message.includes('Password validation failed')) {
      sendValidationError(res, error.message.replace('Password validation failed: ', ''))
      return
    }
    throw error
  }
})

export const uploadAvatar = asyncHandler(
  async (req: RequestWithFile, res: Response): Promise<void> => {
    const userId = req.user!.userId

    let avatarPath: string

    if (req.file) {
      avatarPath = await uploadFileToStorage(req.file, FileType.AVATAR)
    } else if (req.body.avatar && typeof req.body.avatar === 'string') {
      const avatar = req.body.avatar.trim()
      // AVATAR ALLOWLIST: https:// URLs only (no data: URIs — they bypass
      // content-type checks and inflate DB rows), 500KB cap, extension allowlist.
      // Multer file uploads above are already MIME-checked + 2MB-capped in
      // FileUploadService; this branch covers URL-form avatars.
      const MAX_AVATAR_URL_BYTES = 500_000
      const ALLOWED_AVATAR_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
      if (!avatar.startsWith('https://') || avatar.length > MAX_AVATAR_URL_BYTES) {
        sendValidationError(res, 'Invalid avatar format')
        return
      }
      let parsed: URL
      try {
        parsed = new URL(avatar)
      } catch {
        sendValidationError(res, 'Invalid avatar format')
        return
      }
      if (parsed.protocol !== 'https:') {
        sendValidationError(res, 'Invalid avatar format')
        return
      }
      const lowerPath = parsed.pathname.toLowerCase()
      const hasAllowedExt = ALLOWED_AVATAR_EXTS.some(ext => lowerPath.endsWith(ext))
      // Allow extensionless CDN URLs (e.g. signed image endpoints) only when they
      // carry an image content hint; otherwise require an image extension so
      // `https://evil.example/payload.svg` / `.html` cannot be stored as avatar.
      const hasImageHint = /[?&](format|fm|content-type|ct)=[^&]*image/i.test(avatar)
      if (!hasAllowedExt && !hasImageHint) {
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
  }
)

export const deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  try {
    await authService.deleteAccount(userId, req.ip)
    sendSuccess(res, null, 'Account deleted successfully')
  } catch (error) {
    throw error
  }
})

export const sendVerificationEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId

    try {
      await authService.sendVerificationEmail(userId)
      sendSuccess(res, null, 'Verification email sent')
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        sendNotFound(res, 'User not found')
        return
      }
      if (error instanceof Error && error.message === 'Email already verified') {
        sendValidationError(res, 'Email already verified')
        return
      }
      throw error
    }
  }
)

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.params.token as string

  try {
    await authService.verifyEmail(rawToken)
    sendSuccess(res, null, 'Email verified successfully')
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired verification token') {
      sendValidationError(res, 'Invalid or expired verification token')
      return
    }
    throw error
  }
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail) {
    sendValidationError(res, 'Email is required')
    return
  }

  await authService.forgotPassword(normalizedEmail)

  sendSuccess(
    res,
    null,
    'If an account exists with that email, a password reset link has been sent'
  )
})

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    sendValidationError(res, 'Token and new password are required')
    return
  }

  try {
    await authService.resetPassword(token, newPassword, req.ip)
    sendSuccess(res, null, 'Password reset successfully')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Password validation failed')) {
      sendValidationError(res, error.message.replace('Password validation failed: ', ''))
      return
    }
    if (error instanceof Error && error.message === 'Invalid or expired reset token') {
      sendValidationError(res, 'Invalid or expired reset token')
      return
    }
    throw error
  }
})

export const exportUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  // GDPR EXPORT CAPS + RATE-LIMIT NOTE: take(200/500) are hard caps with recency
  // ordering so a single export cannot scan unbounded history. Route-level
  // throttling must stay enabled (strictLimiter on /export-data or equivalent);
  // full-history export for large accounts should use cursor pagination across
  // multiple signed downloads rather than raising these caps.
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      achievements: {
        take: 200,
        orderBy: { unlockedAt: 'desc' },
      },
      testResults: {
        take: 500,
        orderBy: { completedAt: 'desc' },
        select: {
          testId: true,
          score: true,
          completedAt: true,
          passed: true,
          test: {
            select: { title: true },
          },
        },
      },
    },
  })

  if (!userData) {
    sendNotFound(res, 'User not found')
    return
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      role: userData.role,
      createdAt: userData.createdAt,
    },
    achievements: userData.achievements,
    testResults: userData.testResults.map((tr: any) => ({
      testId: tr.testId,
      testTitle: tr.test?.title ?? 'Unknown Test',
      score: tr.score,
      completedAt: tr.completedAt,
      passed: tr.passed,
    })),
  }

  res.setHeader('Content-disposition', 'attachment; filename=my-learninghub-data.json')
  res.setHeader('Content-type', 'application/json')
  res.end(JSON.stringify(exportData, null, 2))
})

export const getPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  // SELECTIVE SELECT: avoid full-row exam/country/subject payloads on this hot path.
  const preference = await prisma.userExamPreference.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      countryId: true,
      examId: true,
      subjectIds: true,
      difficulty: true,
      dailyGoal: true,
      createdAt: true,
      updatedAt: true,
      exam: { select: { id: true, name: true, slug: true } },
      country: { select: { id: true, name: true, code: true } },
      subjects: { select: { id: true, name: true } },
    },
  })
  sendSuccess(res, preference)
})

export const updatePreferences = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId

    const { countryId, examId, subjectIds, difficulty, dailyGoal } = req.body
    const formattedSubjectIds = Array.isArray(subjectIds) ? subjectIds : []

    let validSubjectIds = formattedSubjectIds
    if (formattedSubjectIds.length > 0) {
      const existingSubjects = await prisma.subject.findMany({
        where: { id: { in: formattedSubjectIds } },
        select: { id: true },
      })
      validSubjectIds = existingSubjects.map((s: { id: string }) => s.id)
    }

    const preference = await prisma.userExamPreference.upsert({
      where: { userId },
      update: {
        countryId: countryId ?? null,
        examId: examId ?? null,
        subjectIds: validSubjectIds,
        difficulty: difficulty ?? 'MEDIUM',
        dailyGoal: dailyGoal ?? 10,
        subjects: {
          set: validSubjectIds.map((id: string) => ({ id })),
        },
      },
      create: {
        userId,
        countryId: countryId ?? null,
        examId: examId ?? null,
        subjectIds: validSubjectIds,
        difficulty: difficulty ?? 'MEDIUM',
        dailyGoal: dailyGoal ?? 10,
        subjects: {
          connect: validSubjectIds.map((id: string) => ({ id })),
        },
      },
      include: {
        exam: true,
        country: true,
        subjects: true,
      },
    })

    sendSuccess(res, preference, 'Preferences synchronized successfully')
  }
)

export const setupMfa = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    sendNotFound(res, 'User not found')
    return
  }
  if (user.mfaEnabled) {
    sendConflict(res, 'MFA is already enabled on this account')
    return
  }
  const result = await MfaService.generateSecret(userId, user.email)
  sendSuccess(res, result, 'MFA secret generated successfully')
})

export const verifyAndEnableMfa = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { token } = req.body
    if (!token) {
      sendValidationError(res, 'MFA token is required')
      return
    }
    const verified = await MfaService.verifyAndEnable(userId, token)
    if (!verified) {
      sendUnauthorized(res, 'Invalid verification code')
      return
    }
    sendSuccess(res, null, 'MFA enabled successfully')
  }
)

export const disableMfa = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { token } = req.body
  if (!token) {
    sendValidationError(res, 'MFA token is required to disable MFA')
    return
  }
  const valid = await MfaService.validateToken(userId, token)
  if (!valid) {
    sendUnauthorized(res, 'Invalid MFA token')
    return
  }
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  })
  sendSuccess(res, null, 'MFA disabled successfully')
})

export const listSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const sessions = await prisma.userSession.findMany({
    where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      deviceName: true,
      deviceType: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  })
  sendSuccess(res, sessions)
})

export const revokeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const session = await prisma.userSession.findFirst({ where: { id, userId } })
  if (!session) {
    sendNotFound(res, 'Session not found')
    return
  }
  await prisma.userSession.update({
    where: { id },
    data: { isRevoked: true, revokedAt: new Date() },
  })
  sendSuccess(res, null, 'Session revoked')
})

export const verifyMfaLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { mfaSessionToken, token } = req.body
  if (!mfaSessionToken || !token) {
    sendValidationError(res, 'MFA session token and MFA token are required')
    return
  }

  const userId = verifyMfaSessionToken(mfaSessionToken)
  if (!userId) {
    sendUnauthorized(res, 'Invalid or expired MFA session')
    return
  }

  // Rate limit: max 5 MFA attempts per minute per user
  const mfaAttemptKey = `mfa_attempts:${userId}`
  const attempts = await cacheService.incrementWithExpiry(mfaAttemptKey, 1, 60_000)
  if (attempts > 5) {
    sendError(res, 'Too many MFA attempts. Try again later.', 429, 'MFA_RATE_LIMITED')
    return
  }

  const isValid = await MfaService.validateToken(userId, token)
  if (!isValid) {
    sendUnauthorized(res, 'Invalid MFA token')
    return
  }

  // Clear rate limit on success
  await cacheService.expire(mfaAttemptKey, 0)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    sendNotFound(res, 'User not found')
    return
  }

  const accessToken = generateToken(user.id, user.email, user.role)
  const newRefreshToken = generateRefreshToken(user.id, user.email, user.role)

  setAuthCookies(res, { accessToken, refreshToken: newRefreshToken })

  sendSuccess(
    res,
    {
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
    'MFA verified successfully'
  )
})
