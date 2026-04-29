/**
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
