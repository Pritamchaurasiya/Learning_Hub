import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
// getPaginationParams and createPaginatedResponse reserved for future pagination
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeframe, cursor, limit } = req.query

    const result = await queryOptimizationService.getLeaderboard({
      timeframe: timeframe as 'daily' | 'weekly' | 'monthly' | 'all',
      cursor: cursor as string,
      limit: limit ? parseInt(limit as string) : undefined,
    })

    res.json({ status: 'success', data: result })
  } catch (error) {
    logger.error(
      '[GamificationController] getLeaderboard error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    })

    res.json({ status: 'success', data: achievements })
  } catch (error) {
    logger.error(
      '[GamificationController] getAchievements error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const updateDailyGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    // Validate minutes input
    const rawMinutes = Number(req.body.minutes)
    if (!Number.isFinite(rawMinutes) || rawMinutes <= 0 || rawMinutes > 1440) {
      res
        .status(400)
        .json({ status: 'error', message: 'Minutes must be a positive number (max 1440)' })
      return
    }
    const minutes = Math.floor(rawMinutes)

    // Rate limiting: max 10 updates per hour to prevent XP farming
    const recentUpdates = await prisma.dailyGoal.count({
      where: {
        userId,
        date: { gte: new Date(Date.now() - 3600000) }, // Last hour
      },
    })
    if (recentUpdates >= 10) {
      res.status(429).json({
        status: 'error',
        message: 'Too many updates. Please wait before logging more study time.',
      })
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Atomic transaction to prevent race conditions on XP award
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
      // Award XP atomically when goal is first completed
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

    // Emit global realtime event for Leaderboard auto-refresh
    if (result.xpAwarded > 0 && req.io) {
      req.io.emit('ranking_update', { userId, xpEarned: result.xpAwarded })
    }

    res.json({ status: 'success', data: result.goal })
  } catch (error) {
    logger.error(
      '[GamificationController] updateDailyGoal error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getDsaStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

    res.json({
      status: 'success',
      data: {
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
      },
    })
  } catch (error) {
    logger.error(
      '[GamificationController] getDsaStats error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
