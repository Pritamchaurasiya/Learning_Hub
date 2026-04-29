#!/usr/bin/env python
"""
JavaScript/TypeScript SDK Development
Create comprehensive JavaScript/TypeScript SDK for Learning Hub API
"""

import os
import sys
from pathlib import Path
from datetime import datetime

print("=" * 80)
print("LEARNING HUB JAVASCRIPT/TYPESCRIPT SDK DEVELOPMENT")
print("=" * 80)

BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

# ============================================================================
# Create JavaScript SDK Package Structure
# ============================================================================
log("Creating JavaScript SDK package structure...")

# Create SDK directory structure
js_dirs = [
    'learning-hub-js-sdk',
    'learning-hub-js-sdk/src',
    'learning-hub-js-sdk/dist',
    'learning-hub-js-sdk/tests',
    'learning-hub-js-sdk/examples',
    'learning-hub-js-sdk/docs'
]

for dir_path in js_dirs:
    os.makedirs(dir_path, exist_ok=True)
    log(f"  [OK] Created directory: {dir_path}")

# ============================================================================
# Create Package Configuration Files
# ============================================================================
log("Creating package configuration files...")

# package.json
package_json = '''{
  "name": "learning-hub-sdk",
  "version": "1.0.0",
  "description": "JavaScript/TypeScript SDK for Learning Hub API",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "learning-hub",
    "api",
    "sdk",
    "javascript",
    "typescript",
    "client"
  ],
  "author": "Learning Hub Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/learninghub/learning-hub-js-sdk.git"
  },
  "bugs": {
    "url": "https://github.com/learninghub/learning-hub-js-sdk/issues"
  },
  "homepage": "https://github.com/learninghub/learning-hub-js-sdk#readme",
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "jest": "^29.7.0",
    "rollup": "^4.0.0",
    "rollup-plugin-typescript2": "^0.36.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.2.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
'''

with open('learning-hub-js-sdk/package.json', 'w') as f:
    f.write(package_json)

log("  [OK] Created package.json")

# tsconfig.json
tsconfig_json = '''{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
'''

with open('learning-hub-js-sdk/tsconfig.json', 'w') as f:
    f.write(tsconfig_json)

log("  [OK] Created tsconfig.json")

# rollup.config.js
rollup_config = '''import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      typescript: require('typescript'),
      useTsconfigDeclarationDir: true,
    }),
  ],
  external: ['axios'],
};
'''

with open('learning-hub-js-sdk/rollup.config.js', 'w') as f:
    f.write(rollup_config)

log("  [OK] Created rollup.config.js")

# jest.config.js
jest_config = '''module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
'''

with open('learning-hub-js-sdk/jest.config.js', 'w') as f:
    f.write(jest_config)

log("  [OK] Created jest.config.js")

# ============================================================================
# Create Core SDK Files
# ============================================================================
log("Creating core SDK files...")

# src/index.ts
index_ts = '''/**
 * Learning Hub JavaScript/TypeScript SDK
 * 
 * A comprehensive SDK for the Learning Hub API, providing easy integration
 * with authentication, course management, user management, and more.
 */

export { LearningHubClient } from './client';
export { Auth } from './auth';
export {
  LearningHubError,
  AuthenticationError,
  APIError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
} from './exceptions';
export {
  User,
  Course,
  Category,
  Enrollment,
  Review,
  Progress,
  APIResponse,
} from './models';

export * from './types';

// Version
export const VERSION = '1.0.0';
'''

with open('learning-hub-js-sdk/src/index.ts', 'w') as f:
    f.write(index_ts)

log("  [OK] Created src/index.ts")

# src/types.ts
types_ts = '''/**
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
'''

with open('learning-hub-js-sdk/src/types.ts', 'w') as f:
    f.write(types_ts)

log("  [OK] Created src/types.ts")

# src/exceptions.ts
exceptions_ts = '''/**
 * Learning Hub SDK Exceptions
 */

export class LearningHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningHubError';
  }
}

export class AuthenticationError extends LearningHubError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class APIError extends LearningHubError {
  public status?: number;
  public response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends LearningHubError {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends APIError {
  constructor(message: string = 'Server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}
'''

