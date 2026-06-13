import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { sendSuccess, sendError } from '../utils/responseHelper'

export async function exportUserData(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any)?.id ?? (req.user as any)?.userId
    if (!userId) {
      return sendError(res, 'Unauthorized', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: { include: { course: { select: { title: true } } } },
        testResults: { select: { testId: true, score: true, completedAt: true } },
        achievements: { select: { name: true, unlockedAt: true } },
        activityLogs: { select: { activityType: true, createdAt: true }, take: 100 },
      },
    })

    if (!user) {
      return sendError(res, 'User not found', 404)
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
        progress: user.progress.map(p => ({
          course: p.course.title,
          progress: p.progress,
          lastActivityAt: p.lastActivityAt,
        })),
        testScores: user.testResults.map(t => ({
          testId: t.testId,
          score: t.score,
          completedAt: t.completedAt,
        })),
        achievements: user.achievements.map(a => ({
          name: a.name,
          unlockedAt: a.unlockedAt,
        })),
      },
      activityHistory: user.activityLogs.map(l => ({
        activityType: l.activityType,
        timestamp: l.createdAt,
      })),
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`)
    sendSuccess(res, exportData, 'Data exported successfully')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

export async function deleteUserAccount(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req.user as any)?.id ?? (req.user as any)?.userId
    if (!userId) {
      return sendError(res, 'Unauthorized', 401)
    }

    const { password } = req.body
    if (!password) {
      return sendError(res, 'Password required for account deletion', 400)
    }

    // Verify password
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const bcrypt = require('bcryptjs')
    const isValid = await bcrypt.compare(password, user?.password ?? '')

    if (!isValid) {
      return sendError(res, 'Invalid password', 401)
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
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}
