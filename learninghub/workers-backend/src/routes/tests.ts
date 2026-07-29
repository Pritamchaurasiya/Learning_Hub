import { z } from 'zod'
import { logger } from '../utils/logger'
import { PASSING_SCORE } from '../constants'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { withDb } from '../db/connection'
import { requireUser } from '../utils/authHelper'
import { Env } from '../types'

const submitSchema = z.object({
  answers: z.record(z.string()),
  attempt_id: z.string().optional(),
  timeTaken: z.number().optional(),
})

export async function handleTests(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') return new Response(null, { status: 204 })

  if (path === '/tests' && method === 'GET') return handleListTests(request, env)
  if (path === '/tests/my-results' && method === 'GET') return handleGetMyResults(request, env)
  if (path === '/tests/attempts' && method === 'GET') return handleGetAllAttempts(request, env)

  const startMatch = path.match(/^\/tests\/([^/]+)\/start$/)
  if (startMatch && method === 'POST') return handleStartTest(request, env, startMatch[1])

  const autosaveMatch = path.match(/^\/tests\/([^/]+)\/autosave$/)
  if (autosaveMatch && method === 'POST') return handleAutosave(request, env, autosaveMatch[1])

  const submitMatch = path.match(/^\/tests\/([^/]+)\/submit$/)
  if (submitMatch && method === 'POST') return handleSubmitTest(request, env, submitMatch[1])

  const resultsMatch = path.match(/^\/tests\/([^/]+)\/results$/)
  if (resultsMatch && method === 'GET') return handleGetResults(request, env, resultsMatch[1])

  const resultMatch = path.match(/^\/tests\/([^/]+)\/result$/)
  if (resultMatch && method === 'GET') return handleGetResult(request, env, resultMatch[1])

  const attemptsMatch = path.match(/^\/tests\/([^/]+)\/attempts$/)
  if (attemptsMatch && method === 'GET') return handleGetAttempts(request, env, attemptsMatch[1])

  const attemptDetailMatch = path.match(/^\/tests\/attempts\/([^/]+)$/)
  if (attemptDetailMatch && method === 'GET')
    return handleGetAttemptDetail(request, env, attemptDetailMatch[1])

  const testIdMatch = path.match(/^\/tests\/([^/]+)$/)
  if (testIdMatch && method === 'GET') return handleGetTest(request, env, testIdMatch[1])

  return createErrorResponse('Not found', 404)
}

