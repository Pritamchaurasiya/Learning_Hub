import { Client } from '@neondatabase/serverless'
import { Env } from '../types'

const demoUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@learninghub.com',
    password_hash: '$2a$10$oycElHYe3WAfI.uXWDzO4OP4giHzjtlMhWcr9HHq3VnprCYVGdqmW',
    username: 'Admin User',
    role: 'admin',
    xp: 5000,
    level: 10,
    streak: 30,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'student@learninghub.com',
    password_hash: '$2a$10$FxQZNfFAx2cYCI1Ued5gZeJdunZPheMzFkAhwb105LBJmquQLHEyK',
    username: 'Demo Student',
    role: 'user',
    xp: 1250,
    level: 3,
    streak: 5,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'instructor@learninghub.com',
    password_hash: '$2a$10$Lm8DADJru0K7Kqc/aJRA2O71g7CkRrASap5UAq7PdwUXiFffww3kG',
    username: 'Demo Instructor',
    role: 'moderator',
    xp: 3200,
    level: 6,
    streak: 15,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Instructor',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'learner1@example.com',
    password_hash: '$2a$10$OluKjr4UtFcWj7VSmyROyuevruL43taKTsoSqSI2K/apknB/YHGmK',
    username: 'Sarah Johnson',
    role: 'user',
    xp: 2800,
    level: 5,
    streak: 12,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'learner2@example.com',
    password_hash: '$2a$10$iUrVST3GXrEOr/8Fe4cgV.tycpdbHWpCBW/QB4DdYE2H3l6osT3La',
    username: 'Michael Chen',
    role: 'user',
    xp: 800,
    level: 2,
    streak: 3,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  },
]

