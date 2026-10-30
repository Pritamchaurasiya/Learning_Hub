import { fetchApi } from '../utils/api'
import type { ActiveExamInfo } from '../types/learningContext'

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
  personalized?: boolean
}

export interface NextActionContext {
  activeExam?: ActiveExamInfo | null
  weakTopic?: string
  hasIncompleteTest?: boolean
  incompleteTestTitle?: string
  incompleteTestId?: string
  completedTestsCount?: number
}

export const dashboardService = {
  async getDashboardAnalytics(): Promise<UserDashboardAnalytics | null> {
    try {
      const res = (await fetchApi('/user-analytics/me')) as {
        status?: string
        data?: UserDashboardAnalytics
        summary?: UserDashboardAnalytics['summary']
      }

      if (res?.data?.summary) return res.data
      if (res?.summary) return res as UserDashboardAnalytics
    } catch {
      // Return null on failure so UI renders genuine empty states, not fake synthetic stats
    }

    return null
  },

  async getNextBestAction(ctx?: NextActionContext): Promise<NextBestAction> {
    const examName = ctx?.activeExam?.name || 'Target Exam'
    const examSlug = ctx?.activeExam?.slug || 'jee-main'

    // 1. Try server recommendation endpoint if online
    try {
      const res = (await fetchApi('/recommendations/next-test')) as {
        status?: string
        data?: Array<{ id: string; title: string; reason?: string; estimatedMinutes?: number }>
      }
      const topRec = Array.isArray(res?.data) && res.data[0]
      if (topRec && topRec.title) {
        return {
          id: topRec.id || 'rec-server-top',
          title: topRec.title,
          reason:
            topRec.reason ||
            `Personalized test recommended to strengthen key ${examName} syllabus domains.`,
          type: 'weak_topic',
          actionUrl: `/tests-a?exam=${examSlug}&search=${encodeURIComponent(topRec.title)}`,
          actionLabel: 'Launch Recommended Test',
          estimatedMinutes: topRec.estimatedMinutes || 15,
          priority: 'HIGH',
          personalized: true,
        }
      }
    } catch {
      // Fall through to context-aware local derivation
    }

    // 2. If student has an incomplete in-progress attempt
    if (ctx?.hasIncompleteTest) {
      return {
        id: 'action-resume-test',
        title: ctx.incompleteTestTitle
          ? `Resume Practice: ${ctx.incompleteTestTitle}`
          : 'Resume Incomplete Assessment',
        reason:
          'You have an active test session in progress. Complete it to record your scorecard and update your mastery radar.',
        type: 'daily_goal',
        actionUrl: ctx.incompleteTestId ? `/tests-a/${ctx.incompleteTestId}` : '/tests-a',
        actionLabel: 'Resume Test',
        estimatedMinutes: 10,
        priority: 'CRITICAL',
        personalized: true,
      }
    }

    // 3. If student has a verified weak topic from performance history
    if (ctx?.weakTopic) {
      return {
        id: `action-weak-topic-${ctx.weakTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: `Target Weakness: ${ctx.weakTopic}`,
        reason: `Your accuracy in ${ctx.weakTopic} is currently below benchmark. A focused 10-minute diagnostic drill will reinforce optimal concept retrieval.`,
        type: 'weak_topic',
        actionUrl: `/tests-a?exam=${examSlug}&search=${encodeURIComponent(ctx.weakTopic)}`,
        actionLabel: 'Launch Targeted Drill',
        estimatedMinutes: 10,
        priority: 'HIGH',
        personalized: true,
      }
    }

    // 4. If student has not completed any tests yet (Honest onboarding)
    if (!ctx?.completedTestsCount || ctx.completedTestsCount === 0) {
      return {
        id: 'action-diagnostic-starter',
        title: `Establish Your Baseline: ${examName} Diagnostic`,
        reason: `Take a quick 10-question adaptive assessment to map your current readiness and generate your personalized syllabus trajectory.`,
        type: 'daily_goal',
        actionUrl: `/tests-a?exam=${examSlug}`,
        actionLabel: 'Start Diagnostic Test',
        estimatedMinutes: 15,
        priority: 'HIGH',
        personalized: false,
      }
    }

    // 5. Default healthy momentum action
    return {
      id: 'action-timed-mock',
      title: `Full CBT Practice Sprint: ${examName}`,
      reason: `Regular timed mock assessments improve question pacing, reduce cognitive fatigue, and improve exam-day confidence.`,
      type: 'daily_goal',
      actionUrl: `/tests-a?exam=${examSlug}&pill=mock`,
      actionLabel: 'Start Practice Test',
      estimatedMinutes: 20,
      priority: 'MEDIUM',
      personalized: false,
    }
  },
}
