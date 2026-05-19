import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../prismaClient'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { emailService } from '../services/EmailService'

// Extend Express Request for multer file uploads (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      res.status(400).json({ status: 'error', message: 'Email and password are required' })
      return
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      res.status(409).json({ status: 'error', message: 'Email already exists' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

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

    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      data: {
        access_token: token,
        refresh_token: refreshToken,
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
    })
  } catch (error) {
    logger.error('Register error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password' })
      return
    }

    // SECURITY: Always verify password - no bypass allowed in any environment
    const isValidPassword = await bcrypt.compare(password, user.password)
    // SECURITY: Never log password validity — only log email (no auth result leakage)
    logger.info('Login attempt', { email: normalizedEmail })
    if (!isValidPassword) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password' })
      return
    }

    // Update lastActive to power admin dashboard '24h active users' metric
    await prisma.user.update({ where: { id: user.id }, data: { lastActive: new Date() } })

    const token = generateToken(user.id, user.email, user.role)
    const refreshToken = generateRefreshToken(user.id, user.email, user.role)

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        access_token: token,
        refresh_token: refreshToken,
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
    })
  } catch (error) {
    logger.error('Login error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.body.refresh_token ?? req.body.refresh
    if (!refreshToken) {
      res.status(400).json({ status: 'error', message: 'Refresh token is required' })
      return
    }

    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded?.userId) {
      res.status(401).json({ status: 'error', message: 'Invalid refresh token' })
      return
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
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
      res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.deletedAt) {
      res.status(401).json({ status: 'error', message: 'User no longer exists' })
      return
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    })

    const access_token = generateToken(user.id, user.email, user.role)
    const new_refresh_token = generateRefreshToken(user.id, user.email, user.role)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: new_refresh_token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    res.json({
      status: 'success',
      data: {
        access_token,
        refresh_token: new_refresh_token,
      },
    })
  } catch (error) {
    logger.error('Token refresh error', error instanceof Error ? error : new Error(String(error)))
    res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' })
  }
}

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const [user, performance, bookmarks, achievements] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      queryOptimizationService.getUserPerformanceSummary(userId),
      prisma.bookmark.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.userAchievement.findMany({
        where: { userId },
        take: 20,
        orderBy: { unlockedAt: 'desc' },
      }),
    ])

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }

    await prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } })

    res.json({
      status: 'success',
      data: {
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
        performance: performance.test_stats,
        recent_tests: performance.recent_tests,
        bookmarks,
        achievements,
      },
    })
  } catch (error) {
    logger.error(
      'Get user profile error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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
        res.status(409).json({ status: 'error', message: 'Email is already in use' })
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

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    })
  } catch (error) {
    logger.error(
      'Update profile error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        email: req.body.email,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ status: 'error', message: 'Current password and new password are required' })
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
      res.status(400).json({
        status: 'error',
        message:
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      res.status(401).json({ status: 'error', message: 'Current password is incorrect' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    res.json({
      status: 'success',
      message: 'Password changed successfully',
    })
  } catch (error) {
    logger.error(
      'Change password error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const uploadAvatar = async (req: RequestWithFile, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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
        res.status(400).json({ status: 'error', message: 'Invalid avatar format' })
        return
      }
      avatarPath = avatar
    } else {
      res.status(400).json({ status: 'error', message: 'No avatar provided' })
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

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: { user: updatedUser },
    })
  } catch (error) {
    logger.error('Upload avatar error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully',
    })
  } catch (error) {
    logger.error(
      'Delete account error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }

    if (user.emailVerified) {
      res.status(400).json({ status: 'error', message: 'Email already verified' })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
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

    await emailService.sendVerificationEmail(user.email, token, user.username || undefined)

    res.json({
      status: 'success',
      message: 'Verification email sent',
    })
  } catch (error) {
    logger.error(
      'Send verification email error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      res.status(400).json({ status: 'error', message: 'Invalid or expired verification token' })
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
        where: { token },
      }),
    ])

    res.json({
      status: 'success',
      message: 'Email verified successfully',
    })
  } catch (error) {
    logger.error('Verify email error', error instanceof Error ? error : new Error(String(error)), {
      token: req.params.token,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail) {
      res.status(400).json({ status: 'error', message: 'Email is required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      res.json({
        status: 'success',
        message: 'If an account exists with that email, a password reset link has been sent',
      })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    await emailService.sendPasswordResetEmail(user.email, token, user.username || undefined)

    res.json({
      status: 'success',
      message: 'If an account exists with that email, a password reset link has been sent',
    })
  } catch (error) {
    logger.error(
      'Forgot password error',
      error instanceof Error ? error : new Error(String(error)),
      { email: req.body.email }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      res.status(400).json({ status: 'error', message: 'Token and new password are required' })
      return
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      res.status(400).json({
        status: 'error',
        message:
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      })
      return
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      res.status(400).json({ status: 'error', message: 'Invalid or expired reset token' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ])

    res.json({
      status: 'success',
      message: 'Password reset successfully',
    })
  } catch (error) {
    logger.error(
      'Reset password error',
      error instanceof Error ? error : new Error(String(error)),
      { token: req.body.token }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
