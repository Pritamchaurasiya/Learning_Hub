import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { asyncHandler } from '../utils/errorHandler'
import { generateToken, generateRefreshToken, hashToken } from '../utils/auth'
import { bcryptConfig } from '../config'
import type { UserRole } from '@prisma/client'
import { MfaService } from '../services/MfaService'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendValidationError,
} from '../utils/responseHelper'
import { setAuthCookies } from '../utils/cookies'

const refreshTokenExpiresAt = (): Date => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

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

export const adminLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR')
    return
  }

  const normalizedEmail = email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      username: true,
      failedLogins: true,
      lockedUntil: true,
      mfaEnabled: true,
      deletedAt: true,
    },
  })

  if (!user || user.deletedAt || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    logger.warn('Admin login attempt with invalid credentials', { email: normalizedEmail })
    sendUnauthorized(res, 'Invalid admin credentials')
    return
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    sendError(
      res,
      `Account locked. Try again in ${remainingMinutes} minutes`,
      401,
      'ACCOUNT_LOCKED'
    )
    return
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    const newFailedLogins = user.failedLogins + 1
    const maxAttempts = 5
    const lockoutDuration = 30 * 60 * 1000

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedLogins,
        lockedUntil: newFailedLogins >= maxAttempts ? new Date(Date.now() + lockoutDuration) : null,
      },
    })

    logger.warn('Admin login attempt with invalid password', {
      userId: user.id,
      failedLogins: newFailedLogins,
    })
    sendUnauthorized(res, 'Invalid admin credentials')
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActive: new Date(),
      failedLogins: 0,
      lockedUntil: null,
      loginCount: { increment: 1 },
      lastLoginAt: new Date(),
    },
  })

  if (user.mfaEnabled) {
    logger.info('Admin login requires MFA', { adminId: user.id, email: user.email })
    sendSuccess(res, {
      mfaRequired: true,
      userId: user.id,
    })
    return
  }

  const token = generateToken(user.id, user.email, user.role)
  const refreshToken = generateRefreshToken(user.id, user.email, user.role)
  await storeRefreshToken(user.id, refreshToken)

  logger.info('Admin login successful', { adminId: user.id, email: user.email })

  setAuthCookies(res, { accessToken: token, refreshToken })

  sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      username: user.username ?? 'Admin',
      role: user.role,
    },
  })
})

export const verifyMfa = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, token } = req.body as { userId: string; token: string }

  if (!userId || !token) {
    sendValidationError(res, 'User ID and MFA token are required')
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      mfaEnabled: true,
      deletedAt: true,
    },
  })

  if (!user || user.deletedAt || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    sendUnauthorized(res, 'Invalid request')
    return
  }

  const isValid = await MfaService.validateToken(userId, token)
  if (!isValid) {
    logger.warn('Invalid MFA token for admin user', { adminId: userId })
    sendUnauthorized(res, 'Invalid MFA token')
    return
  }

  const accessToken = generateToken(user.id, user.email, user.role)
  const refreshToken = generateRefreshToken(user.id, user.email, user.role)
  await storeRefreshToken(user.id, refreshToken)

  logger.info('Admin MFA verified successfully', { adminId: userId })

  setAuthCookies(res, { accessToken, refreshToken })

  sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      username: user.username ?? 'Admin',
      role: user.role,
    },
  })
})

export const adminRegister = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, username, adminSecret } = req.body as {
    email: string
    password: string
    username: string
    adminSecret: string
  }

  if (!email || !password || !username || !adminSecret) {
    sendError(res, 'All fields are required', 400, 'VALIDATION_ERROR')
    return
  }

  const expectedSecret = process.env.ADMIN_SECRET
  if (!expectedSecret) {
    logger.error('Admin registration attempted but ADMIN_SECRET not configured')
    sendError(res, 'Admin registration is not properly configured', 500, 'CONFIG_ERROR')
    return
  }
  const adminSecretBuf = Buffer.from(adminSecret)
  const expectedSecretBuf = Buffer.from(expectedSecret)
  const secretsMatch =
    adminSecretBuf.length === expectedSecretBuf.length &&
    crypto.timingSafeEqual(adminSecretBuf, expectedSecretBuf)
  if (!secretsMatch) {
    logger.warn('Invalid admin registration attempt with wrong secret', { email })
    sendForbidden(res, 'Invalid admin registration secret')
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (existingUser?.deletedAt) {
    sendConflict(res, 'User with this email already exists')
    return
  }

  if (existingUser) {
    sendConflict(res, 'User with this email already exists')
    return
  }

  const hashedPassword = await bcrypt.hash(password, bcryptConfig.rounds)

  const admin = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      username,
      role: 'ADMIN' as UserRole,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
    },
  })

  logger.info('Admin user created successfully', { adminId: admin.id, email: admin.email })

  const token = generateToken(admin.id, admin.email, admin.role)
  const refreshToken = generateRefreshToken(admin.id, admin.email, admin.role)
  await storeRefreshToken(admin.id, refreshToken)

  setAuthCookies(res, { accessToken: token, refreshToken })

  sendCreated(
    res,
    {
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    },
    'Admin account created successfully'
  )
})
