import { Client } from '@neondatabase/serverless'
import { verifyToken } from '../utils/jwt'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { Env } from '../types'

/**
 * Admin routes handler
 * All routes require admin authentication
 */
export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // Verify admin access
  const authResult = await verifyAdminAccess(request, env)
  if (authResult) return authResult

  // Users management
  if (path === '/admin/users' && method === 'GET') {
    return handleGetUsers(request, env)
  }

  if (path.match(/^\/admin\/users\/[^\/]+$/) && method === 'GET') {
    const userId = path.split('/')[3]
    return handleGetUserDetails(request, env, userId)
  }

  if (path.match(/^\/admin\/users\/[^\/]+$/) && method === 'PUT') {
    const userId = path.split('/')[3]
    return handleUpdateUser(request, env, userId)
  }

  if (path.match(/^\/admin\/users\/[^\/]+$/) && method === 'DELETE') {
    const userId = path.split('/')[3]
    return handleDeleteUser(request, env, userId)
  }

  // Courses management
  if (path === '/admin/courses' && method === 'POST') {
    return handleCreateCourse(request, env)
  }

  if (path.match(/^\/admin\/courses\/[^\/]+$/) && method === 'PUT') {
    const courseId = path.split('/')[3]
    return handleUpdateCourse(request, env, courseId)
  }

  if (path.match(/^\/admin\/courses\/[^\/]+$/) && method === 'DELETE') {
    const courseId = path.split('/')[3]
    return handleDeleteCourse(request, env, courseId)
  }

  // Analytics
  if (path === '/admin/analytics' && method === 'GET') {
    return handleGetAnalytics(request, env)
  }

  if (path === '/admin/analytics/users' && method === 'GET') {
    return handleGetUserAnalytics(request, env)
  }

  if (path === '/admin/analytics/courses' && method === 'GET') {
    return handleGetCourseAnalytics(request, env)
  }

  return createErrorResponse('Admin endpoint not found', 404)
}

/**
 * Verify admin access
 */
async function verifyAdminAccess(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Unauthorized', 401)
  }

  const token = authHeader.split(' ')[1]
  const payload = await verifyToken(token, env.JWT_SECRET)

  if (!payload || payload.role !== 'admin') {
    return createErrorResponse('Forbidden - Admin access required', 403)
  }

  return null
}

/**
 * Get all users (paginated)
 */
async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const usersResult = await client.query(
      `SELECT id, email, username, role, xp, level, streak, created_at, is_active
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const countResult = await client.query('SELECT COUNT(*) FROM users')
    const total = parseInt(countResult.rows[0].count)

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: {
        users: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get users error:', error)
    return createErrorResponse('Failed to fetch users', 500)
  }
}

/**
 * Get single user details
 */
async function handleGetUserDetails(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const userResult = await client.query(
      `SELECT id, email, username, role, xp, level, streak, bio, location, website, created_at, is_active
       FROM users
       WHERE id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('User not found', 404)
    }

    // Get user's course progress
    const progressResult = await client.query(
      `SELECT 
        c.id, c.title, p.progress, p.started_at, p.last_accessed_at
       FROM user_progress p
       JOIN courses c ON p.course_id = c.id
       WHERE p.user_id = $1`,
      [userId]
    )

    // Get user's test results
    const resultsResult = await client.query(
      `SELECT 
        t.title, tr.score, tr.completed_at, tr.passed
       FROM test_results tr
       JOIN tests t ON tr.test_id = t.id
       WHERE tr.user_id = $1
       ORDER BY tr.completed_at DESC`,
      [userId]
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: {
        user: userResult.rows[0],
        progress: progressResult.rows,
        testResults: resultsResult.rows,
      },
    })
  } catch (error) {
    console.error('Get user details error:', error)
    return createErrorResponse('Failed to fetch user details', 500)
  }
}

/**
 * Update user (role, is_active, etc.)
 */
async function handleUpdateUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json()
    const { role, is_active, username } = body

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`)
      values.push(role)
      paramIndex++
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(is_active)
      paramIndex++
    }

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`)
      values.push(username)
      paramIndex++
    }

    if (updates.length === 0) {
      await client.end()
      return createErrorResponse('No fields to update', 400)
    }

    values.push(userId)

    await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)

    await client.end()

    return createJSONResponse({
      status: 'success',
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Update user error:', error)
    return createErrorResponse('Failed to update user', 500)
  }
}

/**
 * Delete user
 */
async function handleDeleteUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    await client.query('DELETE FROM users WHERE id = $1', [userId])

    await client.end()

    return createJSONResponse({
      status: 'success',
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return createErrorResponse('Failed to delete user', 500)
  }
}

