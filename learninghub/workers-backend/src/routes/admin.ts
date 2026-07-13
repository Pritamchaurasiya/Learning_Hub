import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { logger } from '../utils/logger'
import { hashPassword } from '../utils/security'
import { withDb, queryOne } from '../db/connection'
import { requireUser, adminOnly } from '../utils/authHelper'
import { Env } from '../types'

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  const authResult = await verifyAdminAccess(request, env)
  if (authResult) return authResult

  if (path === '/admin/users' && method === 'GET') return handleGetUsers(request, env)
  if (path.match(/^\/admin\/users\/[^/]+$/) && method === 'GET') {
    return handleGetUserDetails(request, env, path.split('/')[3])
  }
  if (path.match(/^\/admin\/users\/[^/]+$/) && method === 'PUT') {
    return handleUpdateUser(request, env, path.split('/')[3])
  }
  if (path.match(/^\/admin\/users\/[^/]+$/) && method === 'DELETE') {
    return handleDeleteUser(request, env, path.split('/')[3])
  }
  if (path === '/admin/dashboard' && method === 'GET') return handleDashboard(request, env)
  if (path === '/admin/auth/register' && method === 'POST') return handleAdminRegister(request, env)
  if (path === '/admin/courses' && method === 'GET') return handleGetCourses(request, env)
  if (path === '/admin/courses' && method === 'POST') return handleCreateCourse(request, env)
  if (path.match(/^\/admin\/courses\/[^/]+$/) && method === 'PUT') {
    return handleUpdateCourse(request, env, path.split('/')[3])
  }
  if (path.match(/^\/admin\/courses\/[^/]+$/) && method === 'DELETE') {
    return handleDeleteCourse(request, env, path.split('/')[3])
  }
  if (path === '/admin/analytics' && method === 'GET') return handleGetAnalytics(request, env)
  if (path === '/admin/analytics/users' && method === 'GET')
    return handleGetUserAnalytics(request, env)
  if (path === '/admin/analytics/courses' && method === 'GET')
    return handleGetCourseAnalytics(request, env)

  return createErrorResponse('Admin endpoint not found', 404)
}

async function verifyAdminAccess(request: Request, env: Env): Promise<Response | null> {
  const { user, error } = await requireUser(request, env)
  if (error) return error
  if (!adminOnly(user)) return createErrorResponse('Forbidden - Admin access required', 403)
  return null
}

