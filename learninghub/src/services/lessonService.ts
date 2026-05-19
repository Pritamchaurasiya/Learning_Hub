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

interface RawLesson {
  id: string
  title: string
  description?: string
  video_url?: string
  videoUrl?: string
  duration?: number
  order: number
  is_free?: boolean
  isFree?: boolean
  resources?: Lesson['resources']
  transcript?: string
  completed?: boolean
}

interface CourseSection {
  id: string
  title: string
  order: number
  lessons: RawLesson[]
}

export const lessonService = {
  // Get lessons for a course - returns flat array by flattening sections
  async getLessons(
    courseSlug: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ status: string; data: Lesson[] }> {
    const response = await fetchApi(`/courses/${courseSlug}/lessons`, { signal: options?.signal })
    const sections = response.data ?? []
    // Backend returns CourseSection[], flatten to Lesson[]
    const typedSections = sections as CourseSection[]
    const flatLessons: Lesson[] = typedSections.flatMap(section =>
      (section.lessons || []).map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? '',
        video_url: lesson.video_url ?? lesson.videoUrl ?? undefined,
        duration: (lesson.duration ?? 0) * 60, // Convert minutes to seconds for Lesson interface
        order: lesson.order,
        is_free: lesson.is_free ?? lesson.isFree ?? false,
        resources: Array.isArray(lesson.resources) ? lesson.resources : [],
        transcript: lesson.transcript ?? undefined,
        completed: lesson.completed ?? false,
      }))
    )
    return { status: 'success', data: flatLessons }
  },

  // Get a single lesson
  async getLesson(
    courseSlug: string,
    lessonId: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ status: string; data: Lesson }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}`, {
      signal: options?.signal,
    }) as Promise<{ status: string; data: Lesson }>
  },

  // Get course progress for current user
  async getCourseProgress(
    courseSlug: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ status: string; data: CourseProgress }> {
    const res = await fetchApi(`/courses/${courseSlug}/progress`, { signal: options?.signal })
    const data = res.data ?? res
    // Map backend fields to frontend expected fields
    const mapped = {
      course_id: data.course_id ?? courseSlug,
      enrollment_id: data.enrollment_id ?? data.id ?? '',
      completed_lessons: data.completed_lessons ?? 0,
      total_lessons: data.total_lessons ?? 0,
      progress_percent: data.progress_percent ?? 0,
      is_completed:
        data.is_completed ?? (data.status === 'completed' || data.status === 'COMPLETED'),
      completed_at: data.completed_at ?? data.updatedAt ?? null,
      last_accessed_at:
        data.last_accessed ?? data.last_accessed_at ?? data.updatedAt ?? new Date().toISOString(),
    }
    return { status: 'success', data: mapped }
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
    }) as Promise<{ status: string; data: LessonProgressResponse }>
  },

  // Mark lesson as complete
  async completeLesson(
    courseSlug: string,
    lessonId: string
  ): Promise<{ status: string; message: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/complete`, {
      method: 'POST',
    }) as Promise<{ status: string; message: string }>
  },

  // Alias for completeLesson (used by LessonPlayerPage)
  async markComplete(
    courseSlug: string,
    lessonId: string
  ): Promise<{ status: string; message: string }> {
    return this.completeLesson(courseSlug, lessonId)
  },

  // Get next lesson
  async getNextLesson(
    courseSlug: string,
    currentLessonId: string
  ): Promise<{ status: string; data?: Lesson; message?: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${currentLessonId}/next`) as Promise<{
      status: string
      data?: Lesson
      message?: string
    }>
  },

  // Get previous lesson
  async getPreviousLesson(
    courseSlug: string,
    currentLessonId: string
  ): Promise<{ status: string; data?: Lesson; message?: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${currentLessonId}/previous`) as Promise<{
      status: string
      data?: Lesson
      message?: string
    }>
  },

  // Get lesson notes
  async getNotes(
    courseSlug: string,
    lessonId: string
  ): Promise<{ status: string; data: { notes: string; updated_at?: string } }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/notes`) as Promise<{
      status: string
      data: { notes: string; updated_at?: string }
    }>
  },

  // Save lesson notes
  async saveNotes(
    courseSlug: string,
    lessonId: string,
    notes: string
  ): Promise<{ status: string; message: string }> {
    return fetchApi(`/courses/${courseSlug}/lessons/${lessonId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }) as Promise<{ status: string; message: string }>
  },
}
