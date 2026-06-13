import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { DIFFICULTY_XP } from '../constants/xp'
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

export const completeCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const { courseId } = req.body

    if (!courseId) {
      sendValidationError(res, 'CourseId is required')
      return
    }

    const [course, user] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: { id: true, difficulty: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, xp: true } }),
    ])

    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }
    if (!user) {
      sendNotFound(res, 'User not found')
      return
    }

    const existingProgress = await prisma.userProgress.findUnique({
      where: { idx_unique_user_course: { userId, courseId } },
      select: { id: true, status: true },
    })

    // Server-calculated XP based on course difficulty
    const baseXP = DIFFICULTY_XP[course.difficulty] ?? 100
    const awardedXP = existingProgress?.status === 'COMPLETED' ? 0 : baseXP

    const [progress, updatedUser] = await prisma.$transaction(async tx => {
      const upsertedProgress = await tx.userProgress.upsert({
        where: { idx_unique_user_course: { userId, courseId } },
        update: { status: 'COMPLETED', progress: 100 },
        create: { userId, courseId, status: 'COMPLETED', progress: 100 },
      })

      // Use atomic increment to prevent race conditions on concurrent completions
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          xp: awardedXP > 0 ? { increment: awardedXP } : undefined,
          lastActive: new Date(),
        },
      })

      // Recalculate level after atomic XP update
      if (awardedXP > 0) {
        const finalLevel = Math.floor(updated.xp / 100) + 1
        await tx.user.update({
          where: { id: userId },
          data: { level: finalLevel },
        })
        updated.level = finalLevel
      }

      return [upsertedProgress, updated]
    })

    sendSuccess(
      res,
      {
        progress,
        user: { xp: updatedUser.xp, level: updatedUser.level },
        xp_awarded: awardedXP,
      },
      awardedXP > 0 ? 'Course completed successfully' : 'Course already completed'
    )
  } catch (error) {
    logger.error(
      'Complete course error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, courseId: req.body?.courseId }
    )
    sendInternalError(res)
  }
}

export const updateStreak = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    // Use UTC date-only comparison for deterministic streak calculation
    const today = new Date()
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())

    // Use transaction with atomic operations to prevent race conditions
    const updatedUser = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')

      const lastActive = new Date(user.lastActive)
      const lastActiveUTC = Date.UTC(
        lastActive.getUTCFullYear(),
        lastActive.getUTCMonth(),
        lastActive.getUTCDate()
      )
      const diffDays = Math.round((todayUTC - lastActiveUTC) / (1000 * 60 * 60 * 24))

      let newStreak = user.streak
      if (diffDays === 0) {
        // Same calendar day — no change
      } else if (diffDays === 1) {
        newStreak += 1
      } else {
        // Streak broken (missed a day)
        newStreak = 1
      }

      const newLongestStreak = Math.max(user.longestStreak, newStreak)

      return tx.user.update({
        where: { id: userId },
        data: {
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastActive: today,
        },
      })
    })

    sendSuccess(
      res,
      {
        streak: updatedUser.streak,
        lastActive: updatedUser.lastActive,
      },
      'Streak updated'
    )
  } catch (error) {
    logger.error('Update streak error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
    })
    sendInternalError(res)
  }
}

export const toggleBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const { courseId } = req.body
    if (!courseId || typeof courseId !== 'string') {
      sendValidationError(res, 'Course ID is required')
      return
    }

    const existing = await prisma.bookmark.findUnique({
      where: { idx_unique_user_course_bookmark: { userId, courseId } },
    })

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } })
      sendSuccess(res, { bookmarked: false }, 'Bookmark removed')
    } else {
      await prisma.bookmark.create({ data: { userId, courseId } })
      sendSuccess(res, { bookmarked: true }, 'Bookmark added')
    }
  } catch (error) {
    logger.error(
      'Toggle bookmark error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, courseId: req.body?.courseId }
    )
    sendInternalError(res)
  }
}
