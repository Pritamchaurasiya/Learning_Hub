import { fetchApi } from '../utils/api';

export interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  instructor: { id: string; display_name: string; avatar: string | null };
  price: number;
  original_price: number | null;
  rating: number;
  student_count: number;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  course_count: number;
}

export interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  hours_spent: number;
  current_streak: number;
  xp_points: number;
  level: number;
  next_level_xp: number;
}

export interface UserProgress {
  course_id: string;
  course_title: string;
  thumbnail: string | null;
  progress_percent: number;
  last_accessed: string;
  total_lessons: number;
  completed_lessons: number;
}

export interface HomeData {
  featured_courses: FeaturedCourse[];
  categories: CourseCategory[];
  stats: DashboardStats;
  recent_progress: UserProgress[];
  recommendations: FeaturedCourse[];
}

// Helper to transform raw course from backend
function mapToFeaturedCourse(course: any): FeaturedCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.description || '',
    thumbnail: null,
    instructor: { id: 'system', display_name: 'Instructor', avatar: null },
    price: 0,
    original_price: null,
    rating: course.rating || 0,
    student_count: course.student_count || 0,
    duration: course.duration || '',
    level: course.difficulty || 'beginner'
  };
}

export const homeService = {
  getHomeData: async (): Promise<HomeData> => {
    try {
      // Fetch user data and courses in parallel
      const [meRes, coursesRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi('/courses')
      ]);

      const user = (meRes.data?.user || meRes.user || {});
      const progressList = (meRes.data?.progress || []) as any[];
      // Handle paginated response: { status, data: Course[], meta: {...} }
      const courses = (coursesRes.data || coursesRes || []) as any[];

      // Compute stats
      const enrolled_courses = progressList.length;
      const completed_courses = progressList.filter((p: any) => p.status === 'completed' || p.completed).length;
      const hours_spent = 0; // Not tracked currently
      const current_streak = user.streak || 0;
      const xp_points = user.xp || 0;
      const level = user.level || 1;
      const next_level_xp = level * 100;

      const stats: DashboardStats = {
        enrolled_courses,
        completed_courses,
        hours_spent,
        current_streak,
        xp_points,
        level,
        next_level_xp
      };

      // Featured courses: take first 12 from catalog
      const featured_courses = courses.map(mapToFeaturedCourse).slice(0, 12);

      // Categories: unique from courses.category
      const categoryMap = new Map<string, number>();
      courses.forEach((c: any) => {
        if (c.category) {
          categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
        }
      });
      const categories: CourseCategory[] = Array.from(categoryMap.entries()).map(([name, count], idx) => ({
        id: `cat-${idx}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description: null,
        icon: null,
        course_count: count
      }));

      // Recent progress: map user's progress, add course title by lookup
      const recent_progress: UserProgress[] = progressList
        .slice(0, 5)
        .map((p: any) => {
          const course = courses.find((c: any) => c.id === (p.courseId || p.course_id));
          return {
            course_id: p.courseId || p.course_id,
            course_title: course?.title || 'Unknown Course',
            thumbnail: null,
            progress_percent: p.progress || 0,
            last_accessed: p.updatedAt || p.updated_at || new Date().toISOString(),
            total_lessons: 0,
            completed_lessons: 0
          };
        });

      // Recommendations: just featured courses slice
      const recommendations = featured_courses.slice(0, 3);

      return {
        featured_courses,
        categories,
        stats,
        recent_progress,
        recommendations
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[homeService] Failed to get home data:', error);
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
          next_level_xp: 100
        },
        recent_progress: [],
        recommendations: []
      };
    }
  }
};