async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    return await withDb(env, async client => {
      const usersResult = await client.query(
        `SELECT id, email, username, role, xp, level, streak, created_at, is_active
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      )
      const countResult = await client.query('SELECT COUNT(*) FROM users')
      const total = parseInt(countResult.rows[0].count)

      return createJSONResponse({
        status: 'success',
        data: {
          users: usersResult.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      })
    })
  } catch (error) {
    logger.error('Get users error:', error)
    return createErrorResponse('Failed to fetch users', 500)
  }
}

async function handleGetUserDetails(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const userResult = await client.query(
        `SELECT id, email, username, role, xp, level, streak, bio, location, website, created_at, is_active
         FROM users WHERE id = $1`,
        [userId]
      )
      if (userResult.rows.length === 0) return createErrorResponse('User not found', 404)

      const progressResult = await client.query(
        `
        SELECT c.id, c.title, p.progress, p.started_at, p.last_accessed_at
        FROM user_progress p JOIN courses c ON p.course_id = c.id WHERE p.user_id = $1
      `,
        [userId]
      )

      const resultsResult = await client.query(
        `
        SELECT t.title, tr.score, tr.completed_at, tr.passed
        FROM test_results tr JOIN tests t ON tr.test_id = t.id WHERE tr.user_id = $1
        ORDER BY tr.completed_at DESC
      `,
        [userId]
      )

      return createJSONResponse({
        status: 'success',
        data: {
          user: userResult.rows[0],
          progress: progressResult.rows,
          testResults: resultsResult.rows,
        },
      })
    })
  } catch (error) {
    logger.error('Get user details error:', error)
    return createErrorResponse('Failed to fetch user details', 500)
  }
}

const ALLOWED_USER_COLUMNS = new Set([
  'role',
  'is_active',
  'username',
  'bio',
  'location',
  'website',
])
const ALLOWED_COURSE_COLUMNS = new Set([
  'title',
  'description',
  'short_description',
  'phase',
  'difficulty',
  'category',
  'content',
  'price',
  'published',
])

async function handleUpdateUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    for (const key of Object.keys(body)) {
      if (ALLOWED_USER_COLUMNS.has(key)) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0)
      return createErrorResponse('No valid fields to update', 400)

    return await withDb(env, async client => {
      const cols = Object.keys(updates)
      const setClauses = cols.map((k, i) => `${k} = $${i + 1}`).join(', ')
      const values = [...Object.values(updates), userId]
      await client.query(`UPDATE users SET ${setClauses} WHERE id = $${cols.length + 1}`, values)
      return createJSONResponse({ status: 'success', message: 'User updated successfully' })
    })
  } catch (error) {
    logger.error('Update user error:', error)
    return createErrorResponse('Failed to update user', 500)
  }
}

async function handleDeleteUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    return await withDb(env, async client => {
      // Cascade deletes across all related tables
      const tables = [
        'enrollments',
        'user_progress',
        'test_attempts',
        'test_results',
        'bookmarks',
        'user_achievements',
        'notifications',
        'certificates',
        'discussions',
        'discussion_replies',
        'discussion_votes',
        'learning_path_enrollments',
        'password_reset_tokens',
        'email_verification_tokens',
        'activity_log',
        'achievements',
        'user_gamification',
      ]
      for (const table of tables) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId])
      }
      await client.query('DELETE FROM users WHERE id = $1', [userId])
      return createJSONResponse({ status: 'success', message: 'User deleted successfully' })
    })
  } catch (error) {
    logger.error('Delete user error:', error)
    return createErrorResponse('Failed to delete user', 500)
  }
}

async function handleCreateCourse(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()

    return await withDb(env, async client => {
      const result = await client.query(
        `
        INSERT INTO courses (id, title, description, short_description, phase, duration,
          difficulty, category, content, thumbnail, instructor_name,
          instructor_bio, price, original_price, prerequisites, what_you_will_learn,
          published, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW(), NOW()
        ) RETURNING *
      `,
        [
          body.title,
          body.description,
          body.shortDescription,
          body.phase,
          body.duration,
          body.difficulty,
          body.category,
          body.content,
          body.thumbnail,
          body.instructorName,
          body.instructorBio,
          body.price,
          body.originalPrice,
          JSON.stringify(body.prerequisites || []),
          JSON.stringify(body.whatYouWillLearn || []),
        ]
      )

      return createJSONResponse({ status: 'success', data: result.rows[0] })
    })
  } catch (error) {
    logger.error('Create course error:', error)
    return createErrorResponse('Failed to create course', 500)
  }
}

async function handleUpdateCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    for (const key of Object.keys(body)) {
      if (ALLOWED_COURSE_COLUMNS.has(key)) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0)
      return createErrorResponse('No valid fields to update', 400)

    return await withDb(env, async client => {
      const cols = Object.keys(updates)
      const setClauses = cols.map((k, i) => `${k} = $${i + 1}`).join(', ')
      const values = [...Object.values(updates), courseId]
      await client.query(
        `UPDATE courses SET ${setClauses}, updated_at = NOW() WHERE id = $${cols.length + 1}`,
        values
      )

      return createJSONResponse({ status: 'success', message: 'Course updated successfully' })
    })
  } catch (error) {
    logger.error('Update course error:', error)
    return createErrorResponse('Failed to update course', 500)
  }
}

async function handleDeleteCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    return await withDb(env, async client => {
      await client.query('DELETE FROM courses WHERE id = $1', [courseId])
      return createJSONResponse({ status: 'success', message: 'Course deleted successfully' })
    })
  } catch (error) {
    logger.error('Delete course error:', error)
    return createErrorResponse('Failed to delete course', 500)
  }
}

async function handleGetAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const [
        usersCount,
        coursesCount,
        testsCount,
        enrollmentsCount,
        completionsCount,
        recentUsers,
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM users'),
        client.query('SELECT COUNT(*) FROM courses'),
        client.query('SELECT COUNT(*) FROM tests'),
        client.query('SELECT COUNT(*) FROM user_progress'),
        client.query('SELECT COUNT(*) FROM test_results'),
        client.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`),
      ])

      return createJSONResponse({
        status: 'success',
        data: {
          users: parseInt(usersCount.rows[0].count),
          courses: parseInt(coursesCount.rows[0].count),
          tests: parseInt(testsCount.rows[0].count),
          enrollments: parseInt(enrollmentsCount.rows[0].count),
          completions: parseInt(completionsCount.rows[0].count),
          recentSignups: parseInt(recentUsers.rows[0].count),
        },
      })
    })
  } catch (error) {
    logger.error('Get analytics error:', error)
    return createErrorResponse('Failed to fetch analytics', 500)
  }
}

