import { prisma } from '../config/database'
import { notificationService, NotificationType } from '../services/NotificationService'
import { aiLearningService } from '../services/ai/AILearningService'
import logger from '../utils/logger'
import { AIServiceFactory } from '../services/ai/AIServiceFactory'

let intervalId: NodeJS.Timeout | null = null

export const startAiNotificationsJob = () => {
  if (intervalId) return

  // Run every 24 hours (simulated here as 1 hour for testing or whatever schedule)
  // 3600000 ms = 1 hour
  intervalId = setInterval(async () => {
    logger.info('[AINotificationsJob] Starting AI personalized notifications check...')
    try {
      // Find active users who haven't received a reminder today
      const activeUsers = await prisma.user.findMany({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Active in last 7 days
          },
        },
        take: 50, // Limit batch size for AI API
      })

      for (const user of activeUsers) {
        // Check if user already got a reminder today
        const existingReminders = await prisma.notification.count({
          where: {
            userId: user.id,
            type: NotificationType.REMINDER,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        })

        if (existingReminders > 0) continue

        // Build context and ask AI to generate a motivational message
        const context = await aiLearningService.buildLearningContext(user.id)
        const prompt = `You are an encouraging AI mentor for LearningHub.
User context: ${context}
Generate a single, short, highly personalised and motivating push notification message (max 100 characters) to encourage them to study today.
Respond ONLY with a JSON object: {"title": "Short catchy title", "message": "The push message"}`

        try {
          const ai = AIServiceFactory.getAgent()
          const result = await ai.generateJSON<{ title: string; message: string }>(prompt, {
            model: 'gemini-2.0-flash',
          })

          if (result.title && result.message) {
            await notificationService.create({
              userId: user.id,
              type: NotificationType.REMINDER,
              title: result.title,
              message: result.message,
              actionUrl: '/dashboard',
            })
            logger.info(`[AINotificationsJob] Sent AI reminder to user ${user.id}`)
          }
        } catch {
          logger.warn(`[AINotificationsJob] Failed to generate AI message for user ${user.id}`)
        }
      }
    } catch (error) {
      logger.error(
        '[AINotificationsJob] Error in job execution',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }, 3600000 * 24) // 24 hours
}

export const stopAiNotificationsJob = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
