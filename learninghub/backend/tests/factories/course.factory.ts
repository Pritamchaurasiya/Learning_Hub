import { Course } from '@prisma/client';

export const createCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-' + Math.random().toString(36).substring(7),
  title: 'Test Course',
  description: 'A test course description',
  shortDescription: null,
  phase: 'Foundation',
  duration: 3600,
  difficulty: 'Beginner',
  category: 'Web Development',
  content: '# Course Content',
  thumbnail: null,
  trailerVideo: null,
  instructorName: null,
  instructorBio: null,
  price: 0,
  originalPrice: null,
  rating: 4.5,
  reviewCount: 0,
  studentCount: 0,
  certificate: false,
  language: 'English',
  lastUpdated: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createCourses = (count: number): Course[] => {
  return Array.from({ length: count }, (_, i) =>
    createCourse({
      id: `course-${i + 1}`,
      title: `Test Course ${i + 1}`,
    })
  );
};
