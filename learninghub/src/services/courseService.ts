import { fetchApi } from '../utils/api'
import { CacheService, CacheKeys, withCache } from './cacheService'

export interface CourseLesson {
  id: string
  title: string
  description: string | null
  duration: string
  video_url: string | null
  is_free: boolean
  order: number
  completed: boolean
}

export interface CourseSection {
  id: string
  title: string
  lessons: CourseLesson[]
}

export interface CourseReview {
  id: string
  user: {
    id: string
    display_name: string
    avatar: string | null
  }
  rating: number
  review: string
  created_at: string
}

export interface CourseDetails {
  id: string
  title: string
  description: string
  short_description: string | null
  thumbnail: string | null
  trailer_video: string | null
  instructor: {
    id: string
    display_name: string
    avatar: string | null
    bio: string | null
    total_students: number
    total_courses: number
  }
  price: number
  original_price: number | null
  rating: number
  review_count: number
  student_count: number
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced'
  language: string
  last_updated: string
  certificate: boolean
  sections: CourseSection[]
  learning_outcomes: string[]
  prerequisites: string[]
  tags: string[]
  is_enrolled: boolean
  progress_percent: number | null
}

export interface EnrollmentResponse {
  enrollment_id: string
  status: 'enrolled' | 'pending' | 'failed'
  message: string
}

export const courseService = {
  getCourses: async (
    params?: Record<string, string>
  ): Promise<{
    status: string
    data: CourseDetails[]
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  }> => {
    const cacheKey = CacheKeys.courseList(params ?? {})

    const cached = CacheService.get<{
      status: string
      data: CourseDetails[]
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }>(cacheKey)

    if (cached) return cached

    const query = params ? `?${new URLSearchParams(params).toString()}` : ''
    const res = await fetchApi(`/courses${query}`)

    const responseData = res.data ?? res
    const result = {
      status: res.status ?? 'success',
      data: responseData?.courses ?? responseData ?? [],
      pagination: responseData?.pagination,
    }

    const ttl = params?.q ? 5 * 60 * 1000 : 10 * 60 * 1000
    CacheService.set(cacheKey, result, ttl)

    return result
  },

  getCourse: (id: string) =>
    withCache(
      () => fetchApi(`/courses/${id}`) as Promise<{ status: string; data: CourseDetails }>,
      CacheKeys.course(id),
      10 * 60 * 1000
    ),

  getCourseLessons: (id: string) =>
    withCache(
      () =>
        fetchApi(`/courses/${id}`).then(res => {
          const course = res?.course ?? res?.data ?? res
          return { status: 'success', data: course?.sections ?? [] }
        }) as Promise<{ status: string; data: CourseSection[] }>,
      `lessons_${id}`,
      15 * 60 * 1000
    ),

  getCourseReviews: (id: string, params?: { page?: number; limit?: number }) =>
    withCache(
      () => {
        const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
        return fetchApi(`/courses/${id}/reviews${query}`) as Promise<{
          status: string
          data: CourseReview[]
          meta: { total: number; page: number; pages: number }
        }>
      },
      `reviews_${id}_${params?.page ?? 1}`,
      5 * 60 * 1000
    ),

  enroll: (id: string) =>
    fetchApi('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({ courseId: id }),
    }) as Promise<{ status: string; data: EnrollmentResponse }>,

  getProgress: (
    id: string
  ): Promise<{
    status: string
    data: { progress_percent: number; completed_lessons: number; total_lessons: number }
  }> =>
    fetchApi(`/courses/${id}/progress`) as Promise<{
      status: string
      data: { progress_percent: number; completed_lessons: number; total_lessons: number }
    }>,

  updateProgress: (courseId: string, progressPercent: number) => {
    CacheService.delete(`course_${courseId}`)
    return fetchApi(`/courses/${courseId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ progress: progressPercent }),
    }) as Promise<{ status: string; data: { enrollment: { progress: number } } }>
  },
}
