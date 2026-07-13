import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/auth'
import { prisma } from '../config'
import { sessionConfig } from '../config/security'
import { sendError } from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'
import { getAccessTokenFromCookie } from '../utils/cookies'

type UserAccountStatus = {
  id: string
  deletedAt: Date | null
  lockedUntil: Date | null
}

export interface DecodedTokenWithIat {
  userId: string
  email: string
  role: string
  iat?: number
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
      await cacheService.set(cacheKey, user, 60)
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
    const cookieToken = getAccessTokenFromCookie(req)
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken

    if (!token) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    try {
      const decoded = verifyAccessToken(token) as DecodedTokenWithIat

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
      const isBlacklisted = await cacheService.get(`bl:token:${hashedToken}`)
      if (isBlacklisted) {
        sendError(res, 'Token has been revoked', 401, 'TOKEN_REVOKED')
        return
      }

      const userLogoutAllTime = await cacheService.get<number>(`bl:user:${decoded.userId}`)
      if (userLogoutAllTime && decoded.iat && decoded.iat * 1000 < userLogoutAllTime) {
        sendError(res, 'Session revoked globally', 401, 'TOKEN_REVOKED')
        return
      }

      const user = await getCachedUserAccountStatus(decoded.userId)

      if (!user) {
        sendError(res, 'User not found', 401, 'USER_NOT_FOUND')
        return
      }

      if (!isAccountActive(user)) {
        sendError(
          res,
          user.deletedAt ? 'Account has been deactivated' : 'Account is temporarily locked',
          401,
          user.deletedAt ? 'ACCOUNT_DEACTIVATED' : 'ACCOUNT_LOCKED'
        )
        return
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      }

      const sessionId = req.headers['x-session-id'] as string | undefined
      if (sessionId) {
        const session = await prisma.userSession.findFirst({
          where: {
            userId: decoded.userId,
            sessionToken: sessionId,
            isRevoked: false,
            expiresAt: { gt: new Date() },
          },
          select: { id: true, lastUsedAt: true, createdAt: true },
        })

        if (!session) {
          sendError(res, 'Session expired or invalid', 401, 'SESSION_EXPIRED')
          return
        }

        const now = Date.now()
        const idleMs = now - session.lastUsedAt.getTime()
        if (idleMs > sessionConfig.idleTimeoutMinutes * 60 * 1000) {
          await prisma.userSession.update({
            where: { id: session.id },
            data: { isRevoked: true, revokedAt: new Date(now) },
          })
          sendError(res, 'Session expired due to inactivity', 401, 'SESSION_IDLE_TIMEOUT')
          return
        }

        const sessionAgeMs = now - session.createdAt.getTime()
        if (sessionAgeMs > sessionConfig.absoluteTimeoutMinutes * 60 * 1000) {
          await prisma.userSession.update({
            where: { id: session.id },
            data: { isRevoked: true, revokedAt: new Date(now) },
          })
          sendError(res, 'Session expired', 401, 'SESSION_ABSOLUTE_TIMEOUT')
          return
        }

        prisma.userSession
          .update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } })
          .catch((err: any) =>
            logger.error(
              'Failed to update session lastUsedAt',
              err instanceof Error ? err : new Error(String(err))
            )
          )
      }

      next()
    } catch (error) {
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
    const cookieToken = getAccessTokenFromCookie(req)
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken

    if (!token) {
      next()
      return
    }

    try {
      const decoded = verifyAccessToken(token)
      const user = await getCachedUserAccountStatus(decoded.userId)
      if (user && isAccountActive(user)) {
        req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role }
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

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN')
      return
    }

    next()
  }
}

export const authorizeAdmin = authorize('ADMIN', 'SUPERADMIN')
export const authorizeInstructor = authorize('INSTRUCTOR', 'ADMIN', 'SUPERADMIN')
export const authorizeSuperAdmin = authorize('SUPERADMIN')

export { requestId, requestLogger } from './requestLogger'
