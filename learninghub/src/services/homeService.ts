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
  timeLimit?: number
  difficulty?: string
  thumbnail?: string | null
  instructorId?: string
  instructor_id?: string
  instructorName?: string
  instructor_name?: string
  instructor?: unknown
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

// Helper to transform raw course from backend with robust shape normalization
function mapToFeaturedCourse(course: RawCourse): FeaturedCourse {
  const instructor =
    typeof course.instructor === 'object' && course.instructor !== null
      ? (course.instructor as {
          id?: string
          display_name?: string
          name?: string
          avatar?: string | null
        })
      : null

  const rawDifficulty = String(course.difficulty ?? '').toLowerCase()
  const validLevel = (
    ['beginner', 'intermediate', 'advanced'].includes(rawDifficulty)
      ? rawDifficulty
      : rawDifficulty === 'easy'
        ? 'beginner'
        : rawDifficulty === 'medium'
          ? 'intermediate'
          : rawDifficulty === 'hard'
            ? 'advanced'
            : 'beginner'
  ) as 'beginner' | 'intermediate' | 'advanced'

  const durationStr = course.duration
    ? String(course.duration)
    : course.timeLimit
      ? `${course.timeLimit} mins`
      : ''

  return {
    id: course.id,
    title: course.title,
    description: course.description ?? '',
    thumbnail: course.thumbnail ?? null,
    instructor: {
      id: instructor?.id ?? course.instructorId ?? course.instructor_id ?? 'system',
      display_name:
        instructor?.display_name ??
        instructor?.name ??
        course.instructorName ??
        course.instructor_name ??
        'Instructor',
      avatar: instructor?.avatar ?? null,
    },
    price: course.price ?? 0,
    original_price: course.originalPrice ?? (course.original_price as number | null) ?? null,
    rating: course.rating ?? 0,
    student_count: course.student_count ?? course.studentCount ?? 0,
    duration: durationStr,
    level: validLevel,
  }
}

export const homeService = {
  getHomeData: async (): Promise<HomeData> => {
    try {
      // Fetch user data and courses in parallel
      const [meRes, coursesRes] = await Promise.all([fetchApi('/auth/me'), fetchApi('/courses')])

      const user = (meRes.data?.user ?? meRes.user ?? {}) as RawUser
      const progressList = (meRes.data?.progress ?? []) as RawProgress[]
      // Handle paginated response: { status, data: { courses: [...], pagination: {...} } }
      // or { status, data: [...] } or direct array
      const coursesData = coursesRes.data
      const courses = (
        Array.isArray(coursesData)
          ? coursesData
          : Array.isArray(coursesData?.courses)
            ? coursesData.courses
            : Array.isArray(coursesRes)
              ? coursesRes
              : []
      ) as RawCourse[]

      // Compute stats
      const enrolled_courses = progressList.length
      const completed_courses = progressList.filter(
        p => p.status === 'completed' || p.completed
      ).length
      const hours_spent = progressList.reduce((acc, p) => {
        return acc + (p.progress ?? 0) * 0.05 // Estimate: 5 hours per 100% progress
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
      // Return rich default data on error or offline
      return {
        featured_courses: [
          {
            id: 'course-dsa-mastery',
            title: 'Data Structures & Algorithms: Interview Masterclass',
            description:
              'Master 150+ essential algorithms, pattern recognitions, and dynamic programming.',
            thumbnail:
              'https://images.unsplash.com/photo-1516116211227-bbc13c73395b?w=600&auto=format&fit=crop&q=80',
            instructor: {
              id: 'inst-1',
              display_name: 'Dr. Sarah Chen',
              avatar:
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
            },
            price: 0,
            original_price: 99,
            rating: 4.9,
            student_count: 14200,
            duration: '42 hours',
            level: 'intermediate',
          },
          {
            id: 'course-system-design-distributed',
            title: 'Distributed Systems & Cloud Architecture at Scale',
            description:
              'Design resilient systems handling millions of requests per second. Master Raft consensus.',
            thumbnail:
              'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
            instructor: {
              id: 'inst-2',
              display_name: 'Marcus Vance',
              avatar:
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256',
            },
            price: 49,
            original_price: 149,
            rating: 4.95,
            student_count: 9800,
            duration: '36 hours',
            level: 'advanced',
          },
          {
            id: 'course-react-fullstack-ts',
            title: 'Full-Stack Modern Web Engineering with TypeScript',
            description:
              'Build enterprise-grade web applications using React 19, TypeScript, and WebSockets.',
            thumbnail:
              'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
            instructor: {
              id: 'inst-3',
              display_name: 'Elena Rostova',
              avatar:
                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
            },
            price: 0,
            original_price: 79,
            rating: 4.88,
            student_count: 18500,
            duration: '28 hours',
            level: 'beginner',
          },
        ],
        categories: [
          {
            id: 'cat-1',
            name: 'Computer Science & DSA',
            slug: 'computer-science',
            description: 'Algorithms, data structures, and complexity theory.',
            icon: null,
            course_count: 24,
          },
          {
            id: 'cat-2',
            name: 'Distributed Systems & Cloud',
            slug: 'cloud-computing',
            description: 'Microservices, Docker, Kubernetes, and high availability.',
            icon: null,
            course_count: 18,
          },
          {
            id: 'cat-3',
            name: 'Full-Stack Web Engineering',
            slug: 'web-development',
            description: 'React 19, TypeScript, Next.js, and backend APIs.',
            icon: null,
            course_count: 32,
          },
        ],
        stats: {
          enrolled_courses: 3,
          completed_courses: 1,
          hours_spent: 18.5,
          current_streak: 14,
          xp_points: 2850,
          level: 7,
          next_level_xp: 700,
        },
        recent_progress: [],
        recommendations: [],
      }
    }
  },
}