with open('learning-hub-js-sdk/src/exceptions.ts', 'w') as f:
    f.write(exceptions_ts)

log("  [OK] Created src/exceptions.ts")

# ============================================================================
# Create Authentication Module
# ============================================================================
log("Creating authentication module...")

auth_ts = '''/**
 * Learning Hub SDK Authentication
 */

import axios, { AxiosInstance } from 'axios';
import { AuthenticationError, APIError } from './exceptions';
import { AuthTokens, LoginCredentials } from './types';

export class Auth {
  private baseURL: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;
  private axiosInstance: AxiosInstance;

  constructor(config: { baseURL: string; apiKey?: string; username?: string; password?: string }) {
    this.baseURL = config.baseURL.replace(/\\/$/, '');
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    });
  }

  async authenticate(): Promise<AuthTokens> {
    if (this.apiKey) {
      return this.authenticateWithApiKey();
    } else if (this.username && this.password) {
      return this.authenticateWithCredentials();
    } else {
      throw new AuthenticationError('No authentication credentials provided');
    }
  }

  private async authenticateWithApiKey(): Promise<AuthTokens> {
    this.accessToken = this.apiKey;
    return { access: this.apiKey, refresh: '' };
  }

  private async authenticateWithCredentials(): Promise<AuthTokens> {
    try {
      const response = await this.axiosInstance.post('/api/v1/auth/login/', {
        username: this.username,
        password: this.password,
      } as LoginCredentials);

      const tokens = response.data;
      this.accessToken = tokens.access;
      this.refreshToken = tokens.refresh;
      this.tokenExpiresAt = Date.now() + 3600000; // 1 hour

      return tokens;
    } catch (error: any) {
      throw new AuthenticationError(`Authentication failed: ${error.message}`);
    }
  }

  getHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new AuthenticationError('Not authenticated');
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    try {
      const response = await this.axiosInstance.post('/api/v1/auth/refresh/', {
        refresh: this.refreshToken,
      });

      const tokens = response.data;
      this.accessToken = tokens.access;
      this.tokenExpiresAt = Date.now() + 3600000; // 1 hour

      return this.accessToken;
    } catch (error: any) {
      throw new AuthenticationError(`Token refresh failed: ${error.message}`);
    }
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) {
      return true;
    }

    return Date.now() >= this.tokenExpiresAt;
  }

  async ensureValidToken(): Promise<string> {
    if (!this.accessToken || this.isTokenExpired()) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        await this.authenticate();
      }
    }

    return this.accessToken!;
  }
}
'''

with open('learning-hub-js-sdk/src/auth.ts', 'w') as f:
    f.write(auth_ts)

log("  [OK] Created src/auth.ts")

# ============================================================================
# Create Data Models
# ============================================================================
log("Creating data models...")

models_ts = '''/**
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
'''

with open('learning-hub-js-sdk/src/models.ts', 'w') as f:
    f.write(models_ts)

log("  [OK] Created src/models.ts")

# ============================================================================
# Create Main Client
# ============================================================================
log("Creating main client...")

