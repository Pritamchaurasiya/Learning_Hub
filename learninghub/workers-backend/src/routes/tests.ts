import { z } from 'zod'
import { Client } from '@neondatabase/serverless'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { verifyToken } from '../middleware/auth'
import { Env } from '../types'

// Validation schemas
const submitSchema = z.object({
  answers: z.record(z.string()), // questionId -> answer
})

const testQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .optional()
    .default('10'),
})

const testIdSchema = z.string().uuid()

export async function handleTests(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  const testIdMatch = path.match(/^\/tests\/([^\/]+)$/)
  const submitMatch = path.match(/^\/tests\/([^\/]+)\/submit$/)
  const resultsMatch = path.match(/^\/tests\/([^\/]+)\/results$/)
  const attemptsMatch = path.match(/^\/tests\/([^\/]+)\/attempts$/)
  const myResultsMatch = path === '/tests/my-results'

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // List tests
  if (path === '/tests' && method === 'GET') {
    return handleListTests(request, env)
  }

  // Get test with questions
  if (testIdMatch && method === 'GET' && !path.includes('/submit') && !path.includes('/results')) {
    const testId = testIdMatch[1]
    return handleGetTest(request, env, testId)
  }

  // Submit test
  if (submitMatch && method === 'POST') {
    const testId = submitMatch[1]
    return handleSubmitTest(request, env, testId)
  }

  // Get test results
  if (resultsMatch && method === 'GET') {
    const testId = resultsMatch[1]
    return handleGetResults(request, env, testId)
  }

  // Get attempts for a test
  if (attemptsMatch && method === 'GET') {
    const testId = attemptsMatch[1]
    return handleGetAttempts(request, env, testId)
  }

  // Get my results across all tests
  if (myResultsMatch && method === 'GET') {
    return handleGetMyResults(request, env)
  }

  return createErrorResponse('Not found', 404)
}

