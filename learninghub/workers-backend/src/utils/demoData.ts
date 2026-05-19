/**
 * LearningHub Demo Data Setup
 * Creates sample users, courses, quizzes, and progress data for testing
 */

import { Client } from '@neondatabase/serverless'
import { Env } from '../types'
import { generateUUID } from './helpers'

// Demo Users
const demoUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@learninghub.com',
    password_hash: '$2a$10$YourHashedPasswordHere', // admin123
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'student@learninghub.com',
    password_hash: '$2a$10$YourHashedPasswordHere', // student123
    full_name: 'Demo Student',
    role: 'student',
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'instructor@learninghub.com',
    password_hash: '$2a$10$YourHashedPasswordHere', // instructor123
    full_name: 'Demo Instructor',
    role: 'instructor',
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Instructor',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'learner1@example.com',
    password_hash: '$2a$10$YourHashedPasswordHere',
    full_name: 'Sarah Johnson',
    role: 'student',
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'learner2@example.com',
    password_hash: '$2a$10$YourHashedPasswordHere',
    full_name: 'Michael Chen',
    role: 'student',
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  },
]

// Demo Courses
const demoCourses = [
  {
    id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Introduction to Web Development',
    description:
      'Learn the fundamentals of HTML, CSS, and JavaScript. Build your first website from scratch with modern best practices.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Programming',
    thumbnail_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    duration: 1200, // 20 hours in minutes
    level: 'beginner',
    price: 0,
    is_published: true,
    tags: ['HTML', 'CSS', 'JavaScript', 'Web'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React 18 Masterclass',
    description:
      'Master React 18 with hooks, context, and modern patterns. Build real-world applications with TypeScript.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Programming',
    thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    duration: 1800,
    level: 'intermediate',
    price: 49.99,
    is_published: true,
    tags: ['React', 'TypeScript', 'Frontend'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'Python for Data Science',
    description:
      'Learn Python programming with focus on data analysis, visualization, and machine learning basics.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Data Science',
    thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    duration: 2400,
    level: 'beginner',
    price: 59.99,
    is_published: true,
    tags: ['Python', 'Data Science', 'ML'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    title: 'UI/UX Design Fundamentals',
    description:
      'Master the principles of user interface and user experience design. Create stunning designs with Figma.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Design',
    thumbnail_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    duration: 900,
    level: 'beginner',
    price: 39.99,
    is_published: true,
    tags: ['UI/UX', 'Figma', 'Design'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    title: 'Full-Stack Node.js & Express',
    description:
      'Build complete web applications with Node.js, Express, MongoDB, and authentication.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Programming',
    thumbnail_url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80',
    duration: 2100,
    level: 'advanced',
    price: 69.99,
    is_published: true,
    tags: ['Node.js', 'Express', 'MongoDB'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    title: 'Machine Learning A-Z',
    description:
      'Comprehensive machine learning course covering supervised and unsupervised learning algorithms.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Data Science',
    thumbnail_url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    duration: 3000,
    level: 'intermediate',
    price: 89.99,
    is_published: true,
    tags: ['ML', 'Python', 'AI'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    title: 'Mobile App Development with Flutter',
    description:
      'Build beautiful cross-platform mobile apps for iOS and Android with a single codebase.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'Mobile',
    thumbnail_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    duration: 1500,
    level: 'intermediate',
    price: 54.99,
    is_published: true,
    tags: ['Flutter', 'Dart', 'Mobile'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    title: 'DevOps & CI/CD Fundamentals',
    description: 'Learn DevOps practices, Docker, Kubernetes, and build automated CI/CD pipelines.',
    instructor_id: '550e8400-e29b-41d4-a716-446655440002',
    category: 'DevOps',
    thumbnail_url: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80',
    duration: 1800,
    level: 'advanced',
    price: 79.99,
    is_published: true,
    tags: ['Docker', 'Kubernetes', 'CI/CD'],
  },
]

// Demo Lessons
const demoLessons = [
  // Web Dev Course Lessons
  {
    id: '770e8400-e29b-41d4-a716-446655440000',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Introduction to HTML',
    description: 'Learn the basics of HTML structure and elements',
    video_url: 'https://example.com/video1',
    duration: 15,
    order_index: 1,
    is_preview: true,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'CSS Styling Basics',
    description: 'Master CSS selectors, properties, and styling',
    video_url: 'https://example.com/video2',
    duration: 20,
    order_index: 2,
    is_preview: true,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'JavaScript Fundamentals',
    description: 'Variables, functions, and basic programming concepts',
    video_url: 'https://example.com/video3',
    duration: 25,
    order_index: 3,
    is_preview: false,
  },
  // React Course Lessons
  {
    id: '770e8400-e29b-41d4-a716-446655440010',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Components & JSX',
    description: 'Understanding React components and JSX syntax',
    video_url: 'https://example.com/video10',
    duration: 18,
    order_index: 1,
    is_preview: true,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440011',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Hooks Deep Dive',
    description: 'Master useState, useEffect, and custom hooks',
    video_url: 'https://example.com/video11',
    duration: 30,
    order_index: 2,
    is_preview: false,
  },
]

// Demo Quizzes
const demoQuizzes = [
  {
    id: '880e8400-e29b-41d4-a716-446655440000',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Web Development Basics Quiz',
    description: 'Test your knowledge of HTML, CSS, and JavaScript basics',
    time_limit: 20,
    passing_score: 70,
    is_published: true,
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Fundamentals Quiz',
    description: 'Assessment on React components, props, and state',
    time_limit: 25,
    passing_score: 75,
    is_published: true,
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002',
    course_id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'Python Basics Quiz',
    description: 'Test your Python programming knowledge',
    time_limit: 30,
    passing_score: 65,
    is_published: true,
  },
]

// Demo Quiz Questions
const demoQuestions = [
  // Web Dev Quiz Questions
  {
    id: '990e8400-e29b-41d4-a716-446655440000',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'What does HTML stand for?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'Hyper Text Markup Language', is_correct: true },
      { id: 'b', text: 'High Tech Modern Language', is_correct: false },
      { id: 'c', text: 'Hyper Transfer Markup Language', is_correct: false },
      { id: 'd', text: 'Home Tool Markup Language', is_correct: false },
    ],
    explanation:
      'HTML stands for Hyper Text Markup Language, the standard markup language for creating web pages.',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440001',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'Which CSS property is used to change the text color?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'text-color', is_correct: false },
      { id: 'b', text: 'color', is_correct: true },
      { id: 'c', text: 'font-color', is_correct: false },
      { id: 'd', text: 'text-style', is_correct: false },
    ],
    explanation: 'The "color" property in CSS is used to set the color of text.',
    points: 10,
    order_index: 2,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'What is the correct way to declare a JavaScript variable?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'var name = "John";', is_correct: true },
      { id: 'b', text: 'variable name = "John";', is_correct: false },
      { id: 'c', text: 'v name = "John";', is_correct: false },
      { id: 'd', text: 'string name = "John";', is_correct: false },
    ],
    explanation: 'In JavaScript, you can declare variables using var, let, or const keywords.',
    points: 10,
    order_index: 3,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440003',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'Which tag is used to create a hyperlink in HTML?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: '<link>', is_correct: false },
      { id: 'b', text: '<a>', is_correct: true },
      { id: 'c', text: '<href>', is_correct: false },
      { id: 'd', text: '<url>', is_correct: false },
    ],
    explanation: 'The <a> tag is used to create hyperlinks in HTML.',
    points: 10,
    order_index: 4,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440004',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'What does CSS stand for?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'Computer Style Sheets', is_correct: false },
      { id: 'b', text: 'Creative Style Sheets', is_correct: false },
      { id: 'c', text: 'Cascading Style Sheets', is_correct: true },
      { id: 'd', text: 'Colorful Style Sheets', is_correct: false },
    ],
    explanation: 'CSS stands for Cascading Style Sheets.',
    points: 10,
    order_index: 5,
  },
  // React Quiz Questions
  {
    id: '990e8400-e29b-41d4-a716-446655440010',
    quiz_id: '880e8400-e29b-41d4-a716-446655440001',
    question_text: 'What is JSX?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'A JavaScript XML syntax extension', is_correct: true },
      { id: 'b', text: 'A new programming language', is_correct: false },
      { id: 'c', text: 'A database query language', is_correct: false },
      { id: 'd', text: 'A CSS preprocessor', is_correct: false },
    ],
    explanation: 'JSX is a syntax extension for JavaScript that looks similar to XML/HTML.',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440011',
    quiz_id: '880e8400-e29b-41d4-a716-446655440001',
    question_text: 'Which hook is used to manage state in functional components?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'useEffect', is_correct: false },
      { id: 'b', text: 'useContext', is_correct: false },
      { id: 'c', text: 'useState', is_correct: true },
      { id: 'd', text: 'useReducer', is_correct: false },
    ],
    explanation: 'useState is the React hook used to add state to functional components.',
    points: 10,
    order_index: 2,
  },
  // Python Quiz Questions
  {
    id: '990e8400-e29b-41d4-a716-446655440020',
    quiz_id: '880e8400-e29b-41d4-a716-446655440002',
    question_text: 'What is the correct file extension for Python files?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: '.py', is_correct: true },
      { id: 'b', text: '.python', is_correct: false },
      { id: 'c', text: '.pt', is_correct: false },
      { id: 'd', text: '.p', is_correct: false },
    ],
    explanation: 'Python files use the .py extension.',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440021',
    quiz_id: '880e8400-e29b-41d4-a716-446655440002',
    question_text: 'How do you create a list in Python?',
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: 'list = []', is_correct: true },
      { id: 'b', text: 'list = ()', is_correct: false },
      { id: 'c', text: 'list = {}', is_correct: false },
      { id: 'd', text: 'list = <>', is_correct: false },
    ],
    explanation: 'Lists in Python are created using square brackets [].',
    points: 10,
    order_index: 2,
  },
]

