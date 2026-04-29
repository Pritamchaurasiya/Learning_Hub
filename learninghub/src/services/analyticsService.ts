import { fetchApi } from '../utils/api'

export interface DashboardStats {
  total_courses: number
  completed_courses: number
  in_progress_courses: number
  total_learning_time: number // in minutes
  average_score: number
  current_streak: number
  longest_streak: number
  xp_points: number
  level: number
  rank?: string
}

export interface CourseAnalytics {
  course_id: string
  course_title: string
  enrollment_date: string
  progress_percent: number
  completed_lessons: number
  total_lessons: number
  time_spent: number // in minutes
  last_accessed: string
  average_quiz_score: number
  is_completed: boolean
  certificate_issued?: boolean
}

export interface LearningActivity {
  date: string
  courses_accessed: number
  lessons_completed: number
  time_spent: number // in minutes
  xp_earned: number
}

export interface SkillProgress {
  skill_name: string
  category: string
  proficiency_percent: number
  courses_completed: number
  total_courses: number
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

export const analyticsService = {
  // Get dashboard stats
  async getDashboardStats(): Promise<{ status: string; data: DashboardStats }> {
    return fetchApi('/analytics/dashboard/')
  },

  // Get course analytics
  async getCourseAnalytics(): Promise<{ status: string; data: CourseAnalytics[] }> {
    return fetchApi('/analytics/courses/')
  },

  // Get learning activity (for charts)
  async getLearningActivity(days: number = 30): Promise<{ status: string; data: LearningActivity[] }> {
    return fetchApi(`/analytics/activity/?days=${days}`)
  },

  // Get skill progress
  async getSkillProgress(): Promise<{ status: string; data: SkillProgress[] }> {
    return fetchApi('/analytics/skills/')
  },

  // Get achievement analytics
  async getAchievementAnalytics(): Promise<{ status: string; data: AchievementAnalytics }> {
    return fetchApi('/analytics/achievements/')
  },

  // Get study streak data
  async getStudyStreak(): Promise<{ status: string; data: { current: number; longest: number; history: boolean[] } }> {
    return fetchApi('/analytics/streak/')
  },

  // Generate learning report
  async generateReport(format: 'pdf' | 'csv' = 'pdf'): Promise<{ status: string; download_url: string }> {
    return fetchApi('/analytics/report/', {
      method: 'POST',
      body: JSON.stringify({ format })
    })
  },
}
