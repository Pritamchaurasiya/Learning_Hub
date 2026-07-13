import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config'
import { sendError } from '../utils/responseHelper'
import logger from '../utils/logger'
import { sessionConfig } from '../config/security'

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

export async function sessionTimeoutMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId
    const sessionId = req.headers['x-session-id'] as string | undefined

    if (!userId || !sessionId) {
      next()
      return
    }

    const session = await prisma.userSession.findFirst({
      where: {
        userId,
        sessionToken: sessionId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    if (!session) {
      sendError(res, 'Session expired or invalid', 401, 'SESSION_EXPIRED')
      return
    }

    const now = new Date()
    const idleMinutes = sessionConfig.idleTimeoutMinutes
    const lastUsed = session.lastUsedAt
    const idleMs = now.getTime() - lastUsed.getTime()
    const idleMinutesElapsed = idleMs / (1000 * 60)

    if (idleMinutesElapsed > idleMinutes) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true, revokedAt: now },
      })
      sendError(res, 'Session expired due to inactivity', 401, 'SESSION_IDLE_TIMEOUT')
      return
    }

    const absoluteMinutes = sessionConfig.absoluteTimeoutMinutes
    const sessionAgeMinutes = (now.getTime() - session.createdAt.getTime()) / (1000 * 60)
    if (sessionAgeMinutes > absoluteMinutes) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true, revokedAt: now },
      })
      sendError(res, 'Session expired', 401, 'SESSION_ABSOLUTE_TIMEOUT')
      return
    }

    prisma.userSession
      .update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      })
      .catch((err: any) =>
        logger.error(
          'Failed to update session lastUsedAt',
          err instanceof Error ? err : new Error(String(err))
        )
      )
  } catch (error) {
    logger.error(
      'Session timeout middleware error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.locals.sessionValid = false
    sendError(res, 'Session validation failed', 500, 'SESSION_VALIDATION_ERROR')
    return
  }

  next()
}
