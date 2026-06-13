import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/auth'
import { prisma } from '../config'
import { sendError } from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'

type UserAccountStatus = {
  id: string
  deletedAt: Date | null
  lockedUntil: Date | null
}

const getCachedUserAccountStatus = async (userId: string): Promise<UserAccountStatus | null> => {
  const cacheKey = `auth:user:${userId}`
  let user = await cacheService.get<UserAccountStatus>(cacheKey)

  if (!user) {
    user = (await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true, lockedUntil: true },
    })) as UserAccountStatus | null

    if (user) {
      await cacheService.set(cacheKey, user, 60) // 1 minute TTL
    }
  }

  return user
}

const isAccountActive = (user: UserAccountStatus): boolean => {
  return !user.deletedAt && !(user.lockedUntil && user.lockedUntil > new Date())
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    const token = authHeader.substring(7)

    try {
      const decoded = verifyAccessToken(token)

      // Cache user lookup to avoid DB hit on every request
      const user = await getCachedUserAccountStatus(decoded.userId)

      if (!user) {
        sendError(res, 'User not found', 401, 'USER_NOT_FOUND')
        return
      }

      if (!isAccountActive(user)) {
        if (user.deletedAt) {
          sendError(res, 'Account has been deactivated', 401, 'ACCOUNT_DEACTIVATED')
          return
        }

        sendError(res, 'Account is temporarily locked', 401, 'ACCOUNT_LOCKED')
        return
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      }

      next()
    } catch (error) {
      // jwt.verify throws TokenExpiredError (name='TokenExpiredError') when token is expired
      if (
        error instanceof Error &&
        (error.name === 'TokenExpiredError' || error.message === 'Token expired')
      ) {
        sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED')
        return
      }
      sendError(res, 'Invalid token', 401, 'INVALID_TOKEN')
    }
  } catch (error) {
    logger.error(
      'Authentication middleware error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendError(res, 'Authentication error', 500, 'AUTH_ERROR')
  }
}

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

    try {
      const decoded = verifyAccessToken(token)
      const user = await getCachedUserAccountStatus(decoded.userId)

      if (user && isAccountActive(user)) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        }
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

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN')
      return
    }

    next()
  }
}

export const authorizeAdmin = authorize('ADMIN', 'SUPERADMIN')
export const authorizeInstructor = authorize('INSTRUCTOR', 'ADMIN', 'SUPERADMIN')
export const authorizeSuperAdmin = authorize('SUPERADMIN')

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

  req.requestId = requestId
  res.setHeader('X-Request-ID', requestId)

  next()
}

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
      logger.error('Request completed with error', new Error(`HTTP ${res.statusCode}`), logData)
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData)
    } else {
      logger.info('Request completed', logData)
    }
  })

  next()
}
