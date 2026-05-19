import type { Lesson } from '../types'

export const courseLessons: Record<string, Lesson[]> = {
  '00_Introduction': [
    {
      id: 'intro-1',
      title: 'Welcome to the Course',
      description: 'An overview of what you will learn in this mastery course.',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 300,
      completed: false,
      transcript:
        'Welcome everyone! In this course, we will embark on a journey to master software engineering...',
      resources: [
        { id: 'r1', title: 'Course Syllabus', type: 'pdf', url: '#' },
        { id: 'r2', title: 'Join Community', type: 'link', url: '#' },
      ],
    },
    {
      id: 'intro-2',
      title: 'Setting Up Your Environment',
      description: 'Get your local development environment ready for the course.',
      videoUrl: 'https://www.w3schools.com/html/movie.mp4',
      duration: 600,
      completed: false,
      transcript:
        'Before we start coding, we need to set up our tools. We will use VS Code, Git, and Node.js...',
    },
  ],
  'research-methodology': [
    {
      id: 'res-1',
      title: 'Introduction to Research',
      description: 'Understanding the importance of systematic research in engineering.',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: 450,
      completed: false,
    },
  ],
  'ml-fundamentals': [
    {
      id: 'ml-1',
      title: 'What is Machine Learning?',
      description: 'Core concepts and types of machine learning.',
      videoUrl: 'https://www.w3schools.com/html/movie.mp4',
      duration: 900,
      completed: false,
    },
  ],
}

export function getLessonsByCourseId(courseId: string): Lesson[] {
  // eslint-disable-next-line security/detect-object-injection
  return courseLessons[courseId] || []
}

export function getLessonById(courseId: string, lessonId: string): Lesson | null {
  const lessons = getLessonsByCourseId(courseId)
  return lessons.find(l => l.id === lessonId) ?? null
}
