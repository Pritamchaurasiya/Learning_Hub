import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import {
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendForbidden,
  sendError,
  sendInternalError,
} from '../utils/responseHelper'

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeframe, cursor, limit } = req.query

    const result = await queryOptimizationService.getLeaderboard({
      timeframe: timeframe as 'daily' | 'weekly' | 'monthly' | 'all',
      cursor: cursor as string,
      limit: limit ? parseInt(limit as string) : undefined,
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[GamificationController] getLeaderboard error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    })

    sendSuccess(res, achievements)
  } catch (error) {
    logger.error(
      '[GamificationController] getAchievements error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const updateDailyGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const rawMinutes = Number(req.body.minutes)
    if (!Number.isFinite(rawMinutes) || rawMinutes <= 0 || rawMinutes > 1440) {
      sendValidationError(res, 'Minutes must be a positive number (max 1440)')
      return
    }
    const minutes = Math.floor(rawMinutes)

    const recentUpdates = await prisma.dailyGoal.count({
      where: {
        userId,
        date: { gte: new Date(Date.now() - 3600000) },
      },
    })
    if (recentUpdates >= 10) {
      sendError(
        res,
        'Too many updates. Please wait before logging more study time.',
        429,
        'RATE_LIMITED'
      )
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await prisma.$transaction(async tx => {
      const goal = await tx.dailyGoal.upsert({
        where: {
          userId_date: { userId, date: today },
        },
        update: {
          completedMinutes: { increment: minutes },
        },
        create: {
          userId,
          date: today,
          completedMinutes: minutes,
          targetMinutes: 30,
        },
      })

      let xpAwarded = 0
      if (goal.completedMinutes >= goal.targetMinutes && !goal.completed) {
        await tx.dailyGoal.update({
          where: { id: goal.id },
          data: { completed: true },
        })
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: 100 } },
        })
        xpAwarded = 100
      }

      return { goal, xpAwarded }
    })

    if (result.xpAwarded > 0 && req.io) {
      req.io.emit('ranking_update', { userId, xpEarned: result.xpAwarded })
    }

    sendSuccess(res, result.goal)
  } catch (error) {
    logger.error(
      '[GamificationController] updateDailyGoal error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const awardXp = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const userRole = (req.user as Record<string, unknown>).role as string | undefined
    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN')) {
      sendForbidden(res, 'Admin access required to award XP')
      return
    }

    const { amount } = req.body
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      sendValidationError(res, 'Valid XP amount is required')
      return
    }

    const targetUserId = req.body.userId
    if (!targetUserId || typeof targetUserId !== 'string') {
      sendValidationError(res, 'Target userId is required')
      return
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { xp: { increment: amount } },
      select: { xp: true, level: true },
    })

    const newLevel = Math.floor(user.xp / 100) + 1
    if (newLevel !== user.level) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { level: newLevel },
      })
    }

    sendSuccess(res, { xp: user.xp, level: newLevel }, 'XP awarded successfully')
  } catch (error) {
    logger.error(
      '[GamificationController] awardXp error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const getDsaStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const totalProblems = await prisma.problem.count()
    const solvedProblemsSet = await prisma.problemSubmission.findMany({
      where: { userId, status: 'accepted' },
      select: { problemId: true },
      distinct: ['problemId'],
    })
    const solvedProblemsCount = solvedProblemsSet.length
    const totalSubmissions = await prisma.problemSubmission.count({ where: { userId } })

    const acceptanceRate = totalSubmissions > 0 ? (solvedProblemsCount / totalSubmissions) * 100 : 0

    const [totalEasy, totalMedium, totalHard, easySolved, mediumSolved, hardSolved] =
      await Promise.all([
        prisma.problem.count({ where: { difficulty: 'easy' } }),
        prisma.problem.count({ where: { difficulty: 'medium' } }),
        prisma.problem.count({ where: { difficulty: 'hard' } }),
        prisma.problemSubmission.count({
          where: { userId, status: 'accepted', problem: { difficulty: 'easy' } },
        }),
        prisma.problemSubmission.count({
          where: { userId, status: 'accepted', problem: { difficulty: 'medium' } },
        }),
        prisma.problemSubmission.count({
          where: { userId, status: 'accepted', problem: { difficulty: 'hard' } },
        }),
      ])

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, longestStreak: true, xp: true },
    })

    const rank = user ? (await prisma.user.count({ where: { xp: { gt: user.xp } } })) + 1 : 0

    sendSuccess(res, {
      total_problems: totalProblems,
      solved_problems: solvedProblemsCount,
      total_easy: totalEasy,
      easy_solved: easySolved,
      total_medium: totalMedium,
      medium_solved: mediumSolved,
      total_hard: totalHard,
      hard_solved: hardSolved,
      acceptance_rate: acceptanceRate,
      current_streak: user?.streak ?? 0,
      longest_streak: user?.longestStreak ?? 0,
      rank,
    })
  } catch (error) {
    logger.error(
      '[GamificationController] getDsaStats error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}
