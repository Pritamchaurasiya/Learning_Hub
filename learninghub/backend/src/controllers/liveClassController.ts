import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { Prisma } from '@prisma/client'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendForbidden,
  sendInternalError,
} from '../utils/responseHelper'

export const listLiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query
    const { page, limit, skip } = getPaginationParams(req.query)

    const filters: Prisma.LiveSessionWhereInput = {}
    if (status) filters.status = status as string

    // Parallelize count + findMany
    const [total, sessions] = await Promise.all([
      prisma.liveSession.count({ where: filters }),
      prisma.liveSession.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
      }),
    ])

    const paginated = createPaginatedResponse(sessions, total, page, limit)
    sendSuccess(res, paginated.data, undefined, 200, paginated.meta)
  } catch (error) {
    logger.error(
      '[LiveClassController] listLiveSessions error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const createLiveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    // Role guard: only admin or instructor can create sessions
    const userRole = req.user?.role
    if (!userRole || !['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(userRole)) {
      sendForbidden(res, 'Only admins and instructors can create live sessions')
      return
    }

    const { title, instructorName, scheduledAt, durationMinutes, maxParticipants } = req.body
    const instructorId = req.user?.userId

    const session = await prisma.liveSession.create({
      data: {
        title,
        instructorName,
        instructorId,
        scheduledAt: new Date(scheduledAt),
        durationMinutes,
        maxParticipants,
        status: 'upcoming',
      },
    })

    sendCreated(res, session)
  } catch (error) {
    logger.error(
      '[LiveClassController] createLiveSession error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    sendInternalError(res)
  }
}

export const joinLiveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user?.userId

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    // Fetch session first to validate existence and check capacity
    const session = await prisma.liveSession.findUnique({ where: { id } })
    if (!session) {
      sendNotFound(res, 'Session not found')
      return
    }

    if (session.status === 'completed') {
      sendValidationError(res, 'Session has already ended')
      return
    }

    if (session.currentParticipants >= session.maxParticipants) {
      sendValidationError(res, 'Session is full')
      return
    }

    // Atomic increment with capacity guard using raw SQL to prevent race conditions
    const result = await prisma.$executeRaw`
      UPDATE "LiveSession"
      SET "currentParticipants" = "currentParticipants" + 1
      WHERE id = ${id}
        AND "currentParticipants" < "maxParticipants"
    `

    if (result === 0) {
      // Race condition: another user filled the last spot
      sendValidationError(res, 'Session is full')
      return
    }

    const updated = await prisma.liveSession.findUnique({ where: { id } })
    sendSuccess(res, updated)
  } catch (error) {
    logger.error(
      '[LiveClassController] joinLiveSession error',
      error instanceof Error ? error : new Error(String(error)),
      {
        sessionId: req.params.id,
        userId: req.user?.userId,
      }
    )
    sendInternalError(res)
  }
}