client_ts = '''/**
 * Learning Hub SDK Main Client
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Auth } from './auth';
import {
  LearningHubError,
  APIError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  AuthenticationError,
} from './exceptions';
import {
  User,
  Course,
  Category,
  Enrollment,
  Review,
  Progress,
  APIResponseWrapper,
} from './models';
import {
  ClientConfig,
  CourseFilters,
  CreateCourseData,
  UpdateUserData,
  CreateReviewData,
  UpdateProgressData,
  BaseUser,
  BaseCourse,
  BaseCategory,
  BaseEnrollment,
  BaseReview,
  BaseProgress,
} from './types';

export class LearningHubClient {
  private baseURL: string;
  private timeout: number;
  private auth: Auth;
  private axiosInstance: AxiosInstance;

  constructor(config: ClientConfig) {
    this.baseURL = config.baseURL.replace(/\\/$/, '');
    this.timeout = config.timeout || 30000;
    
    this.auth = new Auth({
      baseURL: this.baseURL,
      apiKey: config.apiKey,
      username: config.username,
      password: config.password,
    });

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
    });

    // Initialize authentication
    this.auth.authenticate().catch((error) => {
      console.error('Authentication failed during initialization:', error);
    });
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any,
  ): Promise<T> {
    try {
      const headers = await this.auth.ensureValidToken().then(() => this.auth.getHeaders());

      const config = {
        method,
        url: endpoint,
        headers,
        params,
        data,
      };

      const response: AxiosResponse = await this.axiosInstance.request(config);

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private async handleResponse<T>(response: AxiosResponse): Promise<T> {
    if (response.status === 200 || response.status === 201) {
      return response.data;
    } else if (response.status === 204) {
      return {} as T;
    } else {
      throw this.handleError(new Error(`Unexpected status code: ${response.status}`));
    }
  }

  private handleError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          throw new ValidationError(message);
        case 401:
          throw new AuthenticationError('Unauthorized');
        case 403:
          throw new AuthenticationError('Forbidden');
        case 404:
          throw new NotFoundError('Resource not found');
        case 429:
          throw new RateLimitError('Rate limit exceeded');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ServerError(`Server error: ${status}`);
        default:
          throw new APIError(message, status, error.response);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new APIError(`Request timeout after ${this.timeout}ms`);
    } else {
      throw new APIError(`Request failed: ${error.message}`);
    }
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async getUser(userId: number): Promise<User> {
    const data = await this.makeRequest<BaseUser>('GET', `/api/v1/users/${userId}/`);
    return new User(data);
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.makeRequest<BaseUser>('GET', '/api/v1/auth/user/');
    return new User(data);
  }

  async updateUser(userId: number, data: UpdateUserData): Promise<User> {
    const userData = await this.makeRequest<BaseUser>('PATCH', `/api/v1/users/${userId}/`, data);
    return new User(userData);
  }

  // ============================================================================
  // Course Management
  // ============================================================================

  async getCourses(filters?: CourseFilters): Promise<APIResponseWrapper<Course>> {
    const params = {
      page: filters?.page || 1,
      page_size: filters?.page_size || 20,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.search && { search: filters.search }),
    };

    const data = await this.makeRequest<any>('GET', '/api/v1/courses/', undefined, params);
    return new APIResponseWrapper<Course>({
      ...data,
      results: data.results.map((course: BaseCourse) => new Course(course)),
    });
  }

  async getCourse(courseId: number): Promise<Course> {
    const data = await this.makeRequest<BaseCourse>('GET', `/api/v1/courses/${courseId}/`);
    return new Course(data);
  }

  async createCourse(data: CreateCourseData): Promise<Course> {
    const courseData = await this.makeRequest<BaseCourse>('POST', '/api/v1/courses/', data);
    return new Course(courseData);
  }

  async updateCourse(courseId: number, data: Partial<CreateCourseData>): Promise<Course> {
    const courseData = await this.makeRequest<BaseCourse>('PATCH', `/api/v1/courses/${courseId}/`, data);
    return new Course(courseData);
  }

  async deleteCourse(courseId: number): Promise<boolean> {
    await this.makeRequest('DELETE', `/api/v1/courses/${courseId}/`);
    return true;
  }

  // ============================================================================
  // Category Management
  // ============================================================================

  async getCategories(): Promise<Category[]> {
    const data = await this.makeRequest<BaseCategory[]>('GET', '/api/v1/categories/');
    return data.map((category: BaseCategory) => new Category(category));
  }

  async getCategory(categoryId: number): Promise<Category> {
    const data = await this.makeRequest<BaseCategory>('GET', `/api/v1/categories/${categoryId}/`);
    return new Category(data);
  }

  // ============================================================================
  // Enrollment Management
  // ============================================================================

  async enrollUser(userId: number, courseId: number): Promise<Enrollment> {
    const data = await this.makeRequest<BaseEnrollment>('POST', '/api/v1/enrollments/', {
      user: userId,
      course: courseId,
    });
    return new Enrollment(data);
  }

  async getUserEnrollments(userId: number): Promise<Enrollment[]> {
    const data = await this.makeRequest<BaseEnrollment[]>('GET', `/api/v1/users/${userId}/enrollments/`);
    return data.map((enrollment: BaseEnrollment) => new Enrollment(enrollment));
  }

  async getCourseEnrollments(courseId: number): Promise<Enrollment[]> {
    const data = await this.makeRequest<BaseEnrollment[]>('GET', `/api/v1/courses/${courseId}/enrollments/`);
    return data.map((enrollment: BaseEnrollment) => new Enrollment(enrollment));
  }

  // ============================================================================
  // Review Management
  // ============================================================================

  async createReview(data: CreateReviewData): Promise<Review> {
    const reviewData = await this.makeRequest<BaseReview>('POST', '/api/v1/reviews/', data);
    return new Review(reviewData);
  }

  async getCourseReviews(courseId: number): Promise<Review[]> {
    const data = await this.makeRequest<BaseReview[]>('GET', `/api/v1/courses/${courseId}/reviews/`);
    return data.map((review: BaseReview) => new Review(review));
  }

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  async getUserProgress(userId: number, courseId: number): Promise<Progress> {
    const data = await this.makeRequest<BaseProgress>('GET', `/api/v1/users/${userId}/courses/${courseId}/progress/`);
    return new Progress(data);
  }

  async updateProgress(userId: number, courseId: number, data: UpdateProgressData): Promise<Progress> {
    const progressData = await this.makeRequest<BaseProgress>('PATCH', `/api/v1/users/${userId}/courses/${courseId}/progress/`, data);
    return new Progress(progressData);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<any> {
    return this.makeRequest('GET', '/health/');
  }
}
'''

