import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

export const completeCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const { courseId } = req.body

    if (!courseId) {
      res.status(400).json({ status: 'error', message: 'CourseId is required' })
      return
    }

    // XP is server-calculated based on course difficulty, not client-supplied
    const difficultyXP: Record<string, number> = {
      BEGINNER: 50,
      INTERMEDIATE: 100,
      ADVANCED: 200,
      EXPERT: 500,
    }

    const [course, user] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: { id: true, difficulty: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, xp: true } }),
    ])

    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }

    const existingProgress = await prisma.userProgress.findUnique({
      where: {
        idx_unique_user_course: { userId, courseId },
      },
      select: { id: true, status: true },
    })

    // Server-calculated XP based on course difficulty
    const baseXP = difficultyXP[course.difficulty] ?? 100
    const awardedXP = existingProgress?.status === 'COMPLETED' ? 0 : baseXP
    const newXP = user.xp + awardedXP
    const newLevel = Math.floor(newXP / 100) + 1

    const [progress, updatedUser] = await prisma.$transaction([
      prisma.userProgress.upsert({
        where: {
          idx_unique_user_course: {
            userId,
            courseId,
          },
        },
        update: {
          status: 'COMPLETED',
          progress: 100,
        },
        create: {
          userId,
          courseId,
          status: 'COMPLETED',
          progress: 100,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXP,
          level: newLevel,
          lastActive: new Date(),
        },
      }),
    ])

    res.json({
      status: 'success',
      message: awardedXP > 0 ? 'Course completed successfully' : 'Course already completed',
      data: {
        progress,
        user: {
          xp: updatedUser.xp,
          level: updatedUser.level,
        },
        xp_awarded: awardedXP,
      },
    })
  } catch (error) {
    logger.error(
      'Complete course error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.courseId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const updateStreak = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }

    // Use UTC date-only comparison for deterministic streak calculation
    // This avoids timezone and DST issues from raw millisecond division
    const today = new Date()
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        streak: newStreak,
        longestStreak: newLongestStreak,
        lastActive: today,
      },
    })

    res.json({
      status: 'success',
      message: 'Streak updated',
      data: {
        streak: updatedUser.streak,
        lastActive: updatedUser.lastActive,
      },
    })
  } catch (error) {
    logger.error('Update streak error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
    })
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const toggleBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const { courseId } = req.body
    if (!courseId || typeof courseId !== 'string') {
      res.status(400).json({ status: 'error', message: 'Course ID is required' })
      return
    }

    const existing = await prisma.bookmark.findUnique({
      where: {
        idx_unique_user_course_bookmark: {
          userId,
          courseId,
        },
      },
    })

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      })
      res.json({ status: 'success', message: 'Bookmark removed', data: { bookmarked: false } })
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          courseId,
        },
      })
      res.json({ status: 'success', message: 'Bookmark added', data: { bookmarked: true } })
    }
  } catch (error) {
    logger.error(
      'Toggle bookmark error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.courseId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
