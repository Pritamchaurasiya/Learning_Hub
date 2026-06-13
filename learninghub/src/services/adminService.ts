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
  level?: string
  difficulty?: string
  phase?: string
  status?: string
  published?: boolean
  instructor?: string
  instructor_name?: string
  enrolledCount?: number
  enrollment_count?: number
  thumbnail?: string
  duration?: number | string
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

interface RawAdminUser {
  id: string
  email?: string
  username?: string
  role?: string
  xp?: number
  level?: number
  streak?: number
  created_at?: string
  createdAt?: string
  is_active?: boolean
  deletedAt?: string | null
}

interface RawAdminCourse {
  id: string
  title?: string
  description?: string
  category?: string
  level?: string
  difficulty?: string
  status?: string
  deletedAt?: string | null
  isPublished?: boolean
  is_published?: boolean
  instructor?: { username?: string; email?: string } | string
  enrolledCount?: number
  studentCount?: number
  student_count?: number
  thumbnail?: string
  duration?: number
  price?: number
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

const normalizeAdminUser = (raw: RawAdminUser): User => ({
  id: raw.id,
  email: raw.email ?? '',
  username: raw.username ?? raw.email ?? 'Learner',
  role: raw.role ?? 'STUDENT',
  xp: raw.xp ?? 0,
  level: raw.level ?? 1,
  streak: raw.streak ?? 0,
  created_at: raw.created_at ?? raw.createdAt ?? new Date(0).toISOString(),
  is_active: raw.is_active ?? !raw.deletedAt,
})

const normalizeAdminCourse = (raw: RawAdminCourse): Course => ({
  id: raw.id,
  title: raw.title ?? '',
  description: raw.description ?? '',
  category: raw.category ?? 'General',
  level: String(raw.level ?? raw.difficulty ?? 'beginner').toLowerCase(),
  status:
    raw.status ??
    (raw.deletedAt ? 'archived' : raw.isPublished || raw.is_published ? 'published' : 'draft'),
  instructor:
    typeof raw.instructor === 'string'
      ? raw.instructor
      : (raw.instructor?.username ?? raw.instructor?.email ?? ''),
  enrolledCount: raw.enrolledCount ?? raw.studentCount ?? raw.student_count ?? 0,
  thumbnail: raw.thumbnail,
  duration: raw.duration,
  price: raw.price,
  created_at: raw.created_at ?? raw.createdAt,
  updated_at: raw.updated_at ?? raw.updatedAt,
})

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
    fetchApi(`/admin/users?page=${page}&limit=${limit}`).then(res => ({
      ...res,
      data: {
        ...res.data,
        users: Array.isArray(res.data?.users) ? res.data.users.map(normalizeAdminUser) : [],
      },
    })) as Promise<{
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
    ).then(res => ({
      ...res,
      data: Array.isArray(res.data) ? res.data.map(normalizeAdminCourse) : [],
    })) as Promise<{
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
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<{ status: string; data: Course }>,

  deleteCourse: (id: string) =>
    fetchApi(`/admin/courses/${id}`, {
      method: 'DELETE',
    }) as Promise<{ status: string }>,

  // AI Workshop
  generateCourse: (prompt: string, difficulty: string = 'BEGINNER', modulesCount: number = 3) =>
    fetchApi('/admin/ai/generate-course', {
      method: 'POST',
      body: JSON.stringify({ prompt, difficulty, modulesCount }),
    }) as Promise<{ status: string; data: { courseId: string; message: string } }>,
}