async function handleStartTest(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const testResult = await client.query(
        `SELECT id, title, time_limit_minutes, total_questions FROM tests WHERE id = $1`,
        [testId]
      )
      if (testResult.rows.length === 0) return createErrorResponse('Test not found', 404)

      const attemptId = crypto.randomUUID()
      await client.query(
        `INSERT INTO test_attempts (id, user_id, test_id, status, started_at)
         VALUES ($1, $2, $3, 'in_progress', NOW())`,
        [attemptId, user.userId, testId]
      )

      const questionsResult = await client.query(
        `SELECT id, question_text as text, question_type as type, options, points as marks
         FROM questions WHERE test_id = $1 ORDER BY order_index`,
        [testId]
      )

      return createJSONResponse({
        status: 'success',
        data: {
          attempt_id: attemptId,
          id: attemptId,
          questions: questionsResult.rows,
          time_limit: testResult.rows[0].time_limit_minutes,
        },
      })
    })
  } catch (error) {
    logger.error('Start test error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleAutosave(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = (await request.json()) as any
    const { answers } = body
    if (!answers) return createErrorResponse('Answers required', 400)

    return await withDb(env, async client => {
      const existingAttempt = await client.query(
        `SELECT id FROM test_attempts WHERE user_id = $1 AND test_id = $2 AND status = 'in_progress'`,
        [user.userId, testId]
      )

      if (existingAttempt.rows.length > 0) {
        await client.query(
          `UPDATE test_attempts SET answers = $1, last_autosaved_at = NOW() WHERE id = $2`,
          [JSON.stringify(answers), existingAttempt.rows[0].id]
        )
      }

      return createJSONResponse({ status: 'success', data: { saved: true } })
    })
  } catch (error) {
    logger.error('Autosave error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetAllAttempts(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const [results, xpResult] = await Promise.all([
        client.query(
          `SELECT ta.id, ta.test_id, t.title as test_title, ta.status,
                  ta.score, ta.total_marks, ta.percentage, ta.passed,
                  ta.time_taken_seconds, ta.started_at, ta.submitted_at
           FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
           WHERE ta.user_id = $1 ORDER BY ta.started_at DESC`,
          [user.userId]
        ),
        client.query(
          `SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM test_attempts WHERE user_id = $1`,
          [user.userId]
        ),
      ])

      return createJSONResponse({
        status: 'success',
        data: { results: results.rows, totalXp: parseInt(xpResult.rows[0].total_xp) },
      })
    })
  } catch (error) {
    logger.error('Get all attempts error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleListTests(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')

    return await withDb(env, async client => {
      let query = `SELECT t.*, c.title as course_title FROM tests t LEFT JOIN courses c ON t.course_id = c.id WHERE 1=1`
      const params: unknown[] = []
      if (courseId) {
        query += ' AND t.course_id = $1'
        params.push(courseId)
      }
      query += ' ORDER BY t.created_at DESC'

      const result = await client.query(query, params)
      return createJSONResponse({ tests: result.rows })
    })
  } catch (error) {
    logger.error('List tests error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetTest(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    return await withDb(env, async client => {
      const testResult = await client.query(
        `SELECT t.*, c.title as course_title FROM tests t LEFT JOIN courses c ON t.course_id = c.id WHERE t.id = $1`,
        [testId]
      )
      if (testResult.rows.length === 0) return createErrorResponse('Test not found', 404)

      const test = testResult.rows[0]
      let showAnswers = false

      const { user } = await requireUser(request, env)
      if (user) {
        const resultCheck = await client.query(
          'SELECT id FROM test_results WHERE user_id = $1 AND test_id = $2',
          [user.userId, testId]
        )
        showAnswers = resultCheck.rows.length > 0
      }

      const questionsQuery = showAnswers
        ? `SELECT id, question_text, question_type, options, correct_answer, explanation, points, order_index FROM questions WHERE test_id = $1 ORDER BY order_index`
        : `SELECT id, question_text, question_type, options, points, order_index FROM questions WHERE test_id = $1 ORDER BY order_index`

      const questionsResult = await client.query(questionsQuery, [testId])
      test.questions = questionsResult.rows

      return createJSONResponse({ test })
    })
  } catch (error) {
    logger.error('Get test error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleSubmitTest(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error: authError } = await requireUser(request, env)
    if (authError) return authError

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) return createErrorResponse(`Invalid input: ${parsed.error.message}`)

    const { answers, attempt_id: attemptId, timeTaken } = parsed.data

    return await withDb(env, async client => {
      const questionsResult = await client.query(
        `SELECT id, correct_answer, points FROM questions WHERE test_id = $1`,
        [testId]
      )
      if (questionsResult.rows.length === 0)
        return createErrorResponse('Test has no questions', 400)

      let score = 0
      let totalPossible = 0
      const answerDetails: Array<{
        questionId: string
        correct: boolean
        userAnswer: string | null
        correctAnswer: string
      }> = []

      for (const q of questionsResult.rows) {
        totalPossible += q.points
        const userAns = answers[q.id]
        const isCorrect =
          Boolean(userAns) &&
          String(userAns).toLowerCase() === String(q.correct_answer).toLowerCase()
        if (isCorrect) score += q.points
        answerDetails.push({
          questionId: q.id,
          correct: isCorrect,
          userAnswer: userAns || null,
          correctAnswer: q.correct_answer,
        })
      }

      const percentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0
      const passed = percentage >= PASSING_SCORE
      const xpEarned = Math.floor(score / 10)

      if (attemptId) {
        await client.query(
          `UPDATE test_attempts SET status = 'submitted', score = $1, total_marks = $2, percentage = $3,
           passed = $4, time_taken_seconds = $5, xp_earned = $6, answers = $7, submitted_at = NOW()
           WHERE id = $8 AND user_id = $9`,
          [
            score,
            totalPossible,
            percentage,
            passed,
            timeTaken || 0,
            xpEarned,
            JSON.stringify(answerDetails),
            attemptId,
            user.userId,
          ]
        )
      } else {
        const existingResult = await client.query(
          'SELECT id FROM test_results WHERE user_id = $1 AND test_id = $2',
          [user.userId, testId]
        )
        if (existingResult.rows.length > 0) {
          await client.query(
            `UPDATE test_results SET score = $1, total_possible = $2, percentage = $3, answers = $4 WHERE user_id = $5 AND test_id = $6`,
            [score, totalPossible, percentage, JSON.stringify(answerDetails), user.userId, testId]
          )
        } else {
          await client.query(
            `INSERT INTO test_results (user_id, test_id, score, total_possible, percentage, answers) VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.userId, testId, score, totalPossible, percentage, JSON.stringify(answerDetails)]
          )
        }
      }

      await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [xpEarned, user.userId])

      return createJSONResponse({
        status: 'success',
        data: {
          score,
          totalPossible,
          percentage,
          passed,
          time_taken: timeTaken || 0,
          xpEarned,
          correct_count: answerDetails.filter(a => a.correct).length,
          incorrect_count: answerDetails.filter(a => !a.correct).length,
          answers: answerDetails,
        },
        message: 'Test submitted successfully',
      })
    })
  } catch (error) {
    logger.error('Submit test error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetResult(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const result = await client.query(
        `SELECT ta.*, t.title as test_title, t.time_limit_minutes
         FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
         WHERE ta.user_id = $1 AND ta.test_id = $2
         ORDER BY ta.submitted_at DESC LIMIT 1`,
        [user.userId, testId]
      )
      if (result.rows.length === 0) return createErrorResponse('No results found', 404)
      return createJSONResponse({ status: 'success', data: result.rows[0] })
    })
  } catch (error) {
    logger.error('Get result error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetAttemptDetail(
  request: Request,
  env: Env,
  attemptId: string
): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const result = await client.query(
        `SELECT ta.*, t.title as test_title FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
         WHERE ta.id = $1 AND ta.user_id = $2`,
        [attemptId, user.userId]
      )
      if (result.rows.length === 0) return createErrorResponse('Attempt not found', 404)
      return createJSONResponse({ status: 'success', data: result.rows[0] })
    })
  } catch (error) {
    logger.error('Get attempt detail error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetResults(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const result = await client.query(
        `SELECT tr.*, t.title as test_title, t.total_questions
         FROM test_results tr JOIN tests t ON tr.test_id = t.id
         WHERE tr.user_id = $1 AND tr.test_id = $2`,
        [user.userId, testId]
      )
      if (result.rows.length === 0) return createErrorResponse('No results found', 404)

      const questionsResult = await client.query(
        `SELECT id, question_text, question_type, options, correct_answer, explanation, points
         FROM questions WHERE test_id = $1 ORDER BY order_index`,
        [testId]
      )

      const response = result.rows[0]
      response.questions = questionsResult.rows
      return createJSONResponse({ result: response })
    })
  } catch (error) {
    logger.error('Get results error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetAttempts(request: Request, env: Env, testId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const attemptsResult = await client.query(
        `SELECT tr.id, tr.score, tr.completed_at as "completedAt", tr.time_taken as "timeTaken",
                tr.passed, tr.xp_earned as "xpEarned", tr.attempts
         FROM test_results tr WHERE tr.test_id = $1 AND tr.user_id = $2
         ORDER BY tr.completed_at DESC`,
        [testId, user.userId]
      )
      return createJSONResponse({ status: 'success', data: attemptsResult.rows })
    })
  } catch (error) {
    logger.error('Get attempts error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetMyResults(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const [results, xpResult] = await Promise.all([
        client.query(
          `SELECT tr.id, tr.test_id as "testId", t.title as "testTitle",
                  tr.score, tr.completed_at as "completedAt", tr.time_taken as "timeTaken",
                  tr.passed, tr.xp_earned as "xpEarned"
           FROM test_results tr JOIN tests t ON tr.test_id = t.id
           WHERE tr.user_id = $1 ORDER BY tr.completed_at DESC`,
          [user.userId]
        ),
        client.query(
          `SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM test_results WHERE user_id = $1`,
          [user.userId]
        ),
      ])

      return createJSONResponse({
        status: 'success',
        data: { results: results.rows, totalXp: parseInt(xpResult.rows[0].total_xp) },
      })
    })
  } catch (error) {
    logger.error('Get my results error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