async function handleListTests(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    let query = `
      SELECT t.*, c.title as course_title
      FROM tests t
      LEFT JOIN courses c ON t.course_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (courseId) {
      query += ' AND t.course_id = $1'
      params.push(courseId)
    }

    query += ' ORDER BY t.created_at DESC'

    const result = await client.query(query, params)
    await client.end()

    return createJSONResponse({ tests: result.rows })
  } catch (error) {
    console.error('List tests error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetTest(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Get test info
    const testResult = await client.query(
      `SELECT t.*, c.title as course_title
       FROM tests t
       LEFT JOIN courses c ON t.course_id = c.id
       WHERE t.id = $1`,
      [testId]
    )

    if (testResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('Test not found', 404)
    }

    const test = testResult.rows[0]

    // Get questions (without correct answers for quiz mode)
    const authHeader = request.headers.get('Authorization')
    let showAnswers = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = await verifyToken(token, env.JWT_SECRET)

      // Check if user has already taken this test
      if (payload) {
        const resultCheck = await client.query(
          'SELECT id FROM test_results WHERE user_id = $1 AND test_id = $2',
          [payload.userId, testId]
        )
        showAnswers = resultCheck.rows.length > 0
      }
    }

    const questionsQuery = showAnswers
      ? `SELECT id, question_text, question_type, options, correct_answer, explanation, points, order_index 
         FROM questions WHERE test_id = $1 ORDER BY order_index`
      : `SELECT id, question_text, question_type, options, points, order_index 
         FROM questions WHERE test_id = $1 ORDER BY order_index`

    const questionsResult = await client.query(questionsQuery, [testId])
    test.questions = questionsResult.rows

    await client.end()

    return createJSONResponse({ test })
  } catch (error) {
    console.error('Get test error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleSubmitTest(request: Request, env: Env, testId: string): Promise<Response> {
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
    const result = submitSchema.safeParse(body)

    if (!result.success) {
      return createErrorResponse('Invalid input: ' + result.error.message)
    }

    const { answers } = result.data
    const userId = payload.userId

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    // Get test questions with correct answers
    const questionsResult = await client.query(
      `SELECT id, correct_answer, points 
       FROM questions WHERE test_id = $1`,
      [testId]
    )

    if (questionsResult.rows.length === 0) {
      await client.end()
      return createErrorResponse('Test has no questions', 400)
    }

    // Calculate score
    let score = 0
    let totalPossible = 0
    const answerDetails = []

    for (const question of questionsResult.rows) {
      totalPossible += question.points
      const userAnswer = answers[question.id]
      const isCorrect =
        userAnswer &&
        userAnswer.toString().toLowerCase() === question.correct_answer.toString().toLowerCase()

      if (isCorrect) {
        score += question.points
      }

      answerDetails.push({
        questionId: question.id,
        correct: isCorrect,
        userAnswer: userAnswer || null,
        correctAnswer: question.correct_answer,
      })
    }

    const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0

    // Check if already submitted
    const existingResult = await client.query(
      'SELECT id FROM test_results WHERE user_id = $1 AND test_id = $2',
      [userId, testId]
    )

    if (existingResult.rows.length > 0) {
      // Update existing result
      await client.query(
        `UPDATE test_results 
         SET score = $1, total_possible = $2, percentage = $3, answers = $4
         WHERE user_id = $5 AND test_id = $6`,
        [score, totalPossible, percentage, JSON.stringify(answerDetails), userId, testId]
      )
    } else {
      // Create new result
      await client.query(
        `INSERT INTO test_results (user_id, test_id, score, total_possible, percentage, answers)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, testId, score, totalPossible, percentage, JSON.stringify(answerDetails)]
      )
    }

    // Add XP for completing quiz
    const xpEarned = Math.floor(score / 10)
    await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [xpEarned, userId])

    await client.end()

    return createJSONResponse({
      score,
      totalPossible,
      percentage,
      xpEarned,
      answers: answerDetails,
      message: 'Test submitted successfully',
    })
  } catch (error) {
    console.error('Submit test error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetResults(request: Request, env: Env, testId: string): Promise<Response> {
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

    // Get result
    const result = await client.query(
      `SELECT tr.*, t.title as test_title, t.total_questions
       FROM test_results tr
       JOIN tests t ON tr.test_id = t.id
       WHERE tr.user_id = $1 AND tr.test_id = $2`,
      [payload.userId, testId]
    )

    if (result.rows.length === 0) {
      await client.end()
      return createErrorResponse('No results found', 404)
    }

    // Get questions with answers for review
    const questionsResult = await client.query(
      `SELECT id, question_text, question_type, options, correct_answer, explanation, points
       FROM questions WHERE test_id = $1 ORDER BY order_index`,
      [testId]
    )

    await client.end()

    const response = result.rows[0]
    response.questions = questionsResult.rows

    return createJSONResponse({ result: response })
  } catch (error) {
    console.error('Get results error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetAttempts(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = await verifyToken(token, env.JWT_SECRET)
    if (!payload) {
      return createErrorResponse('Invalid token', 401)
    }

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const attemptsResult = await client.query(
      `SELECT 
        tr.id,
        tr.score,
        tr.completed_at as "completedAt",
        tr.time_taken as "timeTaken",
        tr.passed,
        tr.xp_earned as "xpEarned",
        tr.attempts
       FROM test_results tr
       WHERE tr.test_id = $1 AND tr.user_id = $2
       ORDER BY tr.completed_at DESC`,
      [testId, payload.userId]
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: attemptsResult.rows,
    })
  } catch (error) {
    console.error('Get attempts error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetMyResults(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = await verifyToken(token, env.JWT_SECRET)
    if (!payload) {
      return createErrorResponse('Invalid token', 401)
    }

    const client = new Client(env.DATABASE_URL)
    await client.connect()

    const results = await client.query(
      `SELECT 
        tr.id,
        tr.test_id as "testId",
        t.title as "testTitle",
        tr.score,
        tr.completed_at as "completedAt",
        tr.time_taken as "timeTaken",
        tr.passed,
        tr.xp_earned as "xpEarned"
       FROM test_results tr
       JOIN tests t ON tr.test_id = t.id
       WHERE tr.user_id = $1
       ORDER BY tr.completed_at DESC`,
      [payload.userId]
    )

    const xpResult = await client.query(
      `SELECT COALESCE(SUM(xp_earned), 0) as total_xp
       FROM test_results 
       WHERE user_id = $1`,
      [payload.userId]
    )

    await client.end()

    return createJSONResponse({
      status: 'success',
      data: {
        results: results.rows,
        totalXp: parseInt(xpResult.rows[0].total_xp),
      },
    })
  } catch (error) {
    console.error('Get my results error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
