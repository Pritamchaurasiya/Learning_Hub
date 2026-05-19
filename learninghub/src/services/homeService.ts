import { fetchApi } from '../utils/api'

// Raw types from backend API
interface RawCourse {
  id: string
  title: string
  description?: string
  category?: string
  rating?: number
  student_count?: number
  studentCount?: number
  duration?: string | number
  difficulty?: string
  thumbnail?: string | null
  instructorId?: string
  instructor_id?: string
  instructorName?: string
  instructor_name?: string
  price?: number | null
  originalPrice?: number | null
  original_price?: number | null
  [key: string]: unknown
}

interface RawProgress {
  courseId?: string
  course_id?: string
  status?: string
  completed?: boolean
  progress?: number
  updatedAt?: string
  updated_at?: string
}

interface RawUser {
  streak?: number
  xp?: number
  level?: number
}

export interface FeaturedCourse {
  id: string
  title: string
  description: string
  thumbnail: string | null
  instructor: { id: string; display_name: string; avatar: string | null }
  price: number
  original_price: number | null
  rating: number
  student_count: number
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface CourseCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  course_count: number
}

export interface DashboardStats {
  enrolled_courses: number
  completed_courses: number
  hours_spent: number
  current_streak: number
  xp_points: number
  level: number
  next_level_xp: number
}

export interface UserProgress {
  course_id: string
  course_title: string
  thumbnail: string | null
  progress_percent: number
  last_accessed: string
  total_lessons: number
  completed_lessons: number
}

export interface HomeData {
  featured_courses: FeaturedCourse[]
  categories: CourseCategory[]
  stats: DashboardStats
  recent_progress: UserProgress[]
  recommendations: FeaturedCourse[]
}

// Helper to transform raw course from backend
function mapToFeaturedCourse(course: RawCourse): FeaturedCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? '',
    thumbnail: course.thumbnail || null,
    instructor: {
      id: course.instructorId || 'system',
      display_name: course.instructorName || 'Instructor',
      avatar: null,
    },
    price: course.price ?? 0,
    original_price: course.originalPrice ?? null,
    rating: course.rating ?? 0,
    student_count: course.student_count ?? 0,
    duration: String(course.duration ?? ''),
    level: (['beginner', 'intermediate', 'advanced'].includes(String(course.difficulty ?? ''))
      ? course.difficulty
      : 'beginner') as 'beginner' | 'intermediate' | 'advanced',
  }
}

export const homeService = {
  getHomeData: async (): Promise<HomeData> => {
    try {
      // Fetch user data and courses in parallel
      const [meRes, coursesRes] = await Promise.all([fetchApi('/auth/me'), fetchApi('/courses')])

      const user = (meRes.data?.user ?? meRes.user ?? {}) as RawUser
      const progressList = (meRes.data?.progress ?? []) as RawProgress[]
      // Handle paginated response: { status, data: Course[], meta: {...} }
      const courses = (coursesRes.data ?? coursesRes ?? []) as RawCourse[]

      // Compute stats
      const enrolled_courses = progressList.length
      const completed_courses = progressList.filter(
        p => p.status === 'completed' || p.completed
      ).length
      const hours_spent = progressList.reduce((acc, p) => {
        return acc + (p.progress || 0) * 0.05 // Estimate: 5 hours per 100% progress
      }, 0)
      const current_streak = user.streak ?? 0
      const xp_points = user.xp ?? 0
      const level = user.level ?? 1
      const next_level_xp = level * 100

      const stats: DashboardStats = {
        enrolled_courses,
        completed_courses,
        hours_spent,
        current_streak,
        xp_points,
        level,
        next_level_xp,
      }

      // Featured courses: take first 12 from catalog
      const featured_courses = courses.map(mapToFeaturedCourse).slice(0, 12)

      // Categories: unique from courses.category
      const categoryMap = new Map<string, number>()
      courses.forEach(c => {
        if (c.category) {
          categoryMap.set(c.category, (categoryMap.get(c.category) ?? 0) + 1)
        }
      })
      const categories: CourseCategory[] = Array.from(categoryMap.entries()).map(
        ([name, count], idx) => ({
          id: `cat-${idx}`,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description: null,
          icon: null,
          course_count: count,
        })
      )

      // Recent progress: map user's progress, add course title by lookup
      const recent_progress: UserProgress[] = progressList.slice(0, 5).map(p => {
        const course = courses.find(c => c.id === (p.courseId ?? p.course_id))
        return {
          course_id: p.courseId ?? p.course_id ?? 'unknown',
          course_title: course?.title ?? 'Unknown Course',
          thumbnail: null,
          progress_percent: p.progress ?? 0,
          last_accessed: p.updatedAt ?? p.updated_at ?? new Date().toISOString(),
          total_lessons: 0,
          completed_lessons: 0,
        }
      })

      // Recommendations: just featured courses slice
      const recommendations = featured_courses.slice(0, 3)

      return {
        featured_courses,
        categories,
        stats,
        recent_progress,
        recommendations,
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[homeService] Failed to get home data:', error)
      }
      // Return default data on error
      return {
        featured_courses: [],
        categories: [],
        stats: {
          enrolled_courses: 0,
          completed_courses: 0,
          hours_spent: 0,
          current_streak: 0,
          xp_points: 0,
          level: 1,
          next_level_xp: 100,
        },
        recent_progress: [],
        recommendations: [],
      }
    }
  },
}