/**
 * Create new course
 */
async function handleCreateCourse(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const {
      title,
      description,
      shortDescription,
      phase,
      duration,
      difficulty,
      category,
      content,
      thumbnail,
      instructorName,
      instructorBio,
      price,
      originalPrice,
      prerequisites,
      whatYouWillLearn,
    } = body

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const result = await client.query(
      `INSERT INTO courses (
        id, title, description, short_description, phase, duration,
        difficulty, category, content, thumbnail, instructor_name,
        instructor_bio, price, original_price, prerequisites, what_you_will_learn,
        published, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW(), NOW()
      ) RETURNING *`,
      [
        title,
        description,
        shortDescription,
        phase,
        duration,
        difficulty,
        category,
        content,
        thumbnail,
        instructorName,
        instructorBio,
        price,
        originalPrice,
        JSON.stringify(prerequisites),
        JSON.stringify(whatYouWillLearn),
      ]
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('Create course error:', error)
    return createErrorResponse('Failed to create course', 500)
  }
}

/**
 * Update course
 */
async function handleUpdateCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const body = await request.json()
    const { title, description, phase, difficulty, category, content, price, published } = body

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (title) {
      updates.push(`title = $${paramIndex++}`)
      values.push(title)
    }
    if (description) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (phase) {
      updates.push(`phase = $${paramIndex++}`)
      values.push(phase)
    }
    if (difficulty) {
      updates.push(`difficulty = $${paramIndex++}`)
      values.push(difficulty)
    }
    if (category) {
      updates.push(`category = $${paramIndex++}`)
      values.push(category)
    }
    if (content) {
      updates.push(`content = $${paramIndex++}`)
      values.push(content)
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`)
      values.push(price)
    }
    if (published !== undefined) {
      updates.push(`published = $${paramIndex++}`)
      values.push(published)
    }

    updates.push(`updated_at = NOW()`)
    values.push(courseId)

    await client.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)

    await client.end()

    return createJSONResponse({
      status: 'success',
      message: 'Course updated successfully',
    })
  } catch (error) {
    console.error('Update course error:', error)
    return createErrorResponse('Failed to update course', 500)
  }
}

/**
 * Delete course
 */
async function handleDeleteCourse(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    await client.query('DELETE FROM courses WHERE id = $1', [courseId])

    await client.end()

    return createJSONResponse({
      status: 'success',
      message: 'Course deleted successfully',
    })
  } catch (error) {
    console.error('Delete course error:', error)
    return createErrorResponse('Failed to delete course', 500)
  }
}

/**
 * Get platform analytics
 */
async function handleGetAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Get counts
    const usersCount = await client.query('SELECT COUNT(*) FROM users')
    const coursesCount = await client.query('SELECT COUNT(*) FROM courses')
    const testsCount = await client.query('SELECT COUNT(*) FROM tests')
    const enrollmentsCount = await client.query('SELECT COUNT(*) FROM user_progress')
    const completionsCount = await client.query('SELECT COUNT(*) FROM test_results')

    // Get recent signups (last 30 days)
    const recentUsers = await client.query(
      `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`
    )

    await client.end()

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
  } catch (error) {
    console.error('Get analytics error:', error)
    return createErrorResponse('Failed to fetch analytics', 500)
  }
}

/**
 * Get user analytics
 */
async function handleGetUserAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Active users by role
    const byRole = await client.query(`SELECT role, COUNT(*) FROM users GROUP BY role`)

    // User growth over last 7 days
    const growth = await client.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM users
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date`
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: {
        byRole: byRole.rows,
        growth: growth.rows,
      },
    })
  } catch (error) {
    console.error('Get user analytics error:', error)
    return createErrorResponse('Failed to fetch user analytics', 500)
  }
}

/**
 * Get course analytics
 */
async function handleGetCourseAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Most popular courses by enrollment
    const popular = await client.query(
      `SELECT 
        c.id, c.title, c.category,
        COUNT(p.user_id) as enrollments
       FROM courses c
       LEFT JOIN user_progress p ON c.id = p.course_id
       GROUP BY c.id
       ORDER BY enrollments DESC
       LIMIT 10`
    )

    // Courses by category
    const byCategory = await client.query(
      `SELECT category, COUNT(*) FROM courses GROUP BY category`
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: {
        popular: popular.rows,
        byCategory: byCategory.rows,
      },
    })
  } catch (error) {
    console.error('Get course analytics error:', error)
    return createErrorResponse('Failed to fetch course analytics', 500)
  }
}
