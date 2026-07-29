import { logger } from '../utils/logger'
import {
  COURSE_COMPLETION_XP,
  ACHIEVEMENT_TITLE,
  ACHIEVEMENT_DESCRIPTION,
  ACHIEVEMENT_ICON,
  ACHIEVEMENT_POINTS,
} from '../constants'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { withDb, queryOne } from '../db/connection'
import { requireUser } from '../utils/authHelper'
import { Env } from '../types'

export async function handleCourses(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (path === '/courses' && method === 'GET') return handleListCourses(request, env)
  if (path === '/courses/enroll' && method === 'POST') return handleEnroll(request, env)
  if (path === '/courses/my-courses' && method === 'GET') return handleMyCourses(request, env)

  const progressMatch = path.match(/^\/courses\/([^/]+)\/progress$/)
  if (progressMatch && method === 'POST')
    return handleUpdateProgress(request, env, progressMatch[1])

  const courseIdMatch = path.match(/^\/courses\/([^/]+)$/)
  if (courseIdMatch && method === 'GET') return handleGetCourse(request, env, courseIdMatch[1])

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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    return await withDb(env, async client => {
      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (search?.trim()) {
        const pattern = `%${search.trim()}%`
        conditions.push(
          `(c.title ILIKE $${idx} OR c.description ILIKE $${idx} OR c.category ILIKE $${idx} OR c.instructor_name ILIKE $${idx})`
        )
        params.push(pattern)
        idx++
      }
      if (difficulty) {
        conditions.push(`c.difficulty = $${idx}`)
        params.push(difficulty)
        idx++
      }
      if (category) {
        conditions.push(`c.category = $${idx}`)
        params.push(category)
        idx++
      }
      if (phase) {
        conditions.push(`c.phase = $${idx}`)
        params.push(phase)
        idx++
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c ${where}`
      const countResult = await client.query(countQuery, params)
      const total = parseInt(countResult.rows[0].total)

      let orderBy = 'ORDER BY c.phase, c.created_at DESC'
      switch (sort) {
        case 'rating':
          orderBy = 'ORDER BY c.rating DESC NULLS LAST'
          break
        case 'newest':
          orderBy = 'ORDER BY c.created_at DESC'
          break
        case 'price_low':
          orderBy = 'ORDER BY c.price ASC NULLS LAST'
          break
        case 'price_high':
          orderBy = 'ORDER BY c.price DESC NULLS LAST'
          break
        case 'popularity':
          orderBy = 'ORDER BY enrolled_count DESC'
          break
      }

      const query = `
        SELECT c.*, 
          COUNT(e.id) as enrolled_count,
          CASE WHEN c.difficulty = 'beginner' THEN 1
               WHEN c.difficulty = 'intermediate' THEN 2
               WHEN c.difficulty = 'advanced' THEN 3
               ELSE 0
          END as difficulty_order
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        ${where}
        GROUP BY c.id
        ${orderBy}
        LIMIT $${idx} OFFSET $${idx + 1}
      `
      params.push(limit, offset)

      const result = await client.query(query, params)

      return createJSONResponse({
        courses: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      })
    })
  } catch (error) {
    logger.error('List courses error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const courseResult = await client.query(
        `
        SELECT c.*, 
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
          (SELECT COUNT(*) FROM tests WHERE course_id = c.id) as test_count
        FROM courses c WHERE c.id = $1
      `,
        [courseId]
      )

      if (courseResult.rows.length === 0) {
        return createErrorResponse('Course not found', 404)
      }

      const course = courseResult.rows[0]

      const testsResult = await client.query(
        `SELECT id, title, description, time_limit, total_questions FROM tests WHERE course_id = $1`,
        [courseId]
      )
      course.tests = testsResult.rows

      const { user } = await requireUser(request, env)
      if (user && user.userId) {
        const enrollmentResult = await client.query(
          `SELECT progress, completed FROM enrollments WHERE user_id = $1 AND course_id = $2`,
          [user.userId, courseId]
        )
        if (enrollmentResult.rows.length > 0) {
          course.enrollment = enrollmentResult.rows[0]
        }
      }

      return createJSONResponse({ course })
    })
  } catch (error) {
    logger.error('Get course error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleEnroll(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = (await request.json()) as any
    const { courseId } = body
    if (!courseId) return createErrorResponse('courseId required', 400)

    return await withDb(env, async client => {
      const course = await queryOne<{ id: string }>(
        client,
        'SELECT id FROM courses WHERE id = $1',
        [courseId]
      )
      if (!course) return createErrorResponse('Course not found', 404)

      const existing = await queryOne<{ id: string }>(
        client,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [user.userId, courseId]
      )
      if (existing) return createErrorResponse('Already enrolled', 409)

      const enrollment = await queryOne(
        client,
        `INSERT INTO enrollments (id, user_id, course_id) VALUES (gen_random_uuid(), $1, $2) RETURNING id, enrolled_at`,
        [user.userId, courseId]
      )

      return createJSONResponse({ enrollment, message: 'Enrolled successfully' }, 201)
    })
  } catch (error) {
    logger.error('Enroll error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleMyCourses(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const result = await client.query(
        `
        SELECT c.*, e.progress, e.completed, e.enrolled_at, e.completed_at
        FROM courses c
        INNER JOIN enrollments e ON c.id = e.course_id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC
      `,
        [user.userId]
      )

      return createJSONResponse({ courses: result.rows })
    })
  } catch (error) {
    logger.error('My courses error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleUpdateProgress(
  request: Request,
  env: Env,
  courseId: string
): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = (await request.json()) as any
    const { progress } = body

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return createErrorResponse('Invalid progress value (0-100)')
    }

    return await withDb(env, async client => {
      const updateResult = await client.query(
        `
        UPDATE enrollments 
        SET progress = $1, 
            completed = CASE WHEN $1 >= 100 THEN TRUE ELSE completed END,
            completed_at = CASE WHEN $1 >= 100 AND completed = FALSE THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE user_id = $2 AND course_id = $3
        RETURNING *
      `,
        [progress, user.userId, courseId]
      )

      if (updateResult.rows.length === 0) {
        return createErrorResponse('Enrollment not found', 404)
      }

      const enrollment = updateResult.rows[0]
      if (enrollment.completed && enrollment.progress >= 100) {
        await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [
          COURSE_COMPLETION_XP,
          user.userId,
        ])

        const achievementExists = await queryOne<{ id: string }>(
          client,
          `SELECT id FROM achievements WHERE user_id = $1 AND achievement_type = 'course_complete' AND metadata->>'course_id' = $2`,
          [user.userId, courseId]
        )

        if (!achievementExists) {
          await client.query(
            `INSERT INTO achievements (user_id, achievement_type, title, description, icon, points)
             VALUES ($1, 'course_complete', $2, $3, $4, $5)`,
            [
              user.userId,
              ACHIEVEMENT_TITLE,
              ACHIEVEMENT_DESCRIPTION,
              ACHIEVEMENT_ICON,
              ACHIEVEMENT_POINTS,
            ]
          )
        }
      }

      return createJSONResponse({ enrollment: updateResult.rows[0], message: 'Progress updated' })
    })
  } catch (error) {
    logger.error('Update progress error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