// Demo Enrollments
const demoEnrollments = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    progress: 65,
    completed_lessons: 2,
    total_lessons: 3,
    enrolled_at: new Date().toISOString(),
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    progress: 30,
    completed_lessons: 1,
    total_lessons: 2,
    enrolled_at: new Date().toISOString(),
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    progress: 100,
    completed_lessons: 3,
    total_lessons: 3,
    enrolled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440004',
    course_id: '660e8400-e29b-41d4-a716-446655440002',
    progress: 45,
    completed_lessons: 5,
    total_lessons: 12,
    enrolled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Demo Gamification Data
const demoGamification = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    xp: 1250,
    level: 3,
    streak: 5,
    last_activity: new Date().toISOString(),
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    xp: 2800,
    level: 5,
    streak: 12,
    last_activity: new Date().toISOString(),
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440004',
    xp: 800,
    level: 2,
    streak: 3,
    last_activity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Demo Quiz Results
const demoQuizResults = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    score: 80,
    max_score: 100,
    completed_at: new Date().toISOString(),
    answers: [
      {
        question_id: '990e8400-e29b-41d4-a716-446655440000',
        selected_option: 'a',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440001',
        selected_option: 'b',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440002',
        selected_option: 'a',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440003',
        selected_option: 'b',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440004',
        selected_option: 'c',
        is_correct: true,
      },
    ],
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    quiz_id: '880e8400-e29b-41d4-a716-446655440000',
    score: 100,
    max_score: 100,
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    answers: [
      {
        question_id: '990e8400-e29b-41d4-a716-446655440000',
        selected_option: 'a',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440001',
        selected_option: 'b',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440002',
        selected_option: 'a',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440003',
        selected_option: 'b',
        is_correct: true,
      },
      {
        question_id: '990e8400-e29b-41d4-a716-446655440004',
        selected_option: 'c',
        is_correct: true,
      },
    ],
  },
]

