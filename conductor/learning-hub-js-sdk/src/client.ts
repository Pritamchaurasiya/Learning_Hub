/**
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
    this.baseURL = config.baseURL.replace(/\/$/, '');
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
