/**
 * RecommendationService
 *
 * Smart recommendation engine for personalized learning:
 *  - What to study next (prioritized topic recommendations)
 *  - What test to attempt next
 *  - Spaced repetition scheduling
 *  - Improvement roadmap generation
 *  - Adaptive difficulty suggestions
 *
 * Algorithm:
 *  Priority Score = (1 - accuracy/100) × recency_weight × importance_weight
 *  - Low accuracy → higher priority
 *  - Longer since last attempt → higher priority
 *  - More attempts → higher importance (user cares about this topic)
 */

import { prisma } from '../prismaClient'
import { topicPerformanceService, type TopicPerformanceData } from './TopicPerformanceService'
import { cacheService } from './CacheService'
import { conductorClient } from './ml/ConductorClient'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudyRecommendation {
  topicName: string
  subjectName?: string
  reason: string
  priority: number // 0-100, higher = more urgent
  currentAccuracy: number
  targetAccuracy: number
  estimatedQuestions: number // Estimated questions needed to reach target
  lastAttemptDaysAgo: number | null
  type: 'weak_area' | 'review_due' | 'new_topic' | 'improvement'
}

export interface TestRecommendation {
  testId: string
  testTitle: string
  reason: string
  difficulty: string
  mode: string
  questionCount: number
  estimatedTime: number
  matchScore: number // How well this test matches user needs
}

export interface ImprovementRoadmap {
  currentLevel: string
  targetLevel: string
  weeklyPlan: WeeklyPlanItem[]
  estimatedWeeksToTarget: number
  keyFocusAreas: string[]
}

export interface WeeklyPlanItem {
  week: number
  focusTopics: string[]
  recommendedTests: number
  targetAccuracy: number
  description: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30, 60] // Days
const TARGET_ACCURACY = 80 // Target mastery level

// ─── Service ─────────────────────────────────────────────────────────────────