const demoCourses = [
  {
    id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Introduction to Web Development',
    description:
      'Learn the fundamentals of HTML, CSS, and JavaScript. Build your first website from scratch with modern best practices.',
    short_description: 'Build your first website from scratch',
    phase: 'beginner',
    difficulty: 'beginner',
    category: 'Programming',
    duration: '20 hours',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'Senior Web Developer',
    price: 0,
    original_price: null,
    prerequisites: [],
    what_you_will_learn: ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React 18 Masterclass',
    description:
      'Master React 18 with hooks, context, and modern patterns. Build real-world applications with TypeScript.',
    short_description: 'Master React with TypeScript',
    phase: 'intermediate',
    difficulty: 'intermediate',
    category: 'Programming',
    duration: '30 hours',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'React Expert',
    price: 49.99,
    original_price: 99.99,
    prerequisites: ['JavaScript basics', 'HTML/CSS'],
    what_you_will_learn: ['React 18', 'TypeScript', 'Hooks', 'State Management'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'Python for Data Science',
    description:
      'Learn Python programming with focus on data analysis, visualization, and machine learning basics.',
    short_description: 'Python for data analysis & ML',
    phase: 'beginner',
    difficulty: 'beginner',
    category: 'Data Science',
    duration: '40 hours',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'Data Scientist',
    price: 59.99,
    original_price: 119.99,
    prerequisites: [],
    what_you_will_learn: ['Python', 'NumPy', 'Pandas', 'Matplotlib', 'ML basics'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    title: 'UI/UX Design Fundamentals',
    description:
      'Master the principles of user interface and user experience design. Create stunning designs with Figma.',
    short_description: 'Master UI/UX with Figma',
    phase: 'beginner',
    difficulty: 'beginner',
    category: 'Design',
    duration: '15 hours',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'UX Designer',
    price: 39.99,
    original_price: 79.99,
    prerequisites: [],
    what_you_will_learn: ['UI Design', 'UX Research', 'Figma', 'Prototyping'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    title: 'Full-Stack Node.js & Express',
    description:
      'Build complete web applications with Node.js, Express, MongoDB, and authentication.',
    short_description: 'Full-stack JavaScript with Node.js',
    phase: 'advanced',
    difficulty: 'advanced',
    category: 'Programming',
    duration: '35 hours',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'Full-Stack Developer',
    price: 69.99,
    original_price: 139.99,
    prerequisites: ['JavaScript', 'Basic HTML/CSS'],
    what_you_will_learn: ['Node.js', 'Express', 'MongoDB', 'Auth', 'REST APIs'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    title: 'Machine Learning A-Z',
    description:
      'Comprehensive machine learning course covering supervised and unsupervised learning algorithms.',
    short_description: 'Complete ML course',
    phase: 'intermediate',
    difficulty: 'intermediate',
    category: 'Data Science',
    duration: '50 hours',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'ML Engineer',
    price: 89.99,
    original_price: 179.99,
    prerequisites: ['Python', 'Basic Math'],
    what_you_will_learn: ['Regression', 'Classification', 'Clustering', 'Neural Networks'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    title: 'Mobile App Development with Flutter',
    description:
      'Build beautiful cross-platform mobile apps for iOS and Android with a single codebase.',
    short_description: 'Cross-platform mobile apps',
    phase: 'intermediate',
    difficulty: 'intermediate',
    category: 'Mobile',
    duration: '25 hours',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'Flutter Developer',
    price: 54.99,
    original_price: 109.99,
    prerequisites: ['Basic programming'],
    what_you_will_learn: ['Flutter', 'Dart', 'Widgets', 'State Management'],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    title: 'DevOps & CI/CD Fundamentals',
    description: 'Learn DevOps practices, Docker, Kubernetes, and build automated CI/CD pipelines.',
    short_description: 'DevOps with Docker & K8s',
    phase: 'advanced',
    difficulty: 'advanced',
    category: 'DevOps',
    duration: '30 hours',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80',
    instructor_name: 'Demo Instructor',
    instructor_bio: 'DevOps Engineer',
    price: 79.99,
    original_price: 159.99,
    prerequisites: ['Linux basics', 'Command line'],
    what_you_will_learn: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform'],
  },
]

const demoLessons = [
  {
    id: '770e8400-e29b-41d4-a716-446655440000',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Introduction to HTML',
    content: 'Learn the basics of HTML structure and elements',
    video_url: 'https://example.com/video1',
    duration: 15,
    order_index: 1,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'CSS Styling Basics',
    content: 'Master CSS selectors, properties, and styling',
    video_url: 'https://example.com/video2',
    duration: 20,
    order_index: 2,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'JavaScript Fundamentals',
    content: 'Variables, functions, and basic programming concepts',
    video_url: 'https://example.com/video3',
    duration: 25,
    order_index: 3,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440010',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Components & JSX',
    content: 'Understanding React components and JSX syntax',
    video_url: 'https://example.com/video10',
    duration: 18,
    order_index: 1,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440011',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Hooks Deep Dive',
    content: 'Master useState, useEffect, and custom hooks',
    video_url: 'https://example.com/video11',
    duration: 30,
    order_index: 2,
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440020',
    course_id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'Python Basics',
    content: 'Variables, data types, and control flow',
    video_url: 'https://example.com/video20',
    duration: 20,
    order_index: 1,
  },
]

const demoTests = [
  {
    id: '880e8400-e29b-41d4-a716-446655440000',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    title: 'Web Development Basics Quiz',
    description: 'Test your knowledge of HTML, CSS, and JavaScript basics',
    time_limit_minutes: 20,
    passing_score: 70,
    difficulty: 'easy',
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    title: 'React Fundamentals Quiz',
    description: 'Assessment on React components, props, and state',
    time_limit_minutes: 25,
    passing_score: 75,
    difficulty: 'medium',
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002',
    course_id: '660e8400-e29b-41d4-a716-446655440002',
    title: 'Python Basics Quiz',
    description: 'Test your Python programming knowledge',
    time_limit_minutes: 30,
    passing_score: 65,
    difficulty: 'easy',
  },
]

const demoQuestions = [
  {
    id: '990e8400-e29b-41d4-a716-446655440000',
    test_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'What does HTML stand for?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'Hyper Text Markup Language' },
      { id: 'b', text: 'High Tech Modern Language' },
      { id: 'c', text: 'Hyper Transfer Markup Language' },
      { id: 'd', text: 'Home Tool Markup Language' },
    ]),
    correct_answer: 'a',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440001',
    test_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'Which CSS property changes text color?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'text-color' },
      { id: 'b', text: 'color' },
      { id: 'c', text: 'font-color' },
      { id: 'd', text: 'text-style' },
    ]),
    correct_answer: 'b',
    points: 10,
    order_index: 2,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002',
    test_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'How to declare a JS variable?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'var name = "John"' },
      { id: 'b', text: 'variable name = "John"' },
      { id: 'c', text: 'v name = "John"' },
      { id: 'd', text: 'string name = "John"' },
    ]),
    correct_answer: 'a',
    points: 10,
    order_index: 3,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440003',
    test_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'Which tag creates a hyperlink?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: '<link>' },
      { id: 'b', text: '<a>' },
      { id: 'c', text: '<href>' },
      { id: 'd', text: '<url>' },
    ]),
    correct_answer: 'b',
    points: 10,
    order_index: 4,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440004',
    test_id: '880e8400-e29b-41d4-a716-446655440000',
    question_text: 'What does CSS stand for?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'Computer Style Sheets' },
      { id: 'b', text: 'Creative Style Sheets' },
      { id: 'c', text: 'Cascading Style Sheets' },
      { id: 'd', text: 'Colorful Style Sheets' },
    ]),
    correct_answer: 'c',
    points: 10,
    order_index: 5,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440010',
    test_id: '880e8400-e29b-41d4-a716-446655440001',
    question_text: 'What is JSX?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'A JavaScript XML syntax extension' },
      { id: 'b', text: 'A new programming language' },
      { id: 'c', text: 'A database query language' },
      { id: 'd', text: 'A CSS preprocessor' },
    ]),
    correct_answer: 'a',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440011',
    test_id: '880e8400-e29b-41d4-a716-446655440001',
    question_text: 'Which hook manages state in functional components?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'useEffect' },
      { id: 'b', text: 'useContext' },
      { id: 'c', text: 'useState' },
      { id: 'd', text: 'useReducer' },
    ]),
    correct_answer: 'c',
    points: 10,
    order_index: 2,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440020',
    test_id: '880e8400-e29b-41d4-a716-446655440002',
    question_text: 'Python file extension?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: '.py' },
      { id: 'b', text: '.python' },
      { id: 'c', text: '.pt' },
      { id: 'd', text: '.p' },
    ]),
    correct_answer: 'a',
    points: 10,
    order_index: 1,
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440021',
    test_id: '880e8400-e29b-41d4-a716-446655440002',
    question_text: 'How to create a list in Python?',
    question_type: 'multiple_choice',
    options: JSON.stringify([
      { id: 'a', text: 'list = []' },
      { id: 'b', text: 'list = ()' },
      { id: 'c', text: 'list = {}' },
      { id: 'd', text: 'list = <>' },
    ]),
    correct_answer: 'a',
    points: 10,
    order_index: 2,
  },
]

