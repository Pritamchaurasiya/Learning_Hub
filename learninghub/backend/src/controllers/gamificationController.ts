import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { cacheService } from '../services/CacheService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendForbidden, sendError } from '../utils/responseHelper'

export const getLeaderboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { timeframe, cursor, limit } = req.query

  const result = await queryOptimizationService.getLeaderboard({
    timeframe: timeframe as 'daily' | 'weekly' | 'monthly' | 'all',
    cursor: cursor as string,
    limit: limit ? parseInt(limit as string) : undefined,
  })

  sendSuccess(res, result)
})

export const getAchievements = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'desc' },
  })

  sendSuccess(res, achievements)
})

export const updateDailyGoal = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

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

  const result = await prisma.$transaction(async (tx: any) => {
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
})

export const awardXp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
})

export const getDsaStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const cacheKey = cacheService.generateKey('dsaStats', userId)
  const cached = await cacheService.get<any>(cacheKey)
  if (cached) {
    sendSuccess(res, cached)
    return
  }

  const [
    totalProblems,
    solvedProblemsSet,
    totalSubmissions,
    totalEasy,
    totalMedium,
    totalHard,
    easySolved,
    mediumSolved,
    hardSolved,
    user,
  ] = await Promise.all([
    prisma.problem.count(),
    prisma.problemSubmission.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { problemId: true },
      distinct: ['problemId'],
    }),
    prisma.problemSubmission.count({ where: { userId } }),
    prisma.problem.count({ where: { difficulty: 'BEGINNER' } }),
    prisma.problem.count({ where: { difficulty: 'INTERMEDIATE' } }),
    prisma.problem.count({ where: { difficulty: 'ADVANCED' } }),
    prisma.problemSubmission.count({
      where: { userId, status: 'ACCEPTED', problem: { difficulty: 'BEGINNER' } },
    }),
    prisma.problemSubmission.count({
      where: { userId, status: 'ACCEPTED', problem: { difficulty: 'INTERMEDIATE' } },
    }),
    prisma.problemSubmission.count({
      where: { userId, status: 'ACCEPTED', problem: { difficulty: 'ADVANCED' } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, longestStreak: true, xp: true },
    }),
  ])

  const solvedProblemsCount = solvedProblemsSet.length
  const acceptanceRate = totalSubmissions > 0 ? (solvedProblemsCount / totalSubmissions) * 100 : 0

  const rank = user ? (await prisma.user.count({ where: { xp: { gt: user.xp } } })) + 1 : 0

  const result = {
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
  }

  await cacheService.set(cacheKey, result, 300) // Cache for 5 minutes
  sendSuccess(res, result)
})
