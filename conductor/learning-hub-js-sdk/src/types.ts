/**
 * Learning Hub SDK Types
 */

export interface BaseUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

export interface BaseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BaseCourse {
  id: number;
  title: string;
  description?: string;
  instructor?: string;
  category?: BaseCategory;
  price: number;
  is_active: boolean;
  duration_hours?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
}

export interface BaseEnrollment {
  id: number;
  user: BaseUser;
  course: BaseCourse;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
  is_active: boolean;
}

export interface BaseReview {
  id: number;
  user: BaseUser;
  course: BaseCourse;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface BaseProgress {
  id: number;
  user: BaseUser;
  course: BaseCourse;
  lesson_completed: number;
  total_lessons: number;
  progress_percentage: number;
  last_accessed?: string;
  completed_at?: string;
}

export interface APIResponse<T = any> {
  count?: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CourseFilters {
  category?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CreateCourseData {
  title: string;
  description?: string;
  instructor?: string;
  category?: number;
  price?: number;
  duration_hours?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface CreateReviewData {
  course: number;
  rating: number;
  comment?: string;
}

export interface UpdateProgressData {
  lesson_completed: number;
}

export interface ClientConfig {
  baseURL: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout?: number;
}
