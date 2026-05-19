import { fetchApi } from '../utils/api'

export interface User {
  id: string
  email: string
  username: string
  role: string
  xp: number
  level: number
  streak: number
  created_at: string
  is_active: boolean
}

export interface Analytics {
  // camelCase (from adminService.getAnalytics)
  totalUsers?: number
  activeUsers?: number
  totalCourses?: number
  revenue?: number | null
  recentRegistrations?: number
  completions?: number
  enrollments?: number
  // snake_case (from backend /admin/dashboard and /admin/analytics)
  total_users?: number
  active_users_24h?: number
  new_users_today?: number
  total_courses?: number
  total_enrollments?: number
  recent_completions?: number
  test_submissions_24h?: number
  revenue_today?: number | null
  [key: string]: unknown
}

export interface Course {
  id: string
  title: string
  description: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published' | 'archived'
  instructor: string
  enrolledCount: number
  thumbnail?: string
  duration?: number
  price?: number
  created_at?: string
  updated_at?: string
}

export interface UserProgress {
  id: string
  courseId: string
  lessonId: string
  completed: boolean
  progress: number
  lastAccessed: string
}

export interface TestResult {
  id: string
  testId: string
  score: number
  maxScore: number
  completedAt: string
  passed: boolean
}

export const adminService = {
  // Authentication
  login: (email: string, password: string) =>
    fetchApi('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as Promise<{
      status: string
      data: { token: string; user: { id: string; email: string; username: string; role: string } }
    }>,

  register: (email: string, password: string, username: string, adminSecret: string) =>
    fetchApi('/admin/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, adminSecret }),
    }) as Promise<{
      status: string
      message: string
      data: { token: string; user: { id: string; email: string; username: string; role: string } }
    }>,

  // Users
  getUsers: (page = 1, limit = 20) =>
    fetchApi(`/admin/users?page=${page}&limit=${limit}`) as Promise<{
      status: string
      data: {
        users: User[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }
    }>,

  getUserDetails: (userId: string) =>
    fetchApi(`/admin/users/${userId}`) as Promise<{
      status: string
      data: {
        user: User
        progress: UserProgress[]
        testResults: TestResult[]
      }
    }>,

  updateUser: (userId: string, updates: Partial<User>) =>
    fetchApi(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<{ status: string; message: string }>,

  deleteUser: (userId: string) =>
    fetchApi(`/admin/users/${userId}`, { method: 'DELETE' }) as Promise<{
      status: string
      message: string
    }>,

  // Analytics
  getAnalytics: () =>
    fetchApi('/admin/analytics') as Promise<{
      status: string
      data: Analytics
    }>,

  getUserAnalytics: () =>
    fetchApi('/admin/analytics/users') as Promise<{
      status: string
      data: {
        byRole: { role: string; count: number }[]
        growth: { date: string; count: number }[]
      }
    }>,

  getCourseAnalytics: () =>
    fetchApi('/admin/analytics/courses') as Promise<{
      status: string
      data: {
        popular: { id: string; title: string; enrollments: number }[]
        byCategory: { category: string; count: number }[]
      }
    }>,

  // Course Management
  getCourses: (params?: { status?: string; category?: string }) =>
    fetchApi(
      `/admin/courses${params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''}`
    ) as Promise<{
      status: string
      data: Course[]
      pagination?: { page: number; limit: number; total: number; totalPages: number }
    }>,

  createCourse: (data: Partial<Course>) =>
    fetchApi('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<{ status: string; data: Course }>,

  updateCourse: (id: string, data: Partial<Course>) =>
    fetchApi(`/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }) as Promise<{ status: string; data: Course }>,

  deleteCourse: (id: string) =>
    fetchApi(`/admin/courses/${id}`, {
      method: 'DELETE',
    }) as Promise<{ status: string }>,
}