export class RecommendationService {
  /**
   * Get prioritized study recommendations for a user.
   * Combines weak areas, topics due for review, and untested topics.
   */
  async getStudyRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<StudyRecommendation[]> {
    return cacheService.getOrSet(
      cacheService.recommendationStudyKey(userId),
      async () => {
        const [weakTopics, dueForReview, userExamPref] = await Promise.all([
          topicPerformanceService.getWeakTopics(userId, 20),
          topicPerformanceService.getTopicsDueForReview(userId, 7, 20),
          prisma.userExamPreference.findUnique({
            where: { userId },
            select: {
              subjectIds: true,
              exam: {
                select: {
                  subjects: {
                    select: {
                      id: true,
                      name: true,
                      topics: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          }),
        ])

        // Build list of active topic names based on preferences
        const activeTopicNames = new Set<string>()
        if (userExamPref?.exam?.subjects) {
          for (const subject of userExamPref.exam.subjects) {
            if (
              userExamPref.subjectIds.length > 0 &&
              !userExamPref.subjectIds.includes(subject.id)
            ) {
              continue
            }
            for (const topic of subject.topics) {
              activeTopicNames.add(topic.name)
            }
          }
        }

        const recommendations: StudyRecommendation[] = []
        const addedTopics = new Set<string>()

        // 1. Weak areas (highest priority)
        for (const topic of weakTopics) {
          if (addedTopics.has(topic.topicName)) continue
          // Filter to only user's active topics if preferences are set
          if (activeTopicNames.size > 0 && !activeTopicNames.has(topic.topicName)) continue

          addedTopics.add(topic.topicName)

          const daysSinceAttempt = topic.lastAttemptAt
            ? Math.floor((Date.now() - topic.lastAttemptAt.getTime()) / (24 * 60 * 60 * 1000))
            : null

          const priority = this.calculatePriority(topic, 'weak_area')

          recommendations.push({
            topicName: topic.topicName,
            subjectName: topic.subjectName,
            reason: `Accuracy is ${topic.accuracy}% — below target of ${TARGET_ACCURACY}%`,
            priority,
            currentAccuracy: topic.accuracy,
            targetAccuracy: TARGET_ACCURACY,
            estimatedQuestions: this.estimateQuestionsNeeded(topic.accuracy, TARGET_ACCURACY),
            lastAttemptDaysAgo: daysSinceAttempt,
            type: 'weak_area',
          })
        }

        // 2. Topics due for review (spaced repetition)
        for (const topic of dueForReview) {
          if (addedTopics.has(topic.topicName)) continue
          // Filter to only user's active topics if preferences are set
          if (activeTopicNames.size > 0 && !activeTopicNames.has(topic.topicName)) continue

          addedTopics.add(topic.topicName)

          const daysSinceAttempt = topic.lastAttemptAt
            ? Math.floor((Date.now() - topic.lastAttemptAt.getTime()) / (24 * 60 * 60 * 1000))
            : null

          const priority = this.calculatePriority(topic, 'review_due')

          recommendations.push({
            topicName: topic.topicName ?? 'Unknown',
            subjectName: topic.subjectName,
            reason: `Not practiced in ${daysSinceAttempt ?? '?'} days — review needed to maintain knowledge`,
            priority,
            currentAccuracy: topic.accuracy,
            targetAccuracy: Math.max(topic.accuracy, TARGET_ACCURACY),
            estimatedQuestions: 5, // Quick review
            lastAttemptDaysAgo: daysSinceAttempt,
            type: 'review_due',
          })
        }

        // 3. New topics from user's exam preference (topics not yet attempted)
        if (userExamPref?.exam?.subjects) {
          for (const subject of userExamPref.exam.subjects) {
            if (
              userExamPref.subjectIds.length > 0 &&
              !userExamPref.subjectIds.includes(subject.id)
            ) {
              continue
            }
            for (const topic of subject.topics) {
              if (addedTopics.has(topic.name)) continue

              // Check if user has any performance data for this topic
              const existing = await prisma.topicPerformance.findUnique({
                where: { userId_topicId: { userId, topicId: topic.id } },
              })

              if (!existing) {
                addedTopics.add(topic.name)
                recommendations.push({
                  topicName: topic.name,
                  subjectName: subject.name,
                  reason: 'New topic — start practicing to build mastery',
                  priority: 30, // Lower priority than weak areas
                  currentAccuracy: 0,
                  targetAccuracy: TARGET_ACCURACY,
                  estimatedQuestions: 10,
                  lastAttemptDaysAgo: null,
                  type: 'new_topic',
                })
              }
            }
          }
        }

        // Sort by priority (highest first) and limit
        return recommendations.sort((a, b) => b.priority - a.priority).slice(0, limit)
      },
      300 // Cache for 5 minutes
    )
  }

  /**
   * Get next recommended test for a user.
   * Matches available tests to user's weakest areas.
   */
  async getNextTestRecommendation(
    userId: string,
    limit: number = 5
  ): Promise<TestRecommendation[]> {
    return cacheService.getOrSet(
      cacheService.recommendationTestKey(userId),
      async () => {
        const [weakTopics, userExamPref] = await Promise.all([
          topicPerformanceService.getWeakTopics(userId, 5),
          prisma.userExamPreference.findUnique({
            where: { userId },
            select: { examId: true },
          }),
        ])
        const weakTopicNames = weakTopics.map((t: { topicName: string }) => t.topicName)
        const targetExamId = userExamPref?.examId

        // Find tests that target weak areas and match the user's target exam
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {
          isPublished: true,
          questions: {
            some: {
              tags: { hasSome: weakTopicNames.length > 0 ? weakTopicNames : ['general'] },
            },
          },
        }

        if (targetExamId) {
          whereClause.examId = targetExamId
        }

        const tests = await prisma.test.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            difficulty: true,
            mode: true,
            timeLimit: true,
            questions: {
              select: { tags: true, id: true },
            },
            _count: {
              select: { questions: true },
            },
          },
          take: 20,
        })

        // Score each test by how well it matches weak areas
        const recommendations: TestRecommendation[] = tests.map((test: { id: string; title: string; difficulty: string; mode: string; timeLimit: number | null; _count: { questions: number }; questions: Array<{ tags: string[]; id: string }> }) => {
          const questionTags = test.questions.flatMap((q: { tags: string[] }) => q.tags)
          const matchingTags = questionTags.filter((t: string) => weakTopicNames.includes(t))
          const matchScore =
            questionTags.length > 0
              ? Math.round((matchingTags.length / questionTags.length) * 100)
              : 0

          const weakTopicMatches =
            matchingTags.length > 0
              ? `Covers weak areas: ${[...new Set(matchingTags)].slice(0, 3).join(', ')}`
              : 'General practice test'

          return {
            testId: test.id,
            testTitle: test.title,
            reason: weakTopicMatches,
            difficulty: test.difficulty,
            mode: test.mode,
            questionCount: test._count.questions,
            estimatedTime: test.timeLimit,
            matchScore,
          }
        })

        return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit)
      },
      300
    )
  }

  /**
   * Generate an improvement roadmap for a user.
   * Creates a week-by-week plan to reach target mastery.
   */
  async getImprovementRoadmap(
    userId: string,
    targetWeeks: number = 4
  ): Promise<ImprovementRoadmap> {
    return cacheService.getOrSet(
      cacheService.recommendationRoadmapKey(userId),
      async () => {
        const mastery = await topicPerformanceService.getTopicMasteryMap(userId)

        // Determine current and target levels
        const currentLevel = this.determineLevel(mastery.overallAccuracy)
        const targetLevel = this.getNextLevel(currentLevel)

        // Group weak topics by priority
        const weakTopics = mastery.weakTopics.sort((a, b) => a.accuracy - b.accuracy)
        const developingTopics = mastery.topics.filter(
          t => t.strengthLevel === 'developing' && t.totalAttempts >= 3
        )

        // Create weekly plan
        const weeklyPlan: WeeklyPlanItem[] = []
        const allTopicsToImprove = [...weakTopics, ...developingTopics]
        const topicsPerWeek = Math.max(2, Math.ceil(allTopicsToImprove.length / targetWeeks))

        for (let week = 1; week <= targetWeeks; week++) {
          const startIdx = (week - 1) * topicsPerWeek
          const weekTopics = allTopicsToImprove.slice(startIdx, startIdx + topicsPerWeek)

          if (weekTopics.length === 0 && week > 1) break

          const focusTopicNames = weekTopics.map(t => t.topicName)
          const avgAccuracy =
            weekTopics.length > 0
              ? Math.round(weekTopics.reduce((s, t) => s + t.accuracy, 0) / weekTopics.length)
              : mastery.overallAccuracy

          weeklyPlan.push({
            week,
            focusTopics: focusTopicNames.length > 0 ? focusTopicNames : ['Review all topics'],
            recommendedTests: Math.max(3, weekTopics.length),
            targetAccuracy: Math.min(100, avgAccuracy + 15),
            description:
              weekTopics.length > 0
                ? `Focus on improving ${focusTopicNames.slice(0, 3).join(', ')}${focusTopicNames.length > 3 ? ` and ${focusTopicNames.length - 3} more` : ''}`
                : 'Review and maintain current knowledge',
          })
        }

        const keyFocusAreas = weakTopics.slice(0, 5).map(t => t.topicName)

        return {
          currentLevel,
          targetLevel,
          weeklyPlan,
          estimatedWeeksToTarget: weeklyPlan.length,
          keyFocusAreas,
        }
      },
      300
    )
  }

  /**
   * Get spaced repetition recommendations — topics due for review
   * based on the forgetting curve.
   */
  async getSpacedRepetitionRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<StudyRecommendation[]> {
    return cacheService.getOrSet(
      cacheService.recommendationSpacedKey(userId),
      async () => {
        // Try fetching advanced DKT recommendations from the ML Engine
        const mlRecs = await conductorClient.getDktRecommendations(userId)

        const topics = await prisma.topicPerformance.findMany({
          where: { userId, totalAttempts: { gte: 1 } },
          orderBy: { lastAttemptAt: 'asc' },
          select: {
            topicName: true,
            subjectName: true,
            accuracy: true,
            totalAttempts: true,
            lastAttemptAt: true,
          },
        })

        const recommendations: StudyRecommendation[] = []

        for (const topic of topics) {
          if (!topic.lastAttemptAt) continue

          const daysSinceAttempt = Math.floor(
            (Date.now() - topic.lastAttemptAt.getTime()) / (24 * 60 * 60 * 1000)
          )

          let priority = 0
          let reason = ''

          if (mlRecs) {
            // Use ML predictions
            const mlMatch = mlRecs.find(r => r.topic_name === topic.topicName)
            if (mlMatch && mlMatch.priority > 50) {
              priority = mlMatch.priority
              reason = `ML predicts knowledge decay: expected accuracy dropped to ${Math.round(mlMatch.expected_accuracy)}%`
            }
          } else {
            // Fallback to basic heuristics
            const accuracyFactor = Math.floor(topic.accuracy / 25)
            const attemptFactor = Math.min(2, Math.floor((topic.totalAttempts - 1) / 2))
            const intervalIndex = Math.min(
              SPACED_REPETITION_INTERVALS.length - 1,
              accuracyFactor + attemptFactor
            )
            const idealInterval = SPACED_REPETITION_INTERVALS[intervalIndex]

            if (daysSinceAttempt >= idealInterval) {
              priority = Math.min(
                100,
                Math.round((daysSinceAttempt / idealInterval) * 50 + (100 - topic.accuracy) * 0.5)
              )
              reason = `Due for review (${daysSinceAttempt} days since last practice, recommended interval: ${idealInterval} days)`
            }
          }

          if (priority > 0) {
            recommendations.push({
              topicName: topic.topicName ?? 'Unknown',
              subjectName: topic.subjectName ?? undefined,
              reason,
              priority,
              currentAccuracy: topic.accuracy,
              targetAccuracy: Math.max(topic.accuracy, TARGET_ACCURACY),
              estimatedQuestions: 5,
              lastAttemptDaysAgo: daysSinceAttempt,
              type: 'review_due',
            })
          }
        }

        return recommendations.sort((a, b) => b.priority - a.priority).slice(0, limit)
      },
      300
    )
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private calculatePriority(topic: TopicPerformanceData, type: 'weak_area' | 'review_due'): number {
    const accuracy = Number.isFinite(topic.accuracy) ? topic.accuracy : 0
    const accuracyWeight = (100 - accuracy) / 100 // 0-1, higher for lower accuracy
    const daysSince = topic.lastAttemptAt
      ? (Date.now() - topic.lastAttemptAt.getTime()) / (24 * 60 * 60 * 1000)
      : 30
    const recencyWeight = Math.min(1, daysSince / 30) // 0-1, higher for older
    const attemptWeight = Math.min(1, (topic.totalAttempts || 0) / 20) // 0-1, higher for more attempts

    let basePriority: number
    if (type === 'weak_area') {
      basePriority = 70 + accuracyWeight * 30 // 70-100
    } else {
      basePriority = 40 + recencyWeight * 30 // 40-70
    }

    // Adjust for engagement (topics user has practiced more are more important)
    const priority = basePriority * (0.7 + attemptWeight * 0.3)

    return Math.round(Math.min(100, Math.max(0, priority)))
  }

  /**
   * Estimate questions needed to reach target accuracy.
   * Assumes 70% correct rate on new practice (learning curve).
   */
  private estimateQuestionsNeeded(currentAccuracy: number, targetAccuracy: number): number {
    if (!Number.isFinite(currentAccuracy) || currentAccuracy < 0) return 10
    if (currentAccuracy >= targetAccuracy) return 0
    const gap = targetAccuracy - currentAccuracy
    // Roughly 2 questions per percentage point of improvement
    return Math.max(5, Math.ceil(gap * 2))
  }

  private determineLevel(accuracy: number): string {
    if (!Number.isFinite(accuracy) || accuracy < 0) return 'Beginner'
    if (accuracy >= 90) return 'Expert'
    if (accuracy >= 75) return 'Advanced'
    if (accuracy >= 60) return 'Intermediate'
    if (accuracy >= 40) return 'Developing'
    return 'Beginner'
  }

  private getNextLevel(currentLevel: string): string {
    const levels = ['Beginner', 'Developing', 'Intermediate', 'Advanced', 'Expert']
    const idx = levels.indexOf(currentLevel)
    return idx < levels.length - 1 ? levels[idx + 1] : 'Expert'
  }
}

export const recommendationService = new RecommendationService()
