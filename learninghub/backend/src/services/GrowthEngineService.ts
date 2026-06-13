/**
 * GrowthEngineService
 *
 * Centralized user growth, motivation, and retention engine:
 *  - XP award system with level-up logic
 *  - Streak management (check, update, maintain)
 *  - Achievement trigger engine (event-driven unlocking)
 *  - Level progress tracking
 *  - Daily goal tracking
 *
 * Level formula: level = floor(sqrt(xp / 100))
 * This gives a logarithmic growth curve:
 *  Level 1: 100 XP, Level 2: 400 XP, Level 5: 2500 XP, Level 10: 10000 XP
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export type XPReason =
  | 'test_completed'
  | 'test_passed'
  | 'perfect_score'
  | 'lesson_completed'
  | 'course_completed'
  | 'daily_goal_met'
  | 'streak_milestone'
  | 'achievement_unlocked'
  | 'first_test'
  | 'practice_session'

export interface XPAwardResult {
  xpAwarded: number
  totalXP: number
  previousLevel: number
  newLevel: number
  leveledUp: boolean
  nextLevelXP: number
  progressToNextLevel: number // 0-100%
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  streakMaintained: boolean
  streakBroken: boolean
  milestoneReached: number | null // e.g., 7, 30, 100
}

export interface LevelProgress {
  level: number
  currentXP: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  progressPercent: number
  xpNeeded: number
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  icon: string
  condition: (stats: UserStats) => boolean
}

export interface UserStats {
  totalTestsCompleted: number
  totalTestsPassed: number
  perfectScores: number
  currentStreak: number
  longestStreak: number
  totalXP: number
  level: number
  coursesCompleted: number
  lessonsCompleted: number
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  overallAccuracy: number
  topicsmastered: number
}

// ─── XP Configuration ────────────────────────────────────────────────────────

const XP_REWARDS: Record<XPReason, number> = {
  test_completed: 10,
  test_passed: 25,
  perfect_score: 50,
  lesson_completed: 5,
  course_completed: 100,
  daily_goal_met: 15,
  streak_milestone: 30,
  achievement_unlocked: 20,
  first_test: 25,
  practice_session: 5,
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]

// ─── Achievement Definitions ─────────────────────────────────────────────────

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_test',
    name: 'First Step',
    description: 'Complete your first test',
    icon: '🎯',
    condition: (s) => s.totalTestsCompleted >= 1,
  },
  {
    id: 'ten_tests',
    name: 'Test Warrior',
    description: 'Complete 10 tests',
    icon: '⚔️',
    condition: (s) => s.totalTestsCompleted >= 10,
  },
  {
    id: 'fifty_tests',
    name: 'Test Master',
    description: 'Complete 50 tests',
    icon: '🏆',
    condition: (s) => s.totalTestsCompleted >= 50,
  },
  {
    id: 'hundred_tests',
    name: 'Century Champion',
    description: 'Complete 100 tests',
    icon: '💯',
    condition: (s) => s.totalTestsCompleted >= 100,
  },
  {
    id: 'first_perfect',
    name: 'Flawless Victory',
    description: 'Score 100% on a test',
    icon: '⭐',
    condition: (s) => s.perfectScores >= 1,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    condition: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Machine',
    description: 'Maintain a 30-day streak',
    icon: '🌟',
    condition: (s) => s.longestStreak >= 30,
  },
  {
    id: 'streak_100',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    icon: '🚀',
    condition: (s) => s.longestStreak >= 100,
  },
  {
    id: 'accuracy_80',
    name: 'Sharp Shooter',
    description: 'Achieve 80%+ overall accuracy',
    icon: '🎯',
    condition: (s) => s.overallAccuracy >= 80 && s.totalQuestionsAnswered >= 50,
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '✨',
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level_10',
    name: 'Knowledge Knight',
    description: 'Reach Level 10',
    icon: '🛡️',
    condition: (s) => s.level >= 10,
  },
  {
    id: 'topic_master_5',
    name: 'Multi-Disciplinary',
    description: 'Master 5 different topics',
    icon: '📚',
    condition: (s) => s.topicsmastered >= 5,
  },
  {
    id: 'thousand_questions',
    name: 'Question Crusher',
    description: 'Answer 1000 questions',
    icon: '💪',
    condition: (s) => s.totalQuestionsAnswered >= 1000,
  },
]

// ─── Service ─────────────────────────────────────────────────────────────────

export class GrowthEngineService {
  /**
   * Award XP to a user with automatic level-up check.
   */
  async awardXP(
    userId: string,
    reason: XPReason,
    txParam?: any
  ): Promise<XPAwardResult | null> {
    const db = txParam ?? prisma
    const amount = XP_REWARDS[reason]
    if (!amount) return null

    try {
      // If we are already in a transaction, just use it without nested $transaction
      const performUpdate = async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { xp: true, level: true },
        })

        if (!user) {
          throw new Error('User not found')
        }

        const previousLevel = user.level
        const newTotalXP = user.xp + amount
        const newLevel = this.calculateLevel(newTotalXP)
        const leveledUp = newLevel > previousLevel

        await tx.user.update({
          where: { id: userId },
          data: {
            xp: newTotalXP,
            level: newLevel,
          },
        })

        if (leveledUp) {
          logger.info(`[GrowthEngine] User ${userId} leveled up: ${previousLevel} → ${newLevel}`)
        }

        const nextLevelXP = this.xpForLevel(newLevel + 1)
        const currentLevelXP = this.xpForLevel(newLevel)
        const progressToNextLevel = nextLevelXP > currentLevelXP
          ? Math.round(((newTotalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
          : 100

        return {
          xpAwarded: amount,
          totalXP: newTotalXP,
          previousLevel,
          newLevel,
          leveledUp,
          nextLevelXP,
          progressToNextLevel,
        }
      }

      if (txParam) {
        return await performUpdate(txParam)
      } else {
        return await db.$transaction(performUpdate, { isolationLevel: 'ReadCommitted' })
      }
    } catch (error) {
      logger.error('[GrowthEngineService] Failed to award XP', error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }

  /**
   * Check and update user's streak.
   * Should be called when user completes any learning activity.
   */
  async checkAndUpdateStreak(userId: string): Promise<StreakResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        streak: true,
        longestStreak: true,
        lastActive: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const now = new Date()
    const lastActive = user.lastActive
    const today = this.getDateString(now)
    const lastActiveDate = this.getDateString(lastActive)

    let streakMaintained = false
    let streakBroken = false
    let newStreak = user.streak

    if (today === lastActiveDate) {
      // Already active today — streak unchanged
      streakMaintained = true
    } else {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = this.getDateString(yesterday)

      if (lastActiveDate === yesterdayStr) {
        // Active yesterday — increment streak
        newStreak = user.streak + 1
        streakMaintained = true
      } else {
        // Gap in activity — streak broken, start fresh
        if (user.streak > 0) {
          streakBroken = true
          logger.info(`[GrowthEngine] Streak broken for user ${userId} (was ${user.streak})`)
        }
        newStreak = 1
      }
    }

    const newLongestStreak = Math.max(user.longestStreak, newStreak)

    // Check for streak milestones
    let milestoneReached: number | null = null
    for (const milestone of STREAK_MILESTONES) {
      if (newStreak === milestone && user.streak < milestone) {
        milestoneReached = milestone
        break
      }
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: newStreak,
        longestStreak: newLongestStreak,
        lastActive: now,
      },
    })

    // Award XP for streak milestones
    if (milestoneReached) {
      await this.awardXP(userId, 'streak_milestone', milestoneReached / 7)
      logger.info(`[GrowthEngine] Streak milestone ${milestoneReached} for user ${userId}`)
    }

    return {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      streakMaintained,
      streakBroken,
      milestoneReached,
    }
  }

  /**
   * Check and unlock achievements based on current user stats.
   * Returns newly unlocked achievements.
   */
  async checkAchievements(
    userId: string
  ): Promise<{ id: string; name: string; description: string; icon: string }[]> {
    const stats = await this.getUserStats(userId)
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const existingIds = new Set(existing.map(a => a.achievementId))

    const newlyUnlocked: { id: string; name: string; description: string; icon: string }[] = []

    for (const achievement of ACHIEVEMENTS) {
      if (existingIds.has(achievement.id)) continue

      try {
        if (achievement.condition(stats)) {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
            },
          })

          newlyUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
          })

          // Award XP for unlocking
          await this.awardXP(userId, 'achievement_unlocked')

          logger.info(`[GrowthEngine] Achievement unlocked: ${achievement.name} for user ${userId}`)
        }
      } catch (error) {
        // Unique constraint violation = already unlocked (race condition safe)
        if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
          const errMsg = error instanceof Error ? error.message : String(error)
          logger.error(`[GrowthEngine] Achievement check error: achievementId=${achievement.id} userId=${userId} error=${errMsg}`)
        }
      }
    }

    return newlyUnlocked
  }

  /**
   * Get level progress details for a user.
   */
  async getLevelProgress(userId: string): Promise<LevelProgress> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const currentLevelXP = this.xpForLevel(user.level)
    const nextLevelXP = this.xpForLevel(user.level + 1)
    const xpNeeded = nextLevelXP - user.xp
    const progressPercent = nextLevelXP > currentLevelXP
      ? Math.round(((user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
      : 100

    return {
      level: user.level,
      currentXP: user.xp,
      xpForCurrentLevel: currentLevelXP,
      xpForNextLevel: nextLevelXP,
      progressPercent: Math.max(0, Math.min(100, progressPercent)),
      xpNeeded: Math.max(0, xpNeeded),
    }
  }

  /**
   * Update daily goal progress.
   */
  async updateDailyGoal(
    userId: string,
    minutesCompleted: number
  ): Promise<{ completed: boolean; targetMinutes: number; completedMinutes: number }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.dailyGoal.findUnique({
      where: { userId_date: { userId, date: today } },
    })

    if (existing) {
      const newCompleted = existing.completedMinutes + minutesCompleted
      const isComplete = newCompleted >= existing.targetMinutes
      const wasComplete = existing.completed

      await prisma.dailyGoal.update({
        where: { id: existing.id },
        data: {
          completedMinutes: newCompleted,
          completed: isComplete,
        },
      })

      // Award XP if goal just completed
      if (isComplete && !wasComplete) {
        await this.awardXP(userId, 'daily_goal_met')
      }

      return {
        completed: isComplete,
        targetMinutes: existing.targetMinutes,
        completedMinutes: newCompleted,
      }
    } else {
      // Create today's goal
      const userPref = await prisma.userExamPreference.findUnique({
        where: { userId },
        select: { dailyGoal: true },
      })
      const targetMinutes = (userPref?.dailyGoal ?? 10) * 3 // Convert question goal to minutes estimate

      const isComplete = minutesCompleted >= targetMinutes
      await prisma.dailyGoal.create({
        data: {
          userId,
          date: today,
          targetMinutes,
          completedMinutes: minutesCompleted,
          completed: isComplete,
        },
      })

      if (isComplete) {
        await this.awardXP(userId, 'daily_goal_met')
      }

      return {
        completed: isComplete,
        targetMinutes,
        completedMinutes: minutesCompleted,
      }
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Calculate level from XP.
   * Formula: level = floor(sqrt(xp / 100))
   * Level 1 starts at 100 XP.
   */
  private calculateLevel(xp: number): number {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)))
  }

  /**
   * Calculate XP required for a given level.
   */
  private xpForLevel(level: number): number {
    return level * level * 100
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Gather all stats needed for achievement evaluation.
   */
  private async getUserStats(userId: string): Promise<UserStats> {
    const [user, testResults, lessonCompletions, topicPerformances] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          xp: true,
          level: true,
          streak: true,
          longestStreak: true,
        },
      }),
      prisma.testResult.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          passed: true,
          percentage: true,
          questionResults: true,
        },
      }),
      prisma.lessonCompletion.count({ where: { userId } }),
      prisma.topicPerformance.findMany({
        where: { userId },
        select: {
          strengthLevel: true,
          totalAttempts: true,
          correctAnswers: true,
        },
      }),
    ])

    const totalTests = testResults.length
    const passedTests = testResults.filter(r => r.passed).length
    const perfectScores = testResults.filter(r => r.percentage >= 100).length

    let totalQuestions = 0
    let totalCorrect = 0
    for (const r of testResults) {
      const qr = Array.isArray(r.questionResults) ? r.questionResults as any[] : []
      totalQuestions += qr.length
      totalCorrect += qr.filter((q: any) => q.is_correct).length
    }

    const coursesCompleted = await prisma.userProgress.count({
      where: { userId, progress: 100 },
    })

    const topicsMastered = topicPerformances.filter(
      t => t.strengthLevel === 'mastered'
    ).length

    return {
      totalTestsCompleted: totalTests,
      totalTestsPassed: passedTests,
      perfectScores,
      currentStreak: user?.streak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      totalXP: user?.xp ?? 0,
      level: user?.level ?? 1,
      coursesCompleted,
      lessonsCompleted: lessonCompletions,
      totalQuestionsAnswered: totalQuestions,
      totalCorrectAnswers: totalCorrect,
      overallAccuracy: totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0,
      topicsmastered: topicsMastered,
    }
  }
}

export const growthEngineService = new GrowthEngineService()