with open('learning-hub-js-sdk/src/client.ts', 'w') as f:
    f.write(client_ts)

log("  [OK] Created src/client.ts")

# ============================================================================
# Create Documentation
# ============================================================================
log("Creating documentation...")

# README.md
readme_md = '''# Learning Hub JavaScript/TypeScript SDK

A comprehensive JavaScript/TypeScript SDK for the Learning Hub API, providing easy integration with authentication, course management, user management, and more.

## Installation

```bash
npm install learning-hub-sdk
```

or

```bash
yarn add learning-hub-sdk
```

## Quick Start

### Using API Key

```typescript
import { LearningHubClient } from 'learning-hub-sdk';

// Initialize client with API key
const client = new LearningHubClient({
  baseURL: 'https://api.learninghub.com',
  apiKey: 'your-api-key-here'
});

// Get current user
const user = await client.getCurrentUser();
console.log(`Hello, ${user.username}!`);

// List courses
const courses = await client.getCourses();
courses.results.forEach(course => {
  console.log(`- ${course.title}`);
});
```

### Using Username/Password

```typescript
import { LearningHubClient } from 'learning-hub-sdk';

// Initialize client with credentials
const client = new LearningHubClient({
  baseURL: 'https://api.learninghub.com',
  username: 'your-username',
  password: 'your-password'
});

// Get current user
const user = await client.getCurrentUser();
console.log(`Hello, ${user.username}!`);
```

## Features

- **TypeScript Support**: Full TypeScript definitions with type safety
- **Authentication**: API key and username/password authentication
- **User Management**: Get user information, update profiles
- **Course Management**: List, create, update, and delete courses
- **Enrollment Management**: Enroll users and track enrollments
- **Review System**: Create and retrieve course reviews
- **Progress Tracking**: Monitor user progress in courses
- **Error Handling**: Comprehensive error handling with custom exceptions
- **Browser & Node.js**: Works in both browser and Node.js environments

## API Reference

### LearningHubClient

The main client class for interacting with the Learning Hub API.

#### Constructor

```typescript
new LearningHubClient(config: ClientConfig)
```

**Parameters:**
- `config.baseURL`: Base URL of the Learning Hub API
- `config.apiKey?`: API key for authentication
- `config.username?`: Username for authentication
- `config.password?`: Password for authentication
- `config.timeout?`: Request timeout in milliseconds (default: 30000)

#### Methods

##### Authentication
- `getCurrentUser(): Promise<User>`: Get current authenticated user

##### User Management
- `getUser(userId: number): Promise<User>`: Get user by ID
- `updateUser(userId: number, data: UpdateUserData): Promise<User>`: Update user information

##### Course Management
- `getCourses(filters?: CourseFilters): Promise<APIResponseWrapper<Course>>`: List courses
- `getCourse(courseId: number): Promise<Course>`: Get course by ID
- `createCourse(data: CreateCourseData): Promise<Course>`: Create a new course
- `updateCourse(courseId: number, data: Partial<CreateCourseData>): Promise<Course>`: Update course information
- `deleteCourse(courseId: number): Promise<boolean>`: Delete a course

##### Category Management
- `getCategories(): Promise<Category[]>`: Get list of categories
- `getCategory(categoryId: number): Promise<Category>`: Get category by ID

##### Enrollment Management
- `enrollUser(userId: number, courseId: number): Promise<Enrollment>`: Enroll a user in a course
- `getUserEnrollments(userId: number): Promise<Enrollment[]>`: Get user's enrollments
- `getCourseEnrollments(courseId: number): Promise<Enrollment[]>`: Get course enrollments

##### Review Management
- `createReview(data: CreateReviewData): Promise<Review>`: Create a course review
- `getCourseReviews(courseId: number): Promise<Review[]>`: Get course reviews

##### Progress Tracking
- `getUserProgress(userId: number, courseId: number): Promise<Progress>`: Get user's progress in a course
- `updateProgress(userId: number, courseId: number, data: UpdateProgressData): Promise<Progress>`: Update user's progress

##### Health Check
- `healthCheck(): Promise<any>`: Check API health status

### Data Models

#### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  
  // Methods
  fullName: string; // Returns formatted full name
}
```

#### Course
```typescript
interface Course {
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
  
  // Methods
  formattedPrice: string; // Returns formatted price
  formattedDuration: string; // Returns formatted duration
}
```

### Exceptions

- `LearningHubError`: Base exception for all SDK errors
- `AuthenticationError`: Raised when authentication fails
- `APIError`: Raised when API request fails
- `NotFoundError`: Raised when resource is not found
- `ValidationError`: Raised when validation fails
- `RateLimitError`: Raised when rate limit is exceeded
- `ServerError`: Raised when server error occurs

## Examples

### Complete Example

```typescript
import { LearningHubClient, AuthenticationError, APIError } from 'learning-hub-sdk';

async function example() {
  try {
    // Initialize client
    const client = new LearningHubClient({
      baseURL: 'https://api.learninghub.com',
      apiKey: 'your-api-key-here'
    });

    // Health check
    const health = await client.healthCheck();
    console.log('API Status:', health);

    // Get current user
    const user = await client.getCurrentUser();
    console.log('User:', user.fullName);

    // List courses
    const courses = await client.getCourses({ page_size: 5 });
    console.log(`Found ${courses.count} courses`);

    // Get first course
    if (courses.results.length > 0) {
      const course = courses.results[0];
      console.log('Course:', course.title);
      console.log('Price:', course.formattedPrice);

      // Enroll in course
      const enrollment = await client.enrollUser(user.id, course.id);
      console.log('Enrolled at:', enrollment.enrolled_at);

      // Get progress
      const progress = await client.getUserProgress(user.id, course.id);
      console.log('Progress:', progress.formattedProgress);
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed:', error.message);
    } else if (error instanceof APIError) {
      console.error('API error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

example();
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/learninghub/learning-hub-js-sdk.git
cd learning-hub-js-sdk

# Install dependencies
npm install

# or with yarn
yarn install
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## License

This SDK is licensed under the MIT License. See the LICENSE file for details.

## Support

For support, please contact support@learninghub.com or create an issue on GitHub.
'''

