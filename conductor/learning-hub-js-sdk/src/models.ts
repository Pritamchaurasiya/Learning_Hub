/**
 * Learning Hub SDK Data Models
 */

import { BaseUser, BaseCategory, BaseCourse, BaseEnrollment, BaseReview, BaseProgress, APIResponse } from './types';

export class User implements BaseUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;

  constructor(data: BaseUser) {
    Object.assign(this, data);
  }

  get fullName(): string {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim() || this.username;
  }
}

export class Category implements BaseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  constructor(data: BaseCategory) {
    Object.assign(this, data);
  }
}

export class Course implements BaseCourse {
  id: number;
  title: string;
  description?: string;
  instructor?: string;
  category?: Category;
  price: number;
  is_active: boolean;
  duration_hours?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;

  constructor(data: BaseCourse) {
    Object.assign(this, data);
    if (data.category) {
      this.category = new Category(data.category);
    }
  }

  get formattedPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(this.price);
  }

  get formattedDuration(): string {
    if (!this.duration_hours) {
      return 'Duration not specified';
    }
    return `${this.duration_hours} hours`;
  }
}

export class Enrollment implements BaseEnrollment {
  id: number;
  user: User;
  course: Course;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
  is_active: boolean;

  constructor(data: BaseEnrollment) {
    Object.assign(this, data);
    this.user = new User(data.user);
    this.course = new Course(data.course);
  }

  get isCompleted(): boolean {
    return !!this.completed_at;
  }

  get formattedProgress(): string {
    return `${Math.round(this.progress_percentage)}%`;
  }
}

export class Review implements BaseReview {
  id: number;
  user: User;
  course: Course;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;

  constructor(data: BaseReview) {
    Object.assign(this, data);
    this.user = new User(data.user);
    this.course = new Course(data.course);
  }

  get formattedRating(): string {
    return `${'*'.repeat(this.rating)}${' '.repeat(5 - this.rating)}`;
  }
}

export class Progress implements BaseProgress {
  id: number;
  user: User;
  course: Course;
  lesson_completed: number;
  total_lessons: number;
  progress_percentage: number;
  last_accessed?: string;
  completed_at?: string;

  constructor(data: BaseProgress) {
    Object.assign(this, data);
    this.user = new User(data.user);
    this.course = new Course(data.course);
  }

  get isCompleted(): boolean {
    return !!this.completed_at;
  }

  get formattedProgress(): string {
    return `${this.lesson_completed}/${this.total_lessons} (${Math.round(this.progress_percentage)}%)`;
  }
}

export class APIResponseWrapper<T> implements APIResponse<T> {
  count?: number;
  next?: string;
  previous?: string;
  results: T[];

  constructor(data: APIResponse<T>) {
    Object.assign(this, data);
  }

  hasNextPage(): boolean {
    return !!this.next;
  }

  hasPreviousPage(): boolean {
    return !!this.previous;
  }
}
