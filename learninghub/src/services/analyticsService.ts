import { fetchApi } from '../utils/api'

export interface DashboardStats {
  total_courses: number
  completed_courses: number
  in_progress_courses: number
  total_learning_time: number
  average_score: number
  current_streak: number
  longest_streak: number
  xp_points: number
  level: number
  rank?: string
  topic_performance?: Array<{
    topic: string
    subject: string
    attempts: number
    accuracy: number
  }>
}

export interface CourseAnalytics {
  course_id: string
  course_title: string
  enrollment_date: string
  progress_percent: number
  completed_lessons: number
  total_lessons: number
  time_spent: number
  last_accessed: string
  average_quiz_score: number
  is_completed: boolean
  certificate_issued?: boolean
}

export interface LearningActivity {
  date: string
  courses_accessed: number
  lessons_completed: number
  time_spent: number
  xp_earned: number
}

export interface Recommendation {
  id: string
  type: string
  confidence: number
  reason: string
}

export interface SpacedRepetitionItem {
  id: string
  nextReview: string
  topicName: string
  subjectName: string
  intervalDays: number
}

export interface SkillProgress {
  skill_name: string
  category: string
  proficiency_percent: number
  courses_completed: number
  total_courses: number
}

export interface TestAnalytics {
  total_tests: number
  passed_tests: number
  pass_rate: number
  average_score: number
  by_difficulty?: Record<string, { total: number; passed: number; avgScore: number }>
  trend?: Array<{
    test_title: string
    score: number
    passed: boolean
    completed_at: string
  }>
  topic_performance?: Array<{
    topic: string
    accuracy: number
    total_attempts: number
  }>
}

export interface AchievementAnalytics {
  total_achievements: number
  unlocked_achievements: number
  recent_achievements: Array<{
    id: string
    name: string
    description: string
    unlocked_at: string
    icon?: string
  }>
}

interface RawProgressItem {
  courseId?: string
  course?: { id?: string; title?: string; thumbnail?: string | null }
  course_title?: string
  progress?: number
  createdAt?: string
  created_at?: string
  timeSpentSeconds?: number
  time_spent_seconds?: number
  lastActivityAt?: string
  last_activity_at?: string
  updatedAt?: string
  status?: string
}

interface RawTopicPerformance {
  topic?: string
  topicName?: string
  subject?: string
  subjectName?: string
  accuracy?: number
  attempts?: number
}

interface RawAchievement {
  id: string
  name?: string
  achievement_name?: string
  description?: string
  achievement_description?: string
  unlockedAt?: string
  unlocked_at?: string
  icon?: string
  achievement_icon?: string
}

