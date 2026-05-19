import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import jwt from 'jsonwebtoken'
import { AuthService } from '../services'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jwtConfig } from '../config'
import { prisma } from '../config'
import logger from '../utils/logger'

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_TOKEN',
      })
      return
    }

    const token = authHeader.substring(7)
    const authService = new AuthService(prisma)

    try {
      const decoded = authService.verifyAccessToken(token)

      // Check if user still exists and is active
      const user = await authService.getUserById(decoded.userId)
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        })
        return
      }

      if (user.deletedAt) {
        res.status(401).json({
          success: false,
          message: 'Account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        })
        return
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        res.status(401).json({
          success: false,
          message: 'Account is temporarily locked',
          code: 'ACCOUNT_LOCKED',
        })
        return
      }

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      }

      next()
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        })
        return
      }

      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      })
    }
  } catch (error) {
    logger.error(
      'Authentication middleware error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    })
  }
}

/**
 * Optional Authentication Middleware
 * Doesn't fail if no token provided, but attaches user if valid token exists
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.substring(7)
    const authService = new AuthService(prisma)

    try {
      const decoded = authService.verifyAccessToken(token)
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      }
    } catch {
      // Invalid token is OK for optional auth
    }

    next()
  } catch (error) {
    logger.error(
      'Optional auth middleware error',
      error instanceof Error ? error : new Error(String(error))
    )
    next()
  }
}

/**
 * Role-based Authorization Middleware
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_TOKEN',
      })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
      })
      return
    }

    next()
  }
}

/**
 * Admin Authorization Middleware
 */
export const authorizeAdmin = authorize('ADMIN', 'SUPERADMIN')

/**
 * Instructor or Admin Authorization Middleware
 */
export const authorizeInstructor = authorize('INSTRUCTOR', 'ADMIN', 'SUPERADMIN')

/**
 * Super Admin Authorization Middleware
 */
export const authorizeSuperAdmin = authorize('SUPERADMIN')

/**
 * Request ID Middleware
 * Generates unique request ID for tracing
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

  req.requestId = requestId
  res.setHeader('X-Request-ID', requestId)

  next()
}

/**
 * Request Logging Middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }

    if (res.statusCode >= 500) {
      logger.error('Request completed with error', undefined, logData)
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData)
    } else {
      logger.info('Request completed', logData)
    }
  })

  next()
}
