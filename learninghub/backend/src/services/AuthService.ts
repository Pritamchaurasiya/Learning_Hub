import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { PrismaClient, User, UserRole } from '@prisma/client'
import { UserRepository } from '../repositories'
import { AuditService } from './AuditService'
import { cacheService } from './CacheService'
import { jwtConfig, bcryptConfig, validatePasswordStrength } from '../config'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import logger from '../utils/logger'

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

    // Check if email is taken
    const existingUser = await this.userRepository.findByEmail(input.email)
    if (existingUser) {
      throw new Error('Email already registered')
    }

    // Check if username is taken
    if (input.username) {
      const existingUsername = await this.userRepository.findByUsername(input.username)
      if (existingUsername) {
        throw new Error('Username already taken')
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
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid refresh token')
      }

      // Get user
      const user = await this.userRepository.findById(decoded.userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Mark old token as used
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      })

      // Generate new tokens
      return await this.generateTokens(user)
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
  async logout(userId: string, refreshToken?: string, ipAddress?: string): Promise<void> {
    // Revoke refresh token if provided
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() },
      })
    }

    // Clear user cache
    await cacheService.delete(cacheService.userKey(userId))

    // Log logout
    await this.auditService.log({
      action: 'LOGOUT',
      userId,
      description: 'User logged out',
      ipAddress,
    })
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(userId: string, ipAddress?: string): Promise<void> {
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

    // Generate access token
    const accessToken = jwt.sign(payload, jwtConfig.accessSecret, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: jwtConfig.accessExpiresIn as any,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const refreshExpiresAt = new Date()
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7) // 7 days

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
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

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        id: { notIn: tokensToKeep.map(t => t.id) },
        revokedAt: null,
      },
    })

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
      for (const session of sessionsToRevoke) {
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { isRevoked: true, revokedAt: new Date() },
        })
      }
    }
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Omit<User, 'password' | 'mfaSecret'> {
    const { password: _, mfaSecret: __, ...sanitized } = user
    return sanitized as Omit<User, 'password' | 'mfaSecret'>
  }
}

export default AuthService
