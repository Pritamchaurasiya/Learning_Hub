import { z } from 'zod'
import { Client } from '@neondatabase/serverless'
import { createJSONResponse, createErrorResponse, generateUUID } from '../utils/helpers'
import { verifyToken } from '../middleware/auth'
import {
  getCachedCourseList,
  getCachedCourseDetail,
  invalidateCourseCache,
  getCachedUserEnrollments,
  invalidateUserEnrollments,
} from '../utils/cache'
import { Env } from '../types'

// Validation schemas
const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .optional()
    .default('10'),
})

const progressSchema = z.object({
  courseId: z.string().uuid(),
  progress: z.number().min(0).max(100),
})

const enrollSchema = z.object({
  courseId: z.string().uuid(),
})

export async function handleCourses(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  const courseIdMatch = path.match(/^\/courses\/([^\/]+)$/)

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // List all courses
  if (path === '/courses' && method === 'GET') {
    return handleListCourses(request, env)
  }

  // Get course details
  if (courseIdMatch && method === 'GET') {
    const courseId = courseIdMatch[1]
    return handleGetCourse(request, env, courseId)
  }

  // Enroll in course
  if (path === '/courses/enroll' && method === 'POST') {
    return handleEnroll(request, env)
  }

  // Get user's enrolled courses
  if (path === '/courses/my-courses' && method === 'GET') {
    return handleMyCourses(request, env)
  }

  // Update progress
  if (courseIdMatch && path.endsWith('/progress') && method === 'POST') {
    const courseId = courseIdMatch[1]
    return handleUpdateProgress(request, env, courseId)
  }

  return createErrorResponse('Not found', 404)
}

