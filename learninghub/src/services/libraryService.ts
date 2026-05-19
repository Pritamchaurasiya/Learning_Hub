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

    return fetchApi(endpoint)
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
