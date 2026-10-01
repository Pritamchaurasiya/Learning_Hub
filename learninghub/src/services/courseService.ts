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
    try {
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
    } catch {
      const result = {
        status: 'success',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }
      return result
    }
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
        const query = params
          ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
          : ''
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

export const getFallbackCourse = (courseId: string = 'crs-dsa-101'): CourseDetails => ({
  id: courseId,
  title: 'Modern Full-Stack Development & Algorithms Masterclass',
  description:
    'Master full-stack web engineering, scalable system architecture, and deep algorithmic problem solving from scratch to enterprise production readiness.',
  short_description: 'Complete hands-on course covering TypeScript, React, Node.js, and DSA.',
  thumbnail: null,
  trailer_video: null,
  instructor: {
    id: 'inst-1',
    display_name: 'Alex Rivera',
    avatar: null,
    bio: 'Senior Principal Engineer & Author with 12+ years of distributed systems experience.',
    total_students: 48500,
    total_courses: 8,
  },
  price: 0,
  original_price: 99,
  rating: 4.9,
  review_count: 1280,
  student_count: 14200,
  duration: '38 hours',
  level: 'intermediate',
  language: 'English',
  last_updated: '2026',
  certificate: true,
  sections: [
    {
      id: 'sec-1',
      title: 'Module 1: Foundations & Architecture Setup',
      lessons: [
        {
          id: 'les-1',
          title: 'Course Overview & System Architecture Walkthrough',
          description: 'Explore the high-level roadmap and architectural components.',
          duration: '14 min',
          video_url: null,
          is_free: true,
          order: 1,
          completed: true,
        },
        {
          id: 'les-2',
          title: 'TypeScript 5.x Advanced Type Modeling & Generics',
          description: 'Master strict type systems, discriminated unions, and brand types.',
          duration: '26 min',
          video_url: null,
          is_free: false,
          order: 2,
          completed: false,
        },
        {
          id: 'les-3',
          title: 'Building Resilient Microservices with Express & Prisma',
          description: 'Set up Prisma ORM, PostgreSQL connection pools, and migrations.',
          duration: '34 min',
          video_url: null,
          is_free: false,
          order: 3,
          completed: false,
        },
      ],
    },
    {
      id: 'sec-2',
      title: 'Module 2: High-Performance Frontend & State Management',
      lessons: [
        {
          id: 'les-4',
          title: 'React 18 Concurrent Rendering & Fiber Engine',
          description: 'Deep dive into transitions, suspense boundaries, and render lanes.',
          duration: '28 min',
          video_url: null,
          is_free: false,
          order: 4,
          completed: false,
        },
        {
          id: 'les-5',
          title: 'Ultra-Fast Zustand Stores with Local Storage Sync',
          description: 'Build persistent state slices with zero unnecessary re-renders.',
          duration: '22 min',
          video_url: null,
          is_free: false,
          order: 5,
          completed: false,
        },
      ],
    },
  ],
  learning_outcomes: [
    'Design and deploy production-ready full-stack applications with TypeScript and React',
    'Implement secure backend APIs with JWT, rate limiting, and RBAC authorization',
    'Solve complex algorithmic and dynamic programming problems with optimal complexity',
    'Configure high-availability Redis caching and Bull asynchronous background queues',
  ],
  prerequisites: [
    'Basic knowledge of JavaScript / TypeScript syntax',
    'Familiarity with HTML/CSS and fundamental web concepts',
  ],
  tags: ['Full Stack', 'React', 'TypeScript', 'Node.js', 'System Design'],
  is_enrolled: false,
  progress_percent: 0,
})