async function handleListCourses(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const difficulty = url.searchParams.get('difficulty')
    const category = url.searchParams.get('category')
    const phase = url.searchParams.get('phase')
    const search = url.searchParams.get('q')
    const sort = url.searchParams.get('sort') || 'relevance'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Build search query with full-text search support
    let query = `
      SELECT c.*, 
        COUNT(e.id) as enrolled_count,
        CASE WHEN c.difficulty = 'beginner' THEN 1
             WHEN c.difficulty = 'intermediate' THEN 2
             WHEN c.difficulty = 'advanced' THEN 3
             ELSE 0
        END as difficulty_order
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // Full-text search using PostgreSQL
    if (search && search.trim()) {
      query += ` AND (
        c.title ILIKE $${paramIndex} 
        OR c.description ILIKE $${paramIndex}
        OR c.category ILIKE $${paramIndex}
        OR c.instructor_name ILIKE $${paramIndex}
      )`
      params.push(`%${search.trim()}%`)
      paramIndex++
    }

    if (difficulty) {
      query += ` AND c.difficulty = $${paramIndex}`
      params.push(difficulty)
      paramIndex++
    }

    if (category) {
      query += ` AND c.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (phase) {
      query += ` AND c.phase = $${paramIndex}`
      params.push(phase)
      paramIndex++
    }

    query += ` GROUP BY c.id`

    // Sorting options
    switch (sort) {
      case 'rating':
        query += ` ORDER BY c.rating DESC, c.review_count DESC`
        break
      case 'newest':
        query += ` ORDER BY c.created_at DESC`
        break
      case 'price_low':
        query += ` ORDER BY c.price ASC`
        break
      case 'price_high':
        query += ` ORDER BY c.price DESC`
        break
      case 'popularity':
        query += ` ORDER BY enrolled_count DESC`
        break
      default: // relevance or phase
        query += ` ORDER BY c.phase, c.created_at DESC`
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await client.query(query, params)

    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c WHERE 1=1`
    const countParams: any[] = []
    let countParamIndex = 1

    if (search && search.trim()) {
      countQuery += ` AND (
        c.title ILIKE $${countParamIndex} 
        OR c.description ILIKE $${countParamIndex}
        OR c.category ILIKE $${countParamIndex}
        OR c.instructor_name ILIKE $${countParamIndex}
      )`
      countParams.push(`%${search.trim()}%`)
      countParamIndex++
    }

    if (difficulty) {
      countQuery += ` AND c.difficulty = $${countParamIndex}`
      countParams.push(difficulty)
      countParamIndex++
    }

    if (category) {
      countQuery += ` AND c.category = $${countParamIndex}`
      countParams.push(category)
      countParamIndex++
    }

    if (phase) {
      countQuery += ` AND c.phase = $${countParamIndex}`
      countParams.push(phase)
      countParamIndex++
    }

    const countResult = await client.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    await client.end()

    return createJSONResponse({
      courses: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List courses error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const courseResult = await client.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
        (SELECT COUNT(*) FROM tests WHERE course_id = c.id) as test_count
       FROM courses c 
       WHERE c.id = $1`,
      [courseId]
    )

    if (courseResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('Course not found', 404)
    }

    const course = courseResult.rows[0]

    // Get course tests
    const testsResult = await client.query(
      `SELECT id, title, description, time_limit, total_questions 
       FROM tests WHERE course_id = $1`,
      [courseId]
    )

    course.tests = testsResult.rows

    // Check if user is enrolled
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = await verifyToken(token, env.JWT_SECRET)

      if (payload) {
        const enrollmentResult = await client.query(
          `SELECT progress, completed FROM enrollments 
           WHERE user_id = $1 AND course_id = $2`,
          [payload.userId, courseId]
        )

        if (enrollmentResult.rows.length > 0) {
          course.enrollment = enrollmentResult.rows[0]
        }
      }
    }

    await client.end()

    return createJSONResponse({ course })
  } catch (error) {
    console.error('Get course error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleEnroll(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, env.JWT_SECRET)

    if (!payload) {
      return createErrorResponse('Invalid token', 401)
    }

    const body = await request.json()
    const result = enrollSchema.safeParse(body)

    if (!result.success) {
      return createErrorResponse('Invalid input: ' + result.error.message)
    }

    const { courseId } = result.data
    const userId = payload.userId

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Check if course exists
    const courseResult = await client.query('SELECT id FROM courses WHERE id = $1', [courseId])

    if (courseResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('Course not found', 404)
    }

    // Check if already enrolled
    const enrollmentResult = await client.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    )

    if (enrollmentResult.rows.length > 0) {
      await client.end()
      return createErrorResponse('Already enrolled', 409)
    }

    // Create enrollment
    const newEnrollment = await client.query(
      `INSERT INTO enrollments (user_id, course_id) 
       VALUES ($1, $2) 
       RETURNING id, enrolled_at`,
      [userId, courseId]
    )

    await client.end()

    return createJSONResponse(
      {
        enrollment: newEnrollment.rows[0],
        message: 'Enrolled successfully',
      },
      201
    )
  } catch (error) {
    console.error('Enroll error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleMyCourses(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, env.JWT_SECRET)

    if (!payload) {
      return createErrorResponse('Invalid token', 401)
    }

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const result = await client.query(
      `SELECT c.*, e.progress, e.completed, e.enrolled_at, e.completed_at
       FROM courses c
       INNER JOIN enrollments e ON c.id = e.course_id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [payload.userId]
    )

    await client.end()

    return createJSONResponse({ courses: result.rows })
  } catch (error) {
    console.error('My courses error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleUpdateProgress(
  request: Request,
  env: Env,
  courseId: string
): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, env.JWT_SECRET)

    if (!payload) {
      return createErrorResponse('Invalid token', 401)
    }

    const body = await request.json()
    const { progress } = body

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return createErrorResponse('Invalid progress value')
    }

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Update progress
    const updateResult = await client.query(
      `UPDATE enrollments 
       SET progress = $1, 
           completed = CASE WHEN $1 >= 100 THEN TRUE ELSE completed END,
           completed_at = CASE WHEN $1 >= 100 AND completed = FALSE THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE user_id = $2 AND course_id = $3
       RETURNING *`,
      [progress, payload.userId, courseId]
    )

    if (updateResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('Enrollment not found', 404)
    }

    // If completed, add achievement and XP
    const enrollment = updateResult.rows[0]
    if (enrollment.completed && enrollment.progress >= 100) {
      // Add XP
      await client.query('UPDATE users SET xp = xp + 100 WHERE id = $1', [payload.userId])

      // Check for achievement
      const achievementExists = await client.query(
        `SELECT id FROM achievements 
         WHERE user_id = $1 AND achievement_type = 'course_complete' 
         AND metadata->>'course_id' = $2`,
        [payload.userId, courseId]
      )

      if (achievementExists.rows.length === 0) {
        await client.query(
          `INSERT INTO achievements (user_id, achievement_type, title, description, icon, points)
           VALUES ($1, 'course_complete', 'Course Completed!', 'Completed a course', 'trophy', 100)`,
          [payload.userId]
        )
      }
    }

    await client.end()

    return createJSONResponse({
      enrollment: updateResult.rows[0],
      message: 'Progress updated',
    })
  } catch (error) {
    console.error('Update progress error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