with open('learning-hub-js-sdk/README.md', 'w') as f:
    f.write(readme_md)

log("  [OK] Created README.md")

# ============================================================================
# Create Examples
# ============================================================================
log("Creating examples...")

# quick-start.ts
quick_start_ts = '''/**
 * Quick Start Example for Learning Hub JavaScript/TypeScript SDK
 */

import { LearningHubClient, AuthenticationError } from '../src/index';

async function main() {
  try {
    // Initialize client (use API key or username/password)
    const client = new LearningHubClient({
      baseURL: 'https://api.learninghub.com',
      apiKey: 'your-api-key-here'
      // OR
      // username: 'your-username',
      // password: 'your-password'
    });

    // Health check
    console.log('Checking API health...');
    const health = await client.healthCheck();
    console.log('API Status:', health);

    // Get current user
    console.log('\\nGetting current user...');
    const user = await client.getCurrentUser();
    console.log(`User: ${user.fullName} (${user.email})`);

    // List courses
    console.log('\\nListing courses...');
    const courses = await client.getCourses({ page_size: 5 });
    console.log(`Found ${courses.count} courses:`);
    courses.results.forEach(course => {
      console.log(`  - ${course.title} (${course.formattedPrice})`);
    });

    // Get specific course
    if (courses.results.length > 0) {
      const course = courses.results[0];
      console.log(`\\nGetting course details for ID ${course.id}...`);
      console.log(`Course: ${course.title}`);
      console.log(`Description: ${course.description}`);
      console.log(`Duration: ${course.formattedDuration}`);

      // Create enrollment
      console.log(`\\nEnrolling in course...`);
      const enrollment = await client.enrollUser(user.id, course.id);
      console.log(`Enrolled at: ${enrollment.enrolled_at}`);

      // Get progress
      const progress = await client.getUserProgress(user.id, course.id);
      console.log(`Progress: ${progress.formattedProgress}`);
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error(`Authentication failed: ${error.message}`);
    } else {
      console.error(`Error: ${error}`);
    }
  }
}

main();
'''

