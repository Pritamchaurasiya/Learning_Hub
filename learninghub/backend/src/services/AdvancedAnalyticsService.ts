import { prisma } from '../config'
import logger from '../utils/logger'

interface TimeSeriesData {
  date: string
  value: number
}

interface CohortData {
  cohort: string
  week0: number
  week1: number
  week2: number
  week3: number
  week4: number
}

function clampDays(days: number): number {
  if (typeof days !== 'number' || isNaN(days) || days < 1) return 30
  return Math.min(Math.floor(days), 365)
}

function clampWeeks(weeks: number): number {
  if (typeof weeks !== 'number' || isNaN(weeks) || weeks < 1) return 8
  return Math.min(Math.floor(weeks), 52)
}

function clampLimit(limit: number): number {
  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) return 10
  return Math.min(Math.floor(limit), 100)
}

export class AdvancedAnalyticsService {
  /**
   * Daily Active Users — users who were active (lastActive) within each day.
   * Table: "users" (@@map), Column: "lastActive" (not "lastLogin")
   */
  async getDailyActiveUsers(days: number = 30): Promise<TimeSeriesData[]> {
    const safeDays = clampDays(days)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          DATE("lastActive") as date,
          COUNT(DISTINCT id) as value
        FROM "users"
        WHERE "lastActive" >= NOW() - (make_interval(days => ${safeDays}))
          AND "deletedAt" IS NULL
        GROUP BY DATE("lastActive")
        ORDER BY date ASC
      `
      return results.map((r: any) => ({ date: r.date, value: Number(r.value) }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getDailyActiveUsers failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * Test Attempt trend — new test attempts per day.
   * Table: "test_results" (@@map)
   */
  async getTestAttemptTrend(days: number = 30): Promise<TimeSeriesData[]> {
    const safeDays = clampDays(days)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as value
        FROM "test_results"
        WHERE "createdAt" >= NOW() - (make_interval(days => ${safeDays}))
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `
      return results.map((r: any) => ({ date: r.date, value: Number(r.value) }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getEnrollmentTrend failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * Test completion trend — completed tests per day.
   * Table: "test_results" (@@map), Column: "completedAt", Status: "COMPLETED"
   */
  async getTestCompletionTrend(days: number = 30): Promise<TimeSeriesData[]> {
    const safeDays = clampDays(days)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          DATE("completedAt") as date,
          COUNT(*) as value
        FROM "test_results"
        WHERE "completedAt" >= NOW() - (make_interval(days => ${safeDays}))
          AND status = 'COMPLETED'
        GROUP BY DATE("completedAt")
        ORDER BY date ASC
      `
      return results.map((r: any) => ({ date: r.date, value: Number(r.value) }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getTestCompletionTrend failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * Cohort retention — weekly retention of user cohorts.
   * Table: "users" (@@map), Column: "lastActive" (not "lastLogin")
   */
  async getCohortRetention(weeks: number = 8): Promise<CohortData[]> {
    const safeWeeks = clampWeeks(weeks)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        WITH cohorts AS (
          SELECT 
            id,
            DATE_TRUNC('week', "createdAt") as cohort_week
          FROM "users"
          WHERE "createdAt" >= NOW() - (make_interval(weeks => ${safeWeeks}))
            AND "deletedAt" IS NULL
        ),
        activity AS (
          SELECT DISTINCT
            id as "userId",
            DATE_TRUNC('week', "lastActive") as activity_week
          FROM "users"
          WHERE "lastActive" IS NOT NULL
            AND "deletedAt" IS NULL
        )
        SELECT 
          c.cohort_week::date as cohort,
          COUNT(DISTINCT c.id) as week0,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c.id END) as week1,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c.id END) as week2,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '3 weeks' THEN c.id END) as week3,
          COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c.id END) as week4
        FROM cohorts c
        LEFT JOIN activity a ON c.id = a."userId"
        GROUP BY c.cohort_week
        ORDER BY c.cohort_week DESC
      `
      return results.map((r: any) => ({
        cohort: r.cohort,
        week0: Number(r.week0),
        week1: Number(r.week1),
        week2: Number(r.week2),
        week3: Number(r.week3),
        week4: Number(r.week4),
      }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getCohortRetention failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * Learning patterns by hour — when users are most active.
   * Table: "users" (@@map), Column: "lastActive"
   */
  async getLearningPatternsByHour(): Promise<{ hour: number; activity: number }[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          EXTRACT(HOUR FROM "lastActive") as hour,
          COUNT(*) as activity
        FROM "users"
        WHERE "lastActive" >= NOW() - INTERVAL '30 days'
          AND "deletedAt" IS NULL
        GROUP BY EXTRACT(HOUR FROM "lastActive")
        ORDER BY hour ASC
      `
      return results.map((r: any) => ({ hour: Number(r.hour), activity: Number(r.activity) }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getLearningPatternsByHour failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * Test completion funnel — stages of test engagement.
   */
  async getTestCompletionFunnel(testId: string) {
    const [started, passed, failed] = await Promise.all([
      prisma.testResult.count({ where: { testId } }),
      prisma.testResult.count({ where: { testId, passed: true } }),
      prisma.testResult.count({ where: { testId, passed: false, status: 'COMPLETED' } }),
    ])

    return {
      started,
      passed,
      failed,
      passRate: started > 0 ? (passed / started) * 100 : 0,
      failRate: started > 0 ? (failed / started) * 100 : 0,
    }
  }

  /**
   * Top tests by engagement — ranked by completion rate.
   * Table: "tests" (@@map), "test_results" (@@map)
   */
  async getTopTestsByEngagement(limit: number = 10) {
    const safeLimit = clampLimit(limit)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          t.id,
          t.title,
          COUNT(DISTINCT tr."userId") as total_attempts,
          AVG(tr.score) as avg_score,
          COUNT(DISTINCT CASE WHEN tr.passed = true THEN tr."userId" END) as passers,
          (COUNT(DISTINCT CASE WHEN tr.passed = true THEN tr."userId" END)::float / 
           NULLIF(COUNT(DISTINCT tr."userId"), 0) * 100) as pass_rate
        FROM "tests" t
        LEFT JOIN "test_results" tr ON t.id = tr."testId"
        WHERE t."isPublished" = true
          AND t."deletedAt" IS NULL
        GROUP BY t.id, t.title
        ORDER BY pass_rate DESC, total_attempts DESC
        LIMIT ${safeLimit}
      `
      return results
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getTopCoursesByEngagement failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  /**
   * User learning velocity — activity count per day (replaces broken xpEarned query).
   * Table: "activity_logs" (@@map)
   */
  async getUserLearningVelocity(userId: string, days: number = 30): Promise<TimeSeriesData[]> {
    const safeDays = clampDays(days)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as value
        FROM "activity_logs"
        WHERE "userId" = ${userId}
          AND "createdAt" >= NOW() - (make_interval(days => ${safeDays}))
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `
      return results.map((r: any) => ({ date: r.date, value: Number(r.value) }))
    } catch (error) {
      logger.error(
        '[AdvancedAnalytics] getUserLearningVelocity failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService()
