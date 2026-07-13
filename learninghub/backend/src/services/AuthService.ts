import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { PrismaClient, User, UserRole } from '@prisma/client'
import { UserRepository } from '../repositories'
import { AuditService } from './AuditService'
import { cacheService } from './CacheService'
import { jwtConfig, bcryptConfig, validatePasswordStrength } from '../config'

import logger from '../utils/logger'
import { emailService } from './EmailService'

export interface RegisterInput {
  email: string
  password: string
  username?: string
  role?: UserRole
}

export interface LoginInput {
  email: string
  password: string
  deviceId?: string
  deviceName?: string
  deviceType?: string
  ipAddress?: string
  userAgent?: string
}

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginResult {
  user: Omit<User, 'password' | 'mfaSecret'>
  tokens: AuthTokens
}

export class AuthService {
  private userRepository: UserRepository
  private auditService: AuditService

  constructor(
    private prisma: PrismaClient,
    auditService?: AuditService
  ) {
    this.userRepository = new UserRepository(prisma)
    this.auditService = auditService ?? new AuditService(prisma)
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput, ipAddress?: string): Promise<LoginResult> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password)
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // Check if email is taken (use generic message to prevent enumeration)
    const existingUser = await this.userRepository.findByEmail(input.email)
    if (existingUser) {
      throw new Error('Registration failed: Invalid request')
    }

    // Check if username is taken (use generic message to prevent enumeration)
    if (input.username) {
      const existingUsername = await this.userRepository.findByUsername(input.username)
      if (existingUsername) {
        throw new Error('Registration failed: Invalid request')
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, bcryptConfig.rounds)

    // Create user
    const user = await this.userRepository.create({
      email: input.email,
      password: hashedPassword,
      username: input.username,
      role: input.role ?? ('STUDENT' as UserRole),
    })

    // Log audit event
    await this.auditService.log({
      action: 'CREATE',
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      description: 'User registered',
      ipAddress,
    })

    // Send verification email
    try {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await this.prisma.verificationToken.upsert({
        where: { userId: user.id },
        update: { token: hashedToken, expiresAt },
        create: { userId: user.id, token: hashedToken, expiresAt },
      })
      await emailService.sendVerificationEmail(user.email, rawToken, user.username ?? undefined)
    } catch (error) {
      logger.error(
        'Failed to send verification email during registration',
        error instanceof Error ? error : new Error(String(error))
      )
    }

    // Generate tokens
    const tokens = await this.generateTokens(user)

    return {
      user: this.sanitizeUser(user),
      tokens,
    }
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<LoginResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email)
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes`)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password)
    if (!isValidPassword) {
      // Increment failed login attempts
      await this.userRepository.incrementFailedLogins(user.id)

      // Log failed attempt
      await this.auditService.log({
        action: 'LOGIN',
        userId: user.id,
        description: 'Failed login attempt',
        severity: 'WARNING',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      })

      throw new Error('Invalid credentials')
    }

    // Update login statistics
    await this.userRepository.incrementLoginCount(user.id)

    // Create session
    await this.createSession(user.id, {
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      deviceType: input.deviceType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })

    // Log successful login
    await this.auditService.log({
      action: 'LOGIN',
      userId: user.id,
      description: 'User logged in successfully',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })

    // Generate tokens
    const tokens = await this.generateTokens(user)

    // Cache user data
    await cacheService.set(cacheService.userKey(user.id), this.sanitizeUser(user), 300)

    return {
      user: this.sanitizeUser(user),
      tokens,
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as TokenPayload

      // Check if token exists in database and is not revoked
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: tokenHash },
      })

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid refresh token')
      }

      // Get user
      const user = await this.userRepository.findById(decoded.userId)
      if (!user || user.deletedAt) {
        throw new Error('User not found or deleted')
      }

      // Mark old token as used atomically — prevents race condition on concurrent refreshToken calls
      const updateResult = await this.prisma.$transaction(async tx => {
        const updated = await tx.refreshToken.updateMany({
          where: { id: storedToken.id, usedAt: null },
          data: { usedAt: new Date() },
        })
        if (updated.count === 0) {
          throw new Error('Refresh token already used — possible token reuse attack')
        }
        return this.generateTokens(user)
      })

      return updateResult
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      }
      throw new Error('Invalid refresh token')
    }
  }

  /**
   * Logout user
   */
  async logout(
    userId?: string,
    refreshToken?: string,
    ipAddress?: string,
    accessToken?: string
  ): Promise<void> {
    // Revoke refresh token if provided
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
      await this.prisma.refreshToken.updateMany({
        where: { token: tokenHash, ...(userId && { userId }) },
        data: { revokedAt: new Date() },
      })
    }

    // Blacklist current access token
    if (accessToken) {
      const hashedAccess = crypto.createHash('sha256').update(accessToken).digest('hex')
      // Max access token life is 15 minutes (900s), so we cache the blacklist for 900s
      await cacheService.set(`bl:token:${hashedAccess}`, 'revoked', 900)
    }

    // Update lastActive if userId provided
    if (userId) {
      await this.prisma.user
        .update({
          where: { id: userId },
          data: { lastActive: new Date() },
        })
        .catch(() => {}) // Ignore errors for lastActive update

      // Clear user cache
      await cacheService.delete(cacheService.userKey(userId))
    }

    // Log logout if userId provided
    if (userId) {
      await this.auditService.log({
        action: 'LOGOUT',
        userId,
        description: 'User logged out',
        ipAddress,
      })
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(userId: string, ipAddress?: string, accessToken?: string): Promise<void> {
    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    // Clear all user sessions
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    })

    // Globally blacklist all previously issued access tokens for this user for 15 mins
    await cacheService.set(`bl:user:${userId}`, Date.now(), 900)

    if (accessToken) {
      const hashedAccess = crypto.createHash('sha256').update(accessToken).digest('hex')
      await cacheService.set(`bl:token:${hashedAccess}`, 'revoked', 900)
    }

    // Clear user cache
    await cacheService.deletePattern(`user:${userId}*`)

    // Log security event
    await this.auditService.log({
      action: 'LOGOUT',
      userId,
      description: 'User logged out from all devices',
      severity: 'INFO',
      ipAddress,
    })
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.rounds)

    // Update password
    await this.userRepository.update(userId, { password: hashedPassword })

    // Revoke all existing tokens (force re-login)
    await this.logoutAllDevices(userId, ipAddress)

    // Log password change
    await this.auditService.log({
      action: 'PASSWORD_CHANGE',
      userId,
      description: 'Password changed',
      severity: 'INFO',
      ipAddress,
    })
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      throw new Error('Invalid token')
    }
  }

  /**
   * Get user by ID (with caching)
   */
  async getUserById(userId: string): Promise<Omit<User, 'password' | 'mfaSecret'> | null> {
    // Try cache first
    const cached = await cacheService.get<Omit<User, 'password' | 'mfaSecret'>>(
      cacheService.userKey(userId)
    )
    if (cached) return cached

    // Get from database
    const user = await this.userRepository.findById(userId)
    if (!user) return null

    const sanitized = this.sanitizeUser(user)

    // Cache for 5 minutes
    await cacheService.set(cacheService.userKey(userId), sanitized, 300)

    return sanitized
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
    })

    const refreshToken = jwt.sign(
      { ...payload, tokenId: crypto.randomUUID() },
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions['expiresIn'],
        algorithm: jwtConfig.algorithm as jwt.Algorithm,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    )

    // Store refresh token in DB for revocation tracking
    const refreshExpiresAt = new Date()
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7)

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshExpiresAt,
      },
    })

    // Clean up old refresh tokens (keep only last 10 per user)
    const tokensToKeep = await this.prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true },
    })
    if (tokensToKeep.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          id: { notIn: tokensToKeep.map(t => t.id) },
          revokedAt: null,
        },
      })
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    }
  }

  /**
   * Create user session
   */
  private async createSession(
    userId: string,
    sessionData: {
      deviceId?: string
      deviceName?: string
      deviceType?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    await this.prisma.userSession.create({
      data: {
        userId,
        sessionToken: crypto.randomBytes(32).toString('hex'),
        deviceId: sessionData.deviceId,
        deviceName: sessionData.deviceName,
        deviceType: sessionData.deviceType,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        expiresAt,
      },
    })

    // Limit sessions per user
    const maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER ?? '5', 10)
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastUsedAt: 'desc' },
    })

    if (sessions.length > maxSessions) {
      const sessionsToRevoke = sessions.slice(maxSessions)
      const idsToRevoke = sessionsToRevoke.map(s => s.id)
      await this.prisma.userSession.updateMany({
        where: { id: { in: idsToRevoke } },
        data: { isRevoked: true, revokedAt: new Date() },
      })
    }
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Omit<User, 'password' | 'mfaSecret'> {
    const { password: _, mfaSecret: __, ...sanitized } = user
    return sanitized as Omit<User, 'password' | 'mfaSecret'>
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      username?: string
      email?: string
      bio?: string
      location?: string
      website?: string
    },
    ipAddress?: string
  ): Promise<Omit<User, 'password' | 'mfaSecret'>> {
    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format')
      }

      // Check if email is taken by another user
      const existingUser = await this.userRepository.isEmailTaken(data.email, userId)
      if (existingUser) {
        throw new Error('Email is already in use')
      }
    }

    // Update user
    const updatedUser = await this.userRepository.update(userId, {
      ...(data.username && { username: data.username }),
      ...(data.email && {
        email: data.email.toLowerCase().trim(),
        emailVerified: false,
      }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.website !== undefined && { website: data.website }),
    })

    // Log profile update
    await this.auditService.log({
      action: data.email ? 'EMAIL_CHANGE' : 'SETTINGS_CHANGE',
      userId,
      description: data.email ? 'Email address changed' : 'Profile updated',
      severity: data.email ? 'WARNING' : 'INFO',
      ipAddress,
    })

    return this.sanitizeUser(updatedUser)
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, ipAddress?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.local`,
        username: null,
      },
    })

    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    })

    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'account_deleted' },
    })

    // Log deletion
    await this.auditService.log({
      action: 'DELETE',
      userId,
      description: 'Account deleted',
      ipAddress,
    })
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      // Don't leak user existence
      return
    }

    // Invalidate existing active reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const token = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Using emailService from outside (imported at the top)
    await emailService.sendPasswordResetEmail(user.email, rawToken, user.username ?? undefined)

    // Log event
    await this.auditService.log({
      action: 'SETTINGS_CHANGE',
      userId: user.id,
      description: 'Password reset requested',
      severity: 'INFO',
    })
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    if (user.emailVerified) {
      throw new Error('Email already verified')
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const token = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.prisma.verificationToken.upsert({
      where: { userId },
      update: { token, expiresAt },
      create: {
        userId,
        token,
        expiresAt,
      },
    })

    await emailService.sendVerificationEmail(user.email, rawToken, user.username ?? undefined)
  }

  /**
   * Verify email
   */
  async verifyEmail(rawToken: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    })

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired verification token')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.verificationToken.delete({
        where: { token: hashedToken },
      }),
    ])

    // Log event
    await this.auditService.log({
      action: 'LOGIN', // close enough, or user updated
      userId: verificationToken.userId,
      description: 'Email verified',
      severity: 'INFO',
    })
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    })

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      throw new Error('Invalid or expired reset token')
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.rounds)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ])

    // Log password reset
    await this.auditService.log({
      action: 'PASSWORD_CHANGE',
      userId: resetToken.userId,
      description: 'Password reset',
      ipAddress,
    })
  }
}

export default AuthService