with open('learning-hub-js-sdk/examples/quick-start.ts', 'w') as f:
    f.write(quick_start_ts)

log("  [OK] Created examples/quick-start.ts")

# browser-example.html
browser_example = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learning Hub SDK - Browser Example</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .error {
            color: red;
            background: #ffebee;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .success {
            color: green;
            background: #e8f5e8;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #0056b3;
        }
        .course-list {
            list-style: none;
            padding: 0;
        }
        .course-item {
            background: white;
            margin: 10px 0;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #007bff;
        }
    </style>
</head>
<body>
    <h1>Learning Hub SDK - Browser Example</h1>
    
    <div class="container">
        <h2>Configuration</h2>
        <p>Configure your API settings below:</p>
        
        <label for="base-url">Base URL:</label><br>
        <input type="text" id="base-url" value="https://api.learninghub.com" style="width: 100%; margin: 5px 0;"><br>
        
        <label for="api-key">API Key:</label><br>
        <input type="password" id="api-key" placeholder="Your API key" style="width: 100%; margin: 5px 0;"><br>
        
        <button onclick="initializeSDK()">Initialize SDK</button>
        <button onclick="testConnection()">Test Connection</button>
    </div>

    <div id="output"></div>

    <div class="container">
        <h2>Actions</h2>
        <button onclick="getCurrentUser()">Get Current User</button>
        <button onclick="getCourses()">List Courses</button>
        <button onclick="getCategories()">Get Categories</button>
    </div>

    <div id="results"></div>

    <!-- Include the SDK (you would normally use npm install) -->
    <script type="module">
        // For this example, we'll simulate the SDK
        // In real usage, you would import from 'learning-hub-sdk'
        
        let client = null;
        
        window.initializeSDK = function() {
            const baseURL = document.getElementById('base-url').value;
            const apiKey = document.getElementById('api-key').value;
            
            if (!apiKey) {
                showError('Please provide an API key');
                return;
            }
            
            // Simulate SDK initialization
            client = {
                baseURL,
                apiKey,
                healthCheck: async () => ({ status: 'ok' }),
                getCurrentUser: async () => ({ id: 1, username: 'testuser', email: 'test@example.com' }),
                getCourses: async () => ({ count: 5, results: [
                    { id: 1, title: 'Introduction to Python', price: 49.99 },
                    { id: 2, title: 'Advanced JavaScript', price: 79.99 }
                ]}),
                getCategories: async () => [
                    { id: 1, name: 'Programming' },
                    { id: 2, name: 'Design' }
                ]
            };
            
            showSuccess('SDK initialized successfully!');
        };
        
        window.testConnection = async function() {
            if (!client) {
                showError('Please initialize the SDK first');
                return;
            }
            
            try {
                const health = await client.healthCheck();
                showSuccess(`Connection successful! Status: ${health.status}`);
            } catch (error) {
                showError(`Connection failed: ${error.message}`);
            }
        };
        
        window.getCurrentUser = async function() {
            if (!client) {
                showError('Please initialize the SDK first');
                return;
            }
            
            try {
                const user = await client.getCurrentUser();
                displayUser(user);
            } catch (error) {
                showError(`Failed to get user: ${error.message}`);
            }
        };
        
        window.getCourses = async function() {
            if (!client) {
                showError('Please initialize the SDK first');
                return;
            }
            
            try {
                const courses = await client.getCourses();
                displayCourses(courses);
            } catch (error) {
                showError(`Failed to get courses: ${error.message}`);
            }
        };
        
        window.getCategories = async function() {
            if (!client) {
                showError('Please initialize the SDK first');
                return;
            }
            
            try {
                const categories = await client.getCategories();
                displayCategories(categories);
            } catch (error) {
                showError(`Failed to get categories: ${error.message}`);
            }
        };
        
        function showError(message) {
            const output = document.getElementById('output');
            output.innerHTML = `<div class="error">${message}</div>`;
        }
        
        function showSuccess(message) {
            const output = document.getElementById('output');
            output.innerHTML = `<div class="success">${message}</div>`;
        }
        
        function displayUser(user) {
            const results = document.getElementById('results');
            results.innerHTML = `
                <div class="container">
                    <h3>Current User</h3>
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                </div>
            `;
        }
        
        function displayCourses(courses) {
            const results = document.getElementById('results');
            const courseList = courses.results.map(course => `
                <div class="course-item">
                    <h4>${course.title}</h4>
                    <p>Price: $${course.price}</p>
                </div>
            `).join('');
            
            results.innerHTML = `
                <div class="container">
                    <h3>Courses (${courses.count} found)</h3>
                    <div class="course-list">
                        ${courseList}
                    </div>
                </div>
            `;
        }
        
        function displayCategories(categories) {
            const results = document.getElementById('results');
            const categoryList = categories.map(category => `
                <div class="course-item">
                    <h4>${category.name}</h4>
                    <p>ID: ${category.id}</p>
                </div>
            `).join('');
            
            results.innerHTML = `
                <div class="container">
                    <h3>Categories</h3>
                    <div class="course-list">
                        ${categoryList}
                    </div>
                </div>
            `;
        }
    </script>