async function handleGetUserAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const [byRole, growth] = await Promise.all([
        client.query('SELECT role, COUNT(*) FROM users GROUP BY role'),
        client.query(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM users WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at) ORDER BY date
        `),
      ])

      return createJSONResponse({
        status: 'success',
        data: { byRole: byRole.rows, growth: growth.rows },
      })
    })
  } catch (error) {
    logger.error('Get user analytics error:', error)
    return createErrorResponse('Failed to fetch user analytics', 500)
  }
}

async function handleDashboard(request: Request, env: Env): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const [
        usersCount,
        coursesCount,
        testsCount,
        enrollmentsCount,
        completionsCount,
        revenueResult,
        recentUsers,
        recentResults,
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM users'),
        client.query('SELECT COUNT(*) FROM courses'),
        client.query('SELECT COUNT(*) FROM tests'),
        client.query('SELECT COUNT(*) FROM user_progress'),
        client.query('SELECT COUNT(*) FROM test_results'),
        client.query('SELECT COUNT(*) as count FROM test_results WHERE passed = true'),
        client.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`),
        client.query(
          `SELECT COUNT(*) FROM test_results WHERE completed_at > NOW() - INTERVAL '30 days'`
        ),
      ])

      return createJSONResponse({
        status: 'success',
        data: {
          users: parseInt(usersCount.rows[0].count),
          courses: parseInt(coursesCount.rows[0].count),
          tests: parseInt(testsCount.rows[0].count),
          enrollments: parseInt(enrollmentsCount.rows[0].count),
          completions: parseInt(completionsCount.rows[0].count),
          passed: parseInt(revenueResult.rows[0].count),
          recentSignups: parseInt(recentUsers.rows[0].count),
          recentCompletions: parseInt(recentResults.rows[0].count),
        },
      })
    })
  } catch (error) {
    logger.error('Dashboard error:', error)
    return createErrorResponse('Failed to fetch dashboard', 500)
  }
}

async function handleAdminRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { email, password, username } = body

    if (!email || !password || !username) {
      return createErrorResponse('Email, password, and username required', 400)
    }

    const passwordHash = await hashPassword(password)

    return await withDb(env, async client => {
      const existing = await queryOne<{ id: string }>(
        client,
        'SELECT id FROM users WHERE email = $1',
        [email]
      )
      if (existing) return createErrorResponse('User already exists', 409)

      await client.query(
        `INSERT INTO users (id, email, username, password_hash, role) VALUES (gen_random_uuid(), $1, $2, $3, 'admin')`,
        [email, username, passwordHash]
      )
      return createJSONResponse({ status: 'success', message: 'Admin registered' }, 201)
    })
  } catch (error) {
    logger.error('Admin register error:', error)
    return createErrorResponse('Failed to register admin', 500)
  }
}

async function handleGetCourses(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    return await withDb(env, async client => {
      const coursesResult = await client.query(
        `
        SELECT c.*, 
          (SELECT COUNT(*) FROM user_progress WHERE course_id = c.id) as enrollment_count,
          (SELECT COUNT(*) FROM tests WHERE course_id = c.id) as test_count
        FROM courses c ORDER BY c.created_at DESC LIMIT $1 OFFSET $2
      `,
        [limit, offset]
      )

      const countResult = await client.query('SELECT COUNT(*) FROM courses')
      const total = parseInt(countResult.rows[0].count)

      return createJSONResponse({
        status: 'success',
        data: {
          courses: coursesResult.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      })
    })
  } catch (error) {
    logger.error('Get courses error:', error)
    return createErrorResponse('Failed to fetch courses', 500)
  }
}

async function handleGetCourseAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const [popular, byCategory] = await Promise.all([
        client.query(`
          SELECT c.id, c.title, c.category, COUNT(p.user_id) as enrollments
          FROM courses c LEFT JOIN user_progress p ON c.id = p.course_id
          GROUP BY c.id ORDER BY enrollments DESC LIMIT 10
        `),
        client.query('SELECT category, COUNT(*) FROM courses GROUP BY category'),
      ])

      return createJSONResponse({
        status: 'success',
        data: { popular: popular.rows, byCategory: byCategory.rows },
      })
    })
  } catch (error) {
    logger.error('Get course analytics error:', error)
    return createErrorResponse('Failed to fetch course analytics', 500)
  }
}
