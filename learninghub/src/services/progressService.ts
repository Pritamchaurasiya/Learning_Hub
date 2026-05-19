import { fetchApi } from '../utils/api'

export interface LessonProgress {
  lessonId: string
  courseId: string
  currentTime: number
  duration: number
  completed: boolean
  lastAccessedAt: string
}

export interface CourseProgress {
  courseId: string
  completedLessons: string[]
  totalLessons: number
  overallProgress: number
  lastAccessedAt: string
}

export const progressService = {
  // Save lesson progress via course lesson endpoint
  saveLessonProgress: async (
    lessonId: string,
    courseId: string,
    currentTime: number,
    duration: number,
    completed: boolean = false
  ): Promise<boolean> => {
    try {
      await fetchApi(`/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          progress: completed ? 100 : Math.round((currentTime / duration) * 100) || 0,
        }),
      })
      return true
    } catch (error) {
      // Store locally if API fails
      const key = `lesson-progress-${lessonId}`
      localStorage.setItem(
        key,
        JSON.stringify({
          lessonId,
          courseId,
          currentTime,
          duration,
          completed,
          lastAccessedAt: new Date().toISOString(),
        })
      )
      if (import.meta.env.DEV) {
        console.warn('Progress saved locally due to API error:', error)
      }
      return false
    }
  },

  // Get lesson progress — falls back to localStorage since lesson endpoint requires courseId
  getLessonProgress: async (
    lessonId: string,
    courseId?: string
  ): Promise<LessonProgress | null> => {
    // If we have courseId, try the real endpoint
    if (courseId) {
      try {
        const response = await fetchApi(`/courses/${courseId}/lessons/${lessonId}`)
        if (response?.data) {
          return {
            lessonId: response.data.id ?? lessonId,
            courseId,
            currentTime: 0,
            duration: response.data.duration ?? 0,
            completed: response.data.completed ?? false,
            lastAccessedAt: new Date().toISOString(),
          }
        }
      } catch {
        // Fall through to localStorage
      }
    }
    // Fallback to local storage
    const key = `lesson-progress-${lessonId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        return JSON.parse(saved) as LessonProgress
      } catch {
        return null
      }
    }
    return null
  },

  // Get course progress
  getCourseProgress: async (courseId: string): Promise<CourseProgress | null> => {
    try {
      const response = await fetchApi(`/courses/${courseId}/progress`)
      if (response?.data) {
        return {
          courseId,
          completedLessons: response.data.completed_lessons ?? [],
          totalLessons: response.data.total_lessons ?? 0,
          overallProgress: response.data.progress ?? 0,
          lastAccessedAt: response.data.lastActivityAt ?? new Date().toISOString(),
        }
      }
    } catch {
      // Fallback to local storage
    }
    return null
  },

  // Mark lesson as complete
  markLessonComplete: async (lessonId: string, courseId: string): Promise<boolean> => {
    return progressService.saveLessonProgress(lessonId, courseId, 0, 0, true)
  },

  // Sync local progress to server
  syncLocalProgress: async (): Promise<number> => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('lesson-progress-'))
    let synced = 0

    for (const key of keys) {
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          const progress: LessonProgress = JSON.parse(saved)
          const success = await progressService.saveLessonProgress(
            progress.lessonId,
            progress.courseId,
            progress.currentTime,
            progress.duration,
            progress.completed
          )
          if (success) {
            localStorage.removeItem(key)
            synced++
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to sync progress:', error)
          }
        }
      }
    }
    return synced
  },

  // Get all user progress from /auth/me
  getAllProgress: async (): Promise<CourseProgress[]> => {
    try {
      const response = await fetchApi('/auth/me')
      const data = response.data ?? response
      const progress = data.progress ?? data.userProgress ?? []
      return progress.map((p: any) => ({
        courseId: p.courseId,
        completedLessons: [],
        totalLessons: 0,
        overallProgress: p.progress ?? 0,
        lastAccessedAt: p.lastActivityAt ?? p.lastActive ?? new Date().toISOString(),
      }))
    } catch {
      return []
    }
  },
}
