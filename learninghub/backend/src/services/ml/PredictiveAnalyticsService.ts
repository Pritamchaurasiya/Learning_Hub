import { prisma } from '../../prismaClient'
import { cacheService } from '../CacheService'
import logger from '../../utils/logger'

export interface ChurnPrediction {
  userId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  churnProbability: number
  riskFactors: string[]
  recommendedActions: string[]
  confidence: number
}

export interface LearningPathOptimization {
  userId: string
  currentPath: string[]
  optimizedPath: { courseId: string; order: number; reason: string }[]
  estimatedTimeToGoal: number
  confidence: number
  reasoning: string
}

interface ChurnRiskFactors {
  daysSinceLastActivity: number
  streakBroken: boolean
  avgScoreTrend: 'improving' | 'declining' | 'stable'
  testCompletionRate: number
  aiUsageDrop: boolean
  socialIsolation: boolean
}

export class PredictiveAnalyticsService {
  private static readonly CHURN_THRESHOLDS = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
  }

  private static readonly CACHE_TTL = 3600 // 1 hour

  /**
   * Predict churn risk for a user based on their activity patterns
   */
  static async predictChurnRisk(userId: string): Promise<{
    prediction: ChurnPrediction
    factors: ChurnRiskFactors
  }> {
    const cacheKey = `churn:prediction:${userId}`
    const cached = await cacheService.get(cacheKey)
    if (cached) return cached as any

    try {
      const [
        user,
        recentActivity,
        testHistory,
        aiUsage,
        streakData,
        socialData,
      ] = await Promise.all([
        // Get user profile
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, streak: true, lastActive: true, createdAt: true },
        }),
        // Recent activity (last 30 days)
        prisma.activityLog.findMany({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Test history
        prisma.testResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        // AI usage
        prisma.aIChatMessage.findMany({
          where: {
            role: 'USER',
            session: { userId },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Streak data
        prisma.user.findUnique({
          where: { id: userId },
          select: { streak: true, lastActive: true },
        }),
        // Social engagement
        (prisma as any).discussionComment ? (prisma as any).discussionComment.count({ where: { userId } }) : Promise.resolve(0),
      ])

      // Calculate risk factors
      const factors = this.calculateRiskFactors({
        user,
        recentActivity,
        testHistory,
        aiUsage,
        streakData,
        socialEngagement: socialData,
      })

      // Calculate churn probability using weighted factors
      const churnProbability = this.calculateChurnProbability(factors)
      const riskLevel = this.getRiskLevel(churnProbability)

      const prediction: ChurnPrediction = {
        userId,
        riskLevel,
        churnProbability,
        riskFactors: this.getRiskFactorLabels(factors),
        recommendedActions: this.generateRecommendedActions(factors),
        confidence: this.calculateConfidence(factors),
      }

      // Cache for 1 hour
      const result = { prediction, factors }
      await cacheService.set(`churn:prediction:${prediction.userId}`, { prediction, factors }, 3600)

      return { prediction, factors }
    } catch (error) {
      logger.error('[PredictiveAnalytics] Churn prediction failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('Churn prediction failed')
    }
  }

  private static calculateRiskFactors(data: {
    user: any
    recentActivity: any[]
    testHistory: any[]
    aiUsage: any[]
    streakData: any
    socialEngagement: number
  }): ChurnRiskFactors {
    const now = Date.now()
    const lastActivity = data.recentActivity[0]?.createdAt
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    const streakBroken = data.streakData?.streak === 0
    const daysSinceLastActive = data.streakData?.lastActive
      ? Math.floor((Date.now() - new Date(data.streakData.lastActive).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Calculate test score trend from testHistory
    const recentScores = data.testHistory
      .slice(0, 10)
      .map(r => r.percentage)
    const avgScoreTrend = recentScores.length >= 3
      ? (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length
      : 0

    const testCompletionRate = data.testHistory.length > 0
      ? data.testHistory.filter(r => r.status === 'COMPLETED').length / data.testHistory.length
      : 0

    // AI usage drop
    const recentAIUsage = data.aiUsage.filter(
      u => Date.now() - new Date(u.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length
    const previousAIUsage = data.aiUsage.filter(
      u => Date.now() - new Date(u.createdAt).getTime() >= 7 * 24 * 60 * 60 * 1000 &&
           Date.now() - new Date(u.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
    ).length
    const aiUsageDrop = previousAIUsage > 0 && recentAIUsage < previousAIUsage * 0.5

    // Social isolation
    const socialIsolation = data.socialEngagement === 0 && data.recentActivity.length > 0

    return {
      daysSinceLastActivity,
      streakBroken,
      avgScoreTrend: avgScoreTrend > 1 ? 'improving' : avgScoreTrend < -1 ? 'declining' : 'stable',
      testCompletionRate,
      aiUsageDrop,
      socialIsolation,
    }
  }

  private static calculateChurnProbability(factors: ChurnRiskFactors): number {
    let probability = 0

    // Days since last activity (0-0.3)
    if (factors.daysSinceLastActivity > 14) probability += 0.3
    else if (factors.daysSinceLastActivity > 7) probability += 0.15
    else if (factors.daysSinceLastActivity > 3) probability += 0.05

    // Streak broken
    if (factors.streakBroken) probability += 0.2

    // Score trend
    if (factors.avgScoreTrend === 'declining') probability += 0.15
    else if (factors.avgScoreTrend === 'stable') probability += 0.05

    // Test completion rate
    if (factors.testCompletionRate < 0.3) probability += 0.2
    else if (factors.testCompletionRate < 0.6) probability += 0.1

    // AI usage drop
    if (factors.aiUsageDrop) probability += 0.15

    // Social isolation
    if (factors.socialIsolation) probability += 0.1

    return Math.min(probability, 1.0)
  }

  private static getRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability >= 0.7) return 'critical'
    if (probability >= 0.5) return 'high'
    if (probability >= 0.3) return 'medium'
    return 'low'
  }

  private static getRiskFactorLabels(factors: ChurnRiskFactors): string[] {
    const labels: string[] = []
    if (factors.daysSinceLastActivity > 7) labels.push('Inactive for over a week')
    if (factors.streakBroken) labels.push('Learning streak broken')
    if (factors.avgScoreTrend === 'declining') labels.push('Test scores declining')
    if (factors.testCompletionRate < 0.5) labels.push('Low test completion rate')
    if (factors.aiUsageDrop) labels.push('Reduced AI tutor usage')
    if (factors.socialIsolation) labels.push('No community engagement')
    return labels
  }

  private static generateRecommendedActions(factors: ChurnRiskFactors): string[] {
    const actions: string[] = []
    if (factors.daysSinceLastActivity > 7) actions.push('Send re-engagement email with personalized course recommendations')
    if (factors.streakBroken) actions.push('Send streak recovery encouragement with easy win')
    if (factors.avgScoreTrend === 'declining') actions.push('Recommend review sessions for weak topics')
    if (factors.testCompletionRate < 0.5) actions.push('Suggest shorter practice sessions')
    if (factors.aiUsageDrop) actions.push('Prompt AI tutor usage with personalized prompt')
    if (factors.socialIsolation) actions.push('Invite to study group or community challenge')
    return actions
  }

  private static calculateConfidence(factors: ChurnRiskFactors): number {
    let confidence = 0.5
    // More data points = higher confidence
    // This is simplified - in production, use actual sample sizes
    return Math.min(0.95, confidence + 0.1)
  }

  /**
   * Generate personalized learning path optimization
   */
  static async optimizeLearningPath(userId: string, targetGoal?: string): Promise<{
    optimization: LearningPathOptimization
    reasoning: string
  }> {
    const cacheKey = `learningPath:${userId}:${targetGoal || 'general'}`
    const cached = await cacheService.get<{
      optimization: LearningPathOptimization
      reasoning: string
    }>(cacheKey)
    if (cached) return cached

    try {
      // Get user's learning profile
      const [userProfile, completedTopics, weakAreas, learningVelocity, preferences] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, level: true, streak: true } }),
        prisma.topicPerformance.findMany({ where: { userId, accuracy: { gte: 70 } }, orderBy: { accuracy: 'desc' } }),
        prisma.topicPerformance.findMany({ where: { userId, accuracy: { lt: 60 } }, orderBy: { accuracy: 'asc' } }),
        prisma.learningVelocityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        prisma.userExamPreference.findFirst({ where: { userId } }),
      ])

      // Analyze learning patterns
      const velocity = learningVelocity.reduce((acc: number, v: any) => acc + (v.velocity ?? 0), 0) / Math.max(1, learningVelocity.length)
      const avgTimePerTopic = learningVelocity.length > 0
        ? learningVelocity.reduce((a: number, v: any) => a + (v.timeSpentMinutes ?? 0), 0) / learningVelocity.length
        : 60

      // Identify knowledge gaps
      const knowledgeGaps = weakAreas.map((w: any) => ({
        topic: w.topic,
        severity: (60 - w.accuracy) / 40, // 0-1 scale
        estimatedHoursToMaster: Math.ceil((60 - w.accuracy) / 5 * 2), // rough estimate
      }))

      // Get available tests for weak areas
      const recommendedTests = await prisma.test.findMany({
        where: {
          isPublished: true,
        },
        take: 10,
      })

      // Build optimized path
      const optimizedPath = weakAreas
        .slice(0, 5)
        .map((area: any, index: number) => {
          const test = recommendedTests.find((t: any) => t.title.toLowerCase().includes(area.topic.toLowerCase()))
          return {
            courseId: test?.id || `topic-${area.topic}`,
            order: index + 1,
            reason: `Addresses weakness in ${area.topic} (${area.accuracy}% accuracy)`,
          }
        })

      const optimization: LearningPathOptimization = {
        userId,
        currentPath: [], // Would need current learning path
        optimizedPath,
        estimatedTimeToGoal: optimizedPath.reduce((sum: number, p: any) => sum + 5, 0), // 5 hours per topic estimate
        confidence: 0.85,
        reasoning: `Prioritized ${weakAreas.length} weak areas. Estimated ${optimizedPath.length * 5}h to close gaps.`
      }

      const result = { optimization, reasoning: `Prioritized ${weakAreas.length} weak areas. Estimated ${optimization.estimatedTimeToGoal}h to close gaps.` }
      await cacheService.set(`learningPath:${userId}:${targetGoal || 'general'}`, result, 3600)
      return result
    } catch (error) {
      logger.error('[PredictiveAnalytics] Learning path optimization failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('Learning path optimization failed')
    }
  }
}