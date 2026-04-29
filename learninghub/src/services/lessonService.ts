import { fetchApi } from '../utils/api'

export interface LessonProgress {
  completed: boolean
  completed_at?: string
  progress_percent: number
  watch_time_seconds: number
  last_watched_at?: string
  notes?: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  video_url?: string
  duration: number // in seconds
  order: number
  is_free: boolean
  resources?: Array<{
    id: string
    title: string
    type: 'pdf' | 'link' | 'video' | 'code' | 'file'
    url: string
    file_size?: number
  }>
  transcript?: string
  completed?: boolean
  progress?: LessonProgress
}

export interface CourseProgress {
  course_id: string
  enrollment_id: string
  completed_lessons: number
  total_lessons: number
  progress_percent: number
  is_completed: boolean
  completed_at?: string
  last_accessed_at: string
}

export interface LessonProgressResponse extends LessonProgress {
  lesson_id: string
}

export const lessonService = {
  // Get lessons for a course
  async getLessons(courseSlug: string, options?: { signal?: AbortSignal }): Promise<{ status: string; data: Lesson[] }> {
    return fetchApi(`/courses/${courseSlug}/lessons`, { signal: options?.signal })
  },

  // Get a single lesson
  async getLesson(courseSlug: string, lessonId: string, options?: { signal?: AbortSignal }): Promise<{ status: string; data: Lesson }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}`, { signal: options?.signal })
  },

  // Get course progress for current user
  async getCourseProgress(courseSlug: string, options?: { signal?: AbortSignal }): Promise<{ status: string; data: CourseProgress }> {
    return fetchApi(`/courses/${courseSlug}/progress`, { signal: options?.signal })
  },

  // Update lesson progress
  async updateProgress(
    courseSlug: string,
    lessonId: string,
    progress: {
      progress_percent: number
      watch_time_seconds: number
      completed?: boolean
    }
  ): Promise<{ status: string; data: LessonProgressResponse }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progress),
    })
  },

  // Mark lesson as complete
  async completeLesson(courseSlug: string, lessonId: string): Promise<{ status: string; message: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/complete`, {
      method: 'POST',
    })
  },

  // Get next lesson
  async getNextLesson(courseSlug: string, currentLessonId: string): Promise<{ status: string; data?: Lesson; message?: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${currentLessonId}/next`)
  },

  // Get previous lesson
  async getPreviousLesson(courseSlug: string, currentLessonId: string): Promise<{ status: string; data?: Lesson; message?: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${currentLessonId}/previous`)
  },

  // Get lesson notes
  async getNotes(courseSlug: string, lessonId: string): Promise<{ status: string; data: { notes: string; updated_at?: string } }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/notes`)
  },

  // Save lesson notes
  async saveNotes(courseSlug: string, lessonId: string, notes: string): Promise<{ status: string; message: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    })
  },
}
