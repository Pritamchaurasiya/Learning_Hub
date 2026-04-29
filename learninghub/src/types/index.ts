export interface Course {
  id: string;
  title: string;
  description: string;
  phase: 'beginner' | 'intermediate' | 'advanced' | 'singularity';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  content: string;
  tags: string[];
  estimatedTime: number; // in minutes
  prerequisites: string[];
  order: number;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  courses: Course[];
  color: string;
}

export interface UserProgress {
  completedCourses: string[];
  currentCourse: string | null;
  xp: number;
  level: number;
  streak: number;
  lastActive: string;
  bookmarks: string[];
  notes: Record<string, string>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface SearchResult {
  course: Course;
  matches: string[];
  score: number;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export type { User } from './user';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  duration: number;
  completed: boolean;
  transcript?: string;
  resources?: Array<{
    id: string;
    title: string;
    type: 'pdf' | 'link' | 'video' | 'code';
    url: string;
  }>;
  order?: number;
  courseId?: string;
}