export async function seedDemoData(env: Env): Promise<void> {
  const client = new Client(env.DATABASE_URL)

  try {
    await client.connect()

    // Start transaction
    await client.query('BEGIN')

    console.log('[Demo Data] Starting database seeding...')

    // Insert Users
    for (const user of demoUsers) {
      await client.query(
        `
        INSERT INTO users (id, email, password_hash, full_name, role, is_active, avatar_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role
      `,
        [
          user.id,
          user.email,
          user.password_hash,
          user.full_name,
          user.role,
          user.is_active,
          user.avatar_url,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoUsers.length} users`)

    // Insert Courses
    for (const course of demoCourses) {
      await client.query(
        `
        INSERT INTO courses (id, title, description, instructor_id, category, thumbnail_url, duration, level, price, is_published, tags, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          is_published = EXCLUDED.is_published
      `,
        [
          course.id,
          course.title,
          course.description,
          course.instructor_id,
          course.category,
          course.thumbnail_url,
          course.duration,
          course.level,
          course.price,
          course.is_published,
          JSON.stringify(course.tags),
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoCourses.length} courses`)

    // Insert Lessons
    for (const lesson of demoLessons) {
      await client.query(
        `
        INSERT INTO lessons (id, course_id, title, description, video_url, duration, order_index, is_preview, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          order_index = EXCLUDED.order_index
      `,
        [
          lesson.id,
          lesson.course_id,
          lesson.title,
          lesson.description,
          lesson.video_url,
          lesson.duration,
          lesson.order_index,
          lesson.is_preview,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoLessons.length} lessons`)

    // Insert Quizzes
    for (const quiz of demoQuizzes) {
      await client.query(
        `
        INSERT INTO quizzes (id, course_id, title, description, time_limit, passing_score, is_published, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          is_published = EXCLUDED.is_published
      `,
        [
          quiz.id,
          quiz.course_id,
          quiz.title,
          quiz.description,
          quiz.time_limit,
          quiz.passing_score,
          quiz.is_published,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoQuizzes.length} quizzes`)

    // Insert Questions
    for (const question of demoQuestions) {
      await client.query(
        `
        INSERT INTO questions (id, quiz_id, question_text, question_type, options, explanation, points, order_index, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          question_text = EXCLUDED.question_text,
          options = EXCLUDED.options
      `,
        [
          question.id,
          question.quiz_id,
          question.question_text,
          question.question_type,
          JSON.stringify(question.options),
          question.explanation,
          question.points,
          question.order_index,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoQuestions.length} questions`)

    // Insert Enrollments
    for (const enrollment of demoEnrollments) {
      await client.query(
        `
        INSERT INTO enrollments (user_id, course_id, progress, completed_lessons, total_lessons, enrolled_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, course_id) DO UPDATE SET
          progress = EXCLUDED.progress,
          completed_lessons = EXCLUDED.completed_lessons
      `,
        [
          enrollment.user_id,
          enrollment.course_id,
          enrollment.progress,
          enrollment.completed_lessons,
          enrollment.total_lessons,
          enrollment.enrolled_at,
          enrollment.completed_at || null,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoEnrollments.length} enrollments`)

    // Insert Gamification Data
    for (const gamification of demoGamification) {
      await client.query(
        `
        INSERT INTO gamification (user_id, xp, level, streak, last_activity)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          xp = EXCLUDED.xp,
          level = EXCLUDED.level,
          streak = EXCLUDED.streak,
          last_activity = EXCLUDED.last_activity
      `,
        [
          gamification.user_id,
          gamification.xp,
          gamification.level,
          gamification.streak,
          gamification.last_activity,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoGamification.length} gamification records`)

    // Insert Quiz Results
    for (const result of demoQuizResults) {
      await client.query(
        `
        INSERT INTO quiz_results (id, user_id, quiz_id, score, max_score, answers, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          score = EXCLUDED.score,
          answers = EXCLUDED.answers
      `,
        [
          generateUUID(),
          result.user_id,
          result.quiz_id,
          result.score,
          result.max_score,
          JSON.stringify(result.answers),
          result.completed_at,
        ]
      )
    }
    console.log(`[Demo Data] Inserted ${demoQuizResults.length} quiz results`)

    // Commit transaction
    await client.query('COMMIT')

    console.log('[Demo Data] ✅ Database seeding completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Demo Data] ❌ Error seeding database:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Demo credentials for testing
export const demoCredentials = {
  admin: { email: 'admin@learninghub.com', password: 'admin123' },
  student: { email: 'student@learninghub.com', password: 'student123' },
  instructor: { email: 'instructor@learninghub.com', password: 'instructor123' },
}