export const analyticsService = {
  async getDashboardStats(): Promise<{ status: string; data: DashboardStats }> {
    return fetchApi('/analytics/dashboard')
  },

  async getCourseAnalytics(): Promise<{ status: string; data: CourseAnalytics[] }> {
    return fetchApi('/analytics/dashboard').then(res => {
      return fetchApi('/auth/me').then(meRes => {
        const payload = meRes.data ?? meRes
        const progress: RawProgressItem[] = payload.user?.progress ?? payload.progress ?? []
        return {
          status: res.status ?? 'success',
          data: progress.map((item: RawProgressItem) => ({
            course_id: item.courseId ?? item.course?.id ?? '',
            course_title: item.course?.title ?? item.course_title ?? 'Course',
            enrollment_date: item.createdAt ?? item.created_at ?? new Date(0).toISOString(),
            progress_percent: item.progress ?? 0,
            completed_lessons: (item.progress ?? 0) >= 100 ? 1 : 0,
            total_lessons: 0,
            time_spent: Math.round((item.timeSpentSeconds ?? item.time_spent_seconds ?? 0) / 60),
            last_accessed:
              item.lastActivityAt ??
              item.last_activity_at ??
              item.updatedAt ??
              new Date(0).toISOString(),
            average_quiz_score: 0,
            is_completed: item.status === 'COMPLETED' || (item.progress ?? 0) >= 100,
            certificate_issued: false,
          })),
        }
      })
    })
  },

  async getLearningActivity(
    days: number = 30
  ): Promise<{ status: string; data: LearningActivity[] }> {
    return fetchApi(`/analytics/learning-activity?days=${days}`)
  },

  async getSkillProgress(): Promise<{ status: string; data: SkillProgress[] }> {
    return fetchApi('/analytics/dashboard').then(res => {
      const stats = res.data ?? res
      const topics: RawTopicPerformance[] = stats.topic_performance ?? []
      const skills: SkillProgress[] = topics.map((t: RawTopicPerformance) => ({
        skill_name: t.topic ?? t.topicName ?? 'Unknown Topic',
        category: t.subject ?? t.subjectName ?? 'General',
        proficiency_percent: t.accuracy ?? 0,
        courses_completed: 0,
        total_courses: t.attempts ?? 1,
      }))
      if (skills.length === 0) {
        return fetchApi('/auth/me').then(meRes => {
          const data = meRes.data ?? meRes
          const userData = data.user ?? data
          const progress: RawProgressItem[] = userData.progress ?? []
          return {
            status: meRes.status ?? 'success',
            data: progress.map((p: RawProgressItem) => ({
              skill_name: p.course?.title ?? p.course_title ?? p.courseId ?? 'Course',
              category: 'General',
              proficiency_percent: p.progress ?? 0,
              courses_completed: (p.progress ?? 0) >= 100 ? 1 : 0,
              total_courses: 1,
            })),
          }
        })
      }
      return { status: 'success', data: skills }
    })
  },

  async getTestAnalytics(): Promise<{ status: string; data: TestAnalytics }> {
    return fetchApi('/tests/analytics')
  },

  async getAchievementAnalytics(): Promise<{ status: string; data: AchievementAnalytics }> {
    return fetchApi('/gamification/achievements').then(res => {
      const data = res.data ?? res
      const achievements: RawAchievement[] = Array.isArray(data) ? data : (data?.achievements ?? [])
      return {
        status: res.status ?? 'success',
        data: {
          total_achievements: 20,
          unlocked_achievements: achievements.length,
          recent_achievements: achievements.slice(0, 5).map((a: RawAchievement) => ({
            id: a.id,
            name: a.name ?? a.achievement_name ?? '',
            description: a.description ?? a.achievement_description ?? '',
            unlocked_at: a.unlockedAt ?? a.unlocked_at ?? new Date().toISOString(),
            icon: a.icon ?? a.achievement_icon ?? '',
          })),
        },
      }
    })
  },

  async getStudyStreak(): Promise<{
    status: string
    data: { current: number; longest: number; history: boolean[] }
  }> {
    return fetchApi('/analytics/dashboard').then(res => {
      const stats = res.data ?? res
      const currentStreak = stats.current_streak ?? 0
      const longestStreak = stats.longest_streak ?? currentStreak
      const history = Array(30).fill(false)
      for (let i = 0; i < Math.min(currentStreak, 30); i++) {
        history[29 - i] = true
      }
      return {
        status: 'success',
        data: { current: currentStreak, longest: longestStreak, history },
      }
    })
  },

  async generateReport(
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<{ status: string; download_url: string }> {
    const [dashboard, courses] = await Promise.all([
      fetchApi('/analytics/dashboard'),
      fetchApi('/courses'),
    ])
    const reportData = {
      analytics: dashboard.data ?? dashboard,
      courses: courses.data ?? courses,
      generatedAt: new Date().toISOString(),
      format,
    }
    const jsonStr = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return { status: 'success', download_url: url }
  },

  async getRecommendations(): Promise<{ status: string; data: Recommendation[] }> {
    return fetchApi('/analytics/recommendations').catch(() => ({ status: 'error', data: [] }))
  },

  async getSpacedRepetitionSchedule(): Promise<{ status: string; data: SpacedRepetitionItem[] }> {
    return fetchApi('/analytics/spaced-repetition').catch(() => ({ status: 'error', data: [] }))
  },
}
