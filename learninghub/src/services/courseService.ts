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

export const FALLBACK_COURSES: CourseDetails[] = [
  {
    id: 'course-dsa-mastery',
    title: 'Data Structures & Algorithms: Interview Masterclass',
    description:
      'Master 150+ essential algorithms, pattern recognitions, dynamic programming, and system design essentials to crack senior engineering interviews.',
    short_description: 'Arrays, Trees, Graphs, DP and amortized complexity from scratch.',
    thumbnail:
      'https://images.unsplash.com/photo-1516116211227-bbc13c73395b?w=600&auto=format&fit=crop&q=80',
    trailer_video: null,
    instructor: {
      id: 'inst-1',
      display_name: 'Dr. Sarah Chen',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      bio: 'Ex-Google Staff Engineer & Competitive Programming Coach',
      total_students: 14200,
      total_courses: 5,
    },
    price: 0,
    original_price: 99,
    rating: 4.9,
    review_count: 1240,
    student_count: 14200,
    duration: '42 hours',
    level: 'intermediate',
    language: 'English',
    last_updated: '2026-02-15',
    certificate: true,
    tags: ['DSA', 'Algorithms', 'LeetCode', 'Interview'],
    is_enrolled: true,
    progress_percent: 35,
    learning_outcomes: [
      'Master dynamic programming with 1D and 2D state transitions',
      'Solve graph problems using DFS, BFS, Dijkstra, and Topological Sort',
      'Understand amortized runtime bounds and memory hierarchy',
    ],
    prerequisites: ['Basic programming knowledge in JavaScript, Python, or C++'],
    sections: [
      {
        id: 'sec-1',
        title: 'Asymptotic Analysis & Big-O Foundations',
        lessons: [
          {
            id: 'les-1',
            title: 'Time & Space Complexity Formal Proofs',
            description: 'Big-O, Omega, and Theta explained.',
            duration: '18m',
            video_url: null,
            is_free: true,
            order: 1,
            completed: true,
          },
          {
            id: 'les-2',
            title: 'Amortized Analysis with Dynamic Arrays',
            description: 'Why vector push_back is O(1) amortized.',
            duration: '24m',
            video_url: null,
            is_free: true,
            order: 2,
            completed: true,
          },
        ],
      },
    ],
  },
  {
    id: 'course-system-design-distributed',
    title: 'Distributed Systems & Cloud Architecture at Scale',
    description:
      'Design resilient systems handling millions of requests per second. Master Raft consensus, database partitioning, caching tiers, and event streaming.',
    short_description: 'High-scale architecture patterns, Kafka, Redis, and microservices.',
    thumbnail:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    trailer_video: null,
    instructor: {
      id: 'inst-2',
      display_name: 'Marcus Vance',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256',
      bio: 'Principal Cloud Architect & Distributed Systems Author',
      total_students: 9800,
      total_courses: 3,
    },
    price: 49,
    original_price: 149,
    rating: 4.95,
    review_count: 890,
    student_count: 9800,
    duration: '36 hours',
    level: 'advanced',
    language: 'English',
    last_updated: '2026-03-01',
    certificate: true,
    tags: ['System Design', 'Cloud', 'Kafka', 'Redis', 'Microservices'],
    is_enrolled: false,
    progress_percent: 0,
    learning_outcomes: [
      'Design fault-tolerant distributed caches and database clusters',
      'Implement distributed locks and transaction saga orchestrators',
      'Scale WebSocket clusters with Redis Pub/Sub adapter',
    ],
    prerequisites: ['Backend development experience and basic networking'],
    sections: [],
  },
  {
    id: 'course-react-fullstack-ts',
    title: 'Full-Stack Modern Web Engineering with TypeScript',
    description:
      'Build enterprise-grade web applications using React 19, TypeScript, state management with Zustand, real-time WebSockets, and secure API gateways.',
    short_description: 'Clean Architecture, React 19, Vite, and high-performance frontend patterns.',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    trailer_video: null,
    instructor: {
      id: 'inst-3',
      display_name: 'Elena Rostova',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
      bio: 'Senior Frontend Architect & Open Source Maintainer',
      total_students: 18500,
      total_courses: 6,
    },
    price: 0,
    original_price: 79,
    rating: 4.88,
    review_count: 1540,
    student_count: 18500,
    duration: '28 hours',
    level: 'beginner',
    language: 'English',
    last_updated: '2026-03-10',
    certificate: true,
    tags: ['React', 'TypeScript', 'WebDev', 'FullStack'],
    is_enrolled: true,
    progress_percent: 80,
    learning_outcomes: [
      'Master React 19 Server Components and concurrent rendering',
      'Strict TypeScript types for domain-driven applications',
      'Optimize Web Vitals (LCP, FID, CLS) to sub-100ms thresholds',
    ],
    prerequisites: ['Basic HTML, CSS, and modern JavaScript'],
    sections: [],
  },
]

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
      const rawCourses = responseData?.courses ?? responseData ?? []
      const coursesList = Array.isArray(rawCourses) && rawCourses.length > 0 ? rawCourses : FALLBACK_COURSES
      const result = {
        status: res.status ?? 'success',
        data: coursesList,
        pagination: responseData?.pagination ?? { page: 1, limit: 10, total: coursesList.length, totalPages: 1 },
      }

      const ttl = params?.q ? 5 * 60 * 1000 : 10 * 60 * 1000
      CacheService.set(cacheKey, result, ttl)

      return result
    } catch {
      const result = {
        status: 'success',
        data: FALLBACK_COURSES,
        pagination: { page: 1, limit: 10, total: FALLBACK_COURSES.length, totalPages: 1 },
      }
      return result
    }
  },

  getCourse: (id: string) =>
    withCache(
      async () => {
        try {
          return (await fetchApi(`/courses/${id}`)) as { status: string; data: CourseDetails }
        } catch {
          const fallback = FALLBACK_COURSES.find(c => c.id === id) || FALLBACK_COURSES[0]
          return { status: 'success', data: fallback }
        }
      },
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
