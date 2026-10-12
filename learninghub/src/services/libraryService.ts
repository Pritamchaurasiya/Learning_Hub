import { fetchApi } from '../utils/api'

export interface Course {
  id: string
  title: string
  description: string
  short_description?: string
  instructor: {
    id: string
    username: string
    display_name: string
    avatar?: string
  }
  category: {
    id: string
    name: string
    slug: string
  }
  slug: string
  duration: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  price: number
  is_free: boolean
  enrollment_count: number
  average_rating: number
  review_count: number
  thumbnail?: string
  created_at: string
  updated_at: string
}

export interface CoursesResponse {
  status: string
  data: Course[]
  count?: number
}

export interface CourseFilters {
  category?: string
  difficulty?: string
  is_free?: boolean
  min_price?: number
  max_price?: number
  search?: string
  ordering?: string
}

const FALLBACK_LIBRARY_COURSES: Course[] = [
  {
    id: 'course-dsa-mastery',
    title: 'Data Structures & Algorithms: Interview Masterclass',
    description:
      'Master 150+ essential algorithms, pattern recognitions, dynamic programming, and system design essentials.',
    short_description: 'Arrays, Trees, Graphs, DP and amortized complexity from scratch.',
    slug: 'dsa-interview-masterclass',
    duration: '42 hours',
    level: 'Intermediate',
    price: 0,
    is_free: true,
    enrollment_count: 14200,
    average_rating: 4.9,
    review_count: 1240,
    thumbnail:
      'https://images.unsplash.com/photo-1516116211227-bbc13c73395b?w=600&auto=format&fit=crop&q=80',
    instructor: { id: 'inst-1', username: 'sarah_chen', display_name: 'Dr. Sarah Chen' },
    category: { id: 'cat-cs', name: 'Computer Science', slug: 'computer-science' },
    created_at: '2026-01-10',
    updated_at: '2026-02-15',
  },
  {
    id: 'course-system-design-distributed',
    title: 'Distributed Systems & Cloud Architecture at Scale',
    description:
      'Design resilient systems handling millions of requests per second. Master Raft consensus and database partitioning.',
    short_description: 'High-scale architecture patterns, Kafka, Redis, and microservices.',
    slug: 'distributed-systems-cloud-architecture',
    duration: '36 hours',
    level: 'Advanced',
    price: 49,
    is_free: false,
    enrollment_count: 9800,
    average_rating: 4.95,
    review_count: 890,
    thumbnail:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    instructor: { id: 'inst-2', username: 'marcus_vance', display_name: 'Marcus Vance' },
    category: { id: 'cat-cloud', name: 'Cloud Computing', slug: 'cloud-computing' },
    created_at: '2026-01-20',
    updated_at: '2026-03-01',
  },
  {
    id: 'course-react-fullstack-ts',
    title: 'Full-Stack Modern Web Engineering with TypeScript',
    description:
      'Build enterprise-grade web applications using React 19, TypeScript, state management, and WebSockets.',
    short_description: 'Clean Architecture, React 19, Vite, and high-performance frontend patterns.',
    slug: 'fullstack-modern-web-engineering',
    duration: '28 hours',
    level: 'Beginner',
    price: 0,
    is_free: true,
    enrollment_count: 18500,
    average_rating: 4.88,
    review_count: 1540,
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    instructor: { id: 'inst-3', username: 'elena_rostova', display_name: 'Elena Rostova' },
    category: { id: 'cat-web', name: 'Web Development', slug: 'web-development' },
    created_at: '2026-02-01',
    updated_at: '2026-03-10',
  },
]

export const libraryService = {
  // Get all courses with optional filters
  async getCourses(filters?: CourseFilters): Promise<CoursesResponse> {
    const params = new URLSearchParams()

    if (filters?.category && filters.category !== 'All') {
      params.append('category', filters.category.toLowerCase().replace(' ', '-'))
    }
    if (filters?.difficulty && filters.difficulty !== 'All') {
      params.append('difficulty', filters.difficulty.toLowerCase())
    }
    if (filters?.is_free !== undefined) {
      params.append('is_free', String(filters.is_free))
    }
    if (filters?.search) {
      params.append('search', filters.search)
    }
    if (filters?.ordering) {
      params.append('ordering', filters.ordering)
    }

    const queryString = params.toString()
    const endpoint = `/courses/${queryString ? `?${queryString}` : ''}`

    try {
      const res = await fetchApi(endpoint)
      const data = res?.data ?? res
      if (Array.isArray(data) && data.length > 0) {
        return { status: 'success', data, count: data.length }
      }
      return { status: 'success', data: FALLBACK_LIBRARY_COURSES, count: FALLBACK_LIBRARY_COURSES.length }
    } catch {
      return { status: 'success', data: FALLBACK_LIBRARY_COURSES, count: FALLBACK_LIBRARY_COURSES.length }
    }
  },

  // Get featured courses
  async getFeaturedCourses(): Promise<CoursesResponse> {
    return fetchApi('/courses/featured/')
  },

  // Get trending courses
  async getTrendingCourses(): Promise<CoursesResponse> {
    return fetchApi('/courses/trending/')
  },

  // Search courses
  async searchCourses(query: string, limit: number = 20): Promise<CoursesResponse> {
    return fetchApi(`/courses/search/?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  // Get course categories
  async getCategories(): Promise<{
    status: string
    data: Array<{ id: string; name: string; slug: string; course_count: number }>
  }> {
    return fetchApi('/courses/categories/')
  },

  // Enroll in a course
  async enrollInCourse(
    courseSlug: string
  ): Promise<{ status: string; message: string; data: unknown }> {
    return fetchApi(`/courses/${courseSlug}/enroll/`, {
      method: 'POST',
    })
  },

  // Bookmark a course
  async bookmarkCourse(courseSlug: string): Promise<{ status: string; bookmarked: boolean }> {
    return fetchApi(`/courses/${courseSlug}/bookmark/`, {
      method: 'POST',
    })
  },
}
