import { fetchApi } from '../utils/api'

export interface UserDashboardAnalytics {
  summary: {
    totalTestsCompleted: number
    totalQuestionsAnswered: number
    overallAccuracy: number
    averageScore: number
    passRate: number
    totalStudyTimeMinutes: number
    currentStreak: number
    longestStreak: number
  }
  accuracyTrend: Array<{ date: string; accuracy: number; testsCompleted: number }>
  speedTrend: Array<{ date: string; avgTimePerQuestion: number; questionsAnswered: number }>
  topicMastery: Record<string, { topicName: string; accuracy: number; totalAttempts: number }>
  growth: {
    growthScore: number
    accuracyDelta: number
    speedDelta: number
    consistencyScore: number
  }
}

export interface NextBestAction {
  id: string
  title: string
  reason: string
  type: 'spaced_repetition' | 'weak_topic' | 'daily_goal' | 'contest'
  actionUrl: string
  actionLabel: string
  estimatedMinutes: number
  multiplierBonus?: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
}

export const dashboardService = {
export const dashboardService = {
  async getDashboardAnalytics(): Promise<UserDashboardAnalytics | null> {
    try {
      const res = (await fetchApi('/user-analytics/me')) as {
        status?: string
        data?: UserDashboardAnalytics
        summary?: UserDashboardAnalytics['summary']
      }

      // Support both the standard API envelope and a directly returned payload.
      if (res?.data?.summary) return res.data
      if (res?.summary) return res as UserDashboardAnalytics
    } catch {
      // An unavailable endpoint should produce an honest empty state, not synthetic progress.
    }

    return null
  },
}
