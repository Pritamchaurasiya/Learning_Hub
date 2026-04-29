# Learning Hub JavaScript/TypeScript SDK

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
