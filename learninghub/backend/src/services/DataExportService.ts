/**
 * DataExportService
 *
 * Handles GDPR-compliant data export requests.
 * Gathers all user data (profile, test results, growth metrics, topic performance)
 * and generates a comprehensive JSON payload.
 */

import { prisma } from '../prismaClient'

export class DataExportService {
  /**
   * Generates a full GDPR JSON export for a user.
   */
  async generateUserExport(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        testResults: {
          include: {
            test: {
              select: {
                title: true,
                subjectId: true,
                timeLimit: true,
                passingScore: true,
              },
            },
          },
        },
        achievements: true,
        topicPerformances: true,
        experimentEvents: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Scrub sensitive data before export
    const { password: _password, ...scrubbedUser } = user

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userInfo: {
        id: scrubbedUser.id,
        email: scrubbedUser.email,
        username: scrubbedUser.username,
        role: scrubbedUser.role,
        createdAt: scrubbedUser.createdAt,
        lastActive: scrubbedUser.lastActive,
      },
      growthProfile: {
        xp: scrubbedUser.xp,
        level: scrubbedUser.level,
        streak: scrubbedUser.streak,
        loginCount: scrubbedUser.loginCount,
      },
      testHistory: scrubbedUser.testResults.map((result: any) => ({
        testId: result.testId,
        testTitle: result.test.title,
        subjectId: result.test.subjectId,
        status: result.status,
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
        timeTakenSeconds: result.timeTaken,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topicPerformance: scrubbedUser.topicPerformances.map((tp: any) => ({
        topicName: tp.topicName,
        subjectName: tp.subjectName,
        totalAttempts: tp.totalAttempts,
        accuracy: tp.accuracy,
        lastAttemptAt: tp.lastAttemptAt,
        avgTimePerQuestionSeconds: tp.avgTimeSeconds,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      achievements: scrubbedUser.achievements.map((ach: any) => ({
        achievementId: ach.achievementId,
        name: ach.name,
        description: ach.description,
        unlockedAt: ach.unlockedAt,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experimentEvents: scrubbedUser.experimentEvents.map((exp: any) => ({
        experimentId: exp.experimentId,
        variant: exp.variant,
        event: exp.event,
        value: exp.value,
        createdAt: exp.createdAt,
      })),
    }
  }
}

export const dataExportService = new DataExportService()