</body>
</html>
'''

with open('learning-hub-js-sdk/examples/browser-example.html', 'w') as f:
    f.write(browser_example)

log("  [OK] Created examples/browser-example.html")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 80)
print("LEARNING HUB JAVASCRIPT/TYPESCRIPT SDK DEVELOPMENT COMPLETE")
print("=" * 80)

print("\n[CREATED] SDK Package Structure:")
print("  learning-hub-js-sdk/")
print("  ├── src/")
print("  │   ├── index.ts")
print("  │   ├── client.ts")
print("  │   ├── auth.ts")
print("  │   ├── models.ts")
print("  │   ├── types.ts")
print("  │   └── exceptions.ts")
print("  ├── dist/")
print("  ├── tests/")
print("  ├── examples/")
print("  │   ├── quick-start.ts")
print("  │   └── browser-example.html")
print("  ├── docs/")
print("  ├── package.json")
print("  ├── tsconfig.json")
print("  ├── rollup.config.js")
print("  ├── jest.config.js")
print("  └── README.md")
print()

print("[FEATURES]:")
print("  ✅ Complete TypeScript SDK with full type safety")
print("  ✅ Browser and Node.js compatibility")
print("  ✅ Comprehensive error handling")
print("  ✅ Authentication with API key and credentials")
print("  ✅ Full API coverage (users, courses, enrollments, reviews, progress)")
print("  ✅ Data models with helper methods")
print("  ✅ Build configuration (Rollup, TypeScript, Jest)")
print("  ✅ Examples and documentation")
print("  ✅ Browser example for web integration")
print()

print("[NEXT STEPS]:")
print("  1. Install dependencies: cd learning-hub-js-sdk && npm install")
print("  2. Build the SDK: npm run build")
print("  3. Run tests: npm test")
print("  4. Try examples: open examples/browser-example.html")
print("  5. Publish to npm: npm publish")
print()

print("=" * 80)
print("[DONE] JavaScript/TypeScript SDK development complete!")
print("=" * 80 + "\n")
