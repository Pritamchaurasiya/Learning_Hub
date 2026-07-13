import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { sendSuccess, sendError } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

export const exportUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      testResults: { select: { testId: true, score: true, completedAt: true } },
      achievements: { select: { name: true, unlockedAt: true } },
      activityLogs: { select: { activityType: true, createdAt: true }, take: 100 },
    },
  })

  if (!user) {
    sendError(res, 'User not found', 404)
    return
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    personalInfo: {
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    learningData: {
      totalXP: user.xp,
      level: user.level,
      progress: [],
      testScores: user.testResults.map((t: any) => ({
        testId: t.testId,
        score: t.score,
        completedAt: t.completedAt,
      })),
      achievements: user.achievements.map((a: any) => ({
        name: a.name,
        unlockedAt: a.unlockedAt,
      })),
    },
    activityHistory: user.activityLogs.map((l: any) => ({
      activityType: l.activityType,
      timestamp: l.createdAt,
    })),
  }

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`)
  sendSuccess(res, exportData, 'Data exported successfully')
})

export const deleteUserAccount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId

    const { password } = req.body
    if (!password) {
      sendError(res, 'Password required for account deletion', 400)
      return
    }

    // Verify password
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const bcrypt = require('bcryptjs')
    const isValid = await bcrypt.compare(password, user?.password ?? '')

    if (!isValid) {
      sendError(res, 'Invalid password', 401)
      return
    }

    // Anonymize user data (GDPR compliant)
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymized.local`,
        username: `deleted-${userId}`,
        password: '',
        deletedAt: new Date(),
      },
    })

    sendSuccess(res, null, 'Account deleted successfully')
  }
)
