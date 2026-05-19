import { http, HttpResponse } from 'msw'

// Mock API responses for MSW
export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'student',
        },
        tokens: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
        },
      },
    })
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: '1',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'student',
        avatar: null,
        progress: [],
        bookmarks: [],
      },
    })
  }),

  // Courses endpoints
  http.get('/api/v1/courses', () => {
    return HttpResponse.json({
      status: 'success',
      data: [
        {
          id: '1',
          title: 'Introduction to React',
          description: 'Learn React from scratch',
          short_description: 'React fundamentals',
          thumbnail: null,
          instructor: {
            id: '1',
            display_name: 'John Doe',
            avatar: null,
            bio: 'Senior Developer',
            total_students: 100,
            total_courses: 5,
          },
          price: 99.99,
          original_price: 199.99,
          rating: 4.5,
          review_count: 100,
          student_count: 500,
          duration: '10 hours',
          level: 'beginner',
          language: 'English',
          last_updated: '2024-01-01',
          certificate: true,
          sections: [],
          learning_outcomes: [],
          prerequisites: [],
          tags: ['react', 'javascript'],
          is_enrolled: false,
          progress_percent: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })
  }),

  http.get('/api/v1/courses/:id', ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: params.id,
        title: 'Introduction to React',
        description: 'Learn React from scratch',
        short_description: 'React fundamentals',
        thumbnail: null,
        trailer_video: null,
        instructor: {
          id: '1',
          display_name: 'John Doe',
          avatar: null,
          bio: 'Senior Developer',
          total_students: 100,
          total_courses: 5,
        },
        price: 99.99,
        original_price: 199.99,
        rating: 4.5,
        review_count: 100,
        student_count: 500,
        duration: '10 hours',
        level: 'beginner',
        language: 'English',
        last_updated: '2024-01-01',
        certificate: true,
        sections: [
          {
            id: '1',
            title: 'Getting Started',
            lessons: [
              {
                id: '1',
                title: 'Introduction',
                description: 'Course intro',
                duration: '5 min',
                video_url: null,
                is_free: true,
                order: 1,
                completed: false,
              },
            ],
          },
        ],
        learning_outcomes: ['Build React apps'],
        prerequisites: ['JavaScript basics'],
        tags: ['react', 'javascript'],
        is_enrolled: false,
        progress_percent: null,
      },
    })
  }),

  // Quiz endpoints
  http.get('/api/v1/tests/:id', ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: params.id,
        title: 'React Fundamentals Quiz',
        description: 'Test your React knowledge',
        duration_minutes: 30,
        passing_score: 70,
        questions: [
          {
            id: '1',
            text: 'What is React?',
            options: [
              { id: 'a', text: 'A library for building UIs' },
              { id: 'b', text: 'A framework' },
              { id: 'c', text: 'A database' },
            ],
          },
        ],
      },
    })
  }),

  // Health check
  http.get('/api/v1/health', () => {
    return HttpResponse.json({
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
    })
  }),
]
