import { fetchApi } from '../utils/api'

export interface SearchResult {
  type: 'course' | 'lesson' | 'user' | 'problem' | 'contest'
  id: string
  title: string
  description: string
  thumbnail?: string
  url: string
  metadata: Record<string, unknown>
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  instructor?: string
  category?: string
  level?: string
  price?: number
  rating?: number
  enrolledCount?: number
  createdAt?: string
}

export interface SearchFilters {
  type?: 'course' | 'lesson' | 'user' | 'problem' | 'contest'
  category?: string
  difficulty?: string
  rating?: number
  price_min?: number
  price_max?: number
}

export const searchService = {
  search: (query: string, filters?: SearchFilters, page = 1, limit = 20) => {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.difficulty && { difficulty: filters.difficulty }),
      ...(filters?.rating && { rating: String(filters.rating) }),
      ...(filters?.price_min && { price_min: String(filters.price_min) }),
      ...(filters?.price_max && { price_max: String(filters.price_max) }),
    })
    return fetchApi(`/search?${params.toString()}`) as Promise<{
      status: string
      data: SearchResult[]
      meta: { total: number; page: number; pages: number; query: string }
    }>
  },

  searchCourses: (
    query: string,
    params?: { category?: string; level?: string; page?: number; limit?: number }
  ) => {
    const searchParams = new URLSearchParams({
      search: query,
      ...(params?.category && { category: params.category }),
      ...(params?.level && { level: params.level }),
      ...(params?.page && { page: String(params.page) }),
      ...(params?.limit && { limit: String(params.limit) }),
    })
    return fetchApi(`/courses?${searchParams.toString()}`) as Promise<{
      status: string
      data: Course[]
      meta: { total: number; page: number; pages: number }
    }>
  },

  getSuggestions: (query: string) =>
    fetchApi(`/search/suggestions?q=${encodeURIComponent(query)}`) as Promise<{
      status: string
      data: string[]
    }>,

  getTrending: () =>
    fetchApi('/search/trending') as Promise<{
      status: string
      data: SearchResult[]
    }>,
}
