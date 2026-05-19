import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { generateToken, generateRefreshToken } from '../utils/auth'
import { AuthenticationError, AuthorizationError, ValidationError } from '../utils/errors'
import type { UserRole } from '@prisma/client'

/**
 * Admin Authentication Controller
 * Handles admin-specific auth flows
 * Base route: /admin/auth
 */

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      throw new ValidationError('Email and password are required')
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
      },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      logger.warn('Admin login attempt with invalid credentials', { email: normalizedEmail })
      throw new AuthenticationError('Invalid admin credentials')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new AuthenticationError(`Account locked. Try again in ${remainingMinutes} minutes`)
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
          lockedUntil:
            newFailedLogins >= maxAttempts ? new Date(Date.now() + lockoutDuration) : null,
        },
      })

      logger.warn('Admin login attempt with invalid password', {
        userId: user.id,
        failedLogins: newFailedLogins,
      })
      throw new AuthenticationError('Invalid admin credentials')
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

    const token = generateToken(user.id, user.email, user.role)
    const refreshToken = generateRefreshToken(user.id, user.email, user.role)

    logger.info('Admin login successful', { adminId: user.id, email: user.email })

    res.json({
      status: 'success',
      data: {
        access_token: token,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username ?? 'Admin',
          role: user.role,
        },
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ status: 'error', message: error.message })
      return
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ status: 'error', message: error.message })
      return
    }
    logger.error('Admin login error', error instanceof Error ? error : new Error(String(error)))
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const adminRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, adminSecret } = req.body as {
      email: string
      password: string
      username: string
      adminSecret: string
    }

    // Validate required fields
    if (!email || !password || !username || !adminSecret) {
      throw new ValidationError('All fields are required')
    }

    // Verify admin secret (acts as a shared password for admin registration)
    const expectedSecret = process.env.ADMIN_SECRET
    if (!expectedSecret) {
      logger.error('Admin registration attempted but ADMIN_SECRET not configured')
      throw new AuthorizationError('Admin registration is not properly configured')
    }
    if (adminSecret !== expectedSecret) {
      logger.warn('Invalid admin registration attempt with wrong secret', { email })
      throw new AuthorizationError('Invalid admin registration secret')
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      res.status(409).json({ status: 'error', message: 'User with this email already exists' })
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin user with ADMIN role
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

    // Generate tokens for immediate login
    const token = generateToken(admin.id, admin.email, admin.role)
    const refreshToken = generateRefreshToken(admin.id, admin.email, admin.role)

    res.status(201).json({
      status: 'success',
      message: 'Admin account created successfully',
      data: {
        access_token: token,
        refresh_token: refreshToken,
        user: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          role: admin.role,
        },
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      res.status(403).json({ status: 'error', message: error.message })
      return
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ status: 'error', message: error.message })
      return
    }
    logger.error(
      'Admin registration error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
