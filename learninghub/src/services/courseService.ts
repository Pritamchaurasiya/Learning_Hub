import { fetchApi } from '../utils/api';

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
  getCourses: async (params?: Record<string, string>): Promise<{ status: string; data: CourseDetails[] }> => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetchApi(`/courses/${query}`);
    // Handle paginated response: { status, data: Course[], meta: {...} }
    return {
      status: res.status || 'success',
      data: res.data || res || []
    };
  },

  getCourse: (id: string) =>
    fetchApi(`/courses/${id}`) as Promise<{ status: string; data: CourseDetails }>,

  getCourseLessons: (id: string) =>
    fetchApi(`/courses/${id}/lessons`) as Promise<{ status: string; data: CourseSection[] }>,

  getCourseReviews: (id: string, params?: { page?: number; limit?: number }) =>
    fetchApi(
      `/courses/${id}/reviews?${new URLSearchParams(params as Record<string, string>).toString()}`
    ) as Promise<{ status: string; data: CourseReview[]; meta: { total: number; page: number; pages: number } }>,

  enroll: (id: string) =>
    fetchApi('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({ courseId: id })
    }) as Promise<{ status: string; data: EnrollmentResponse }>,

  getProgress: (_id: string) =>
    // Not directly available; could compute from /auth/me progress array. Return stub.
    Promise.resolve({ status: 'success', data: { progress_percent: 0, completed_lessons: 0, total_lessons: 0 } }) as any,

  updateProgress: (id: string, _lessonId: string, completed: boolean) => {
    const progress = completed ? 100 : 0;
    return fetchApi('/courses/progress', {
      method: 'POST',
      body: JSON.stringify({ courseId: id, progress })
    }) as Promise<{ status: string; data: { progress_percent: number } }>;
  }
};