const demoEnrollments = [
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    progress: 65,
    completed_lessons: 2,
    total_lessons: 3,
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    course_id: '660e8400-e29b-41d4-a716-446655440001',
    progress: 30,
    completed_lessons: 1,
    total_lessons: 2,
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440003',
    course_id: '660e8400-e29b-41d4-a716-446655440000',
    progress: 100,
    completed: true,
    completed_lessons: 3,
    total_lessons: 3,
  },
  {
    user_id: '550e8400-e29b-41d4-a716-446655440004',
    course_id: '660e8400-e29b-41d4-a716-446655440002',
    progress: 45,
    completed_lessons: 5,
    total_lessons: 12,
  },
]

export const demoCredentials = {
  admin: { email: 'admin@learninghub.com', password: 'admin123' },
  student: { email: 'student@learninghub.com', password: 'student123' },
  instructor: { email: 'instructor@learninghub.com', password: 'instructor123' },
}

export async function seedDemoData(env: Env): Promise<void> {
  const client = new Client(env.DATABASE_URL)
  try {
    await client.connect()
    await client.query('BEGIN')

    for (const u of demoUsers) {
      await client.query(
        `INSERT INTO users (id, email, username, password_hash, role, xp, level, streak, avatar_url, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW())
         ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, username=EXCLUDED.username, role=EXCLUDED.role`,
        [u.id, u.email, u.username, u.password_hash, u.role, u.xp, u.level, u.streak, u.avatar_url]
      )
    }

    for (const c of demoCourses) {
      await client.query(
        `INSERT INTO courses (id,title,description,short_description,phase,difficulty,category,duration,thumbnail,instructor_name,instructor_bio,price,original_price,prerequisites,what_you_will_learn,published,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [
          c.id,
          c.title,
          c.description,
          c.short_description,
          c.phase,
          c.difficulty,
          c.category,
          c.duration,
          c.thumbnail,
          c.instructor_name,
          c.instructor_bio,
          c.price,
          c.original_price,
          JSON.stringify(c.prerequisites),
          JSON.stringify(c.what_you_will_learn),
        ]
      )
    }

    for (const l of demoLessons) {
      await client.query(
        `INSERT INTO lessons (id,course_id,title,content,video_url,duration,order_index,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [l.id, l.course_id, l.title, l.content, l.video_url, l.duration, l.order_index]
      )
    }

    for (const t of demoTests) {
      await client.query(
        `INSERT INTO tests (id,course_id,title,description,time_limit_minutes,passing_score,difficulty,is_published,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [
          t.id,
          t.course_id,
          t.title,
          t.description,
          t.time_limit_minutes,
          t.passing_score,
          t.difficulty,
        ]
      )
    }

    for (const q of demoQuestions) {
      await client.query(
        `INSERT INTO questions (id,test_id,question_text,question_type,options,correct_answer,points,order_index,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (id) DO UPDATE SET question_text=EXCLUDED.question_text`,
        [
          q.id,
          q.test_id,
          q.question_text,
          q.question_type,
          q.options,
          q.correct_answer,
          q.points,
          q.order_index,
        ]
      )
    }

    for (const e of demoEnrollments) {
      await client.query(
        `INSERT INTO enrollments (user_id,course_id,progress,completed,completed_lessons,total_lessons,enrolled_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (user_id,course_id) DO UPDATE SET progress=EXCLUDED.progress`,
        [
          e.user_id,
          e.course_id,
          e.progress,
          e.completed || false,
          e.completed_lessons,
          e.total_lessons,
        ]
      )
      await client.query(
        `INSERT INTO user_progress (user_id,course_id,progress,completed_lessons,total_lessons,started_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (user_id,course_id) DO UPDATE SET progress=EXCLUDED.progress`,
        [e.user_id, e.course_id, e.progress, e.completed_lessons, e.total_lessons]
      )
    }

    await client.query('COMMIT')
    console.log('[Demo Data] Seeding completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[Demo Data] Seeding failed:', error)
    throw error
  } finally {
    await client.end().catch(() => {})
  }
}
