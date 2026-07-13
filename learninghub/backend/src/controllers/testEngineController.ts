import { Request, Response } from 'express'
import { testEngineService } from '../services/TestEngineService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError } from '../utils/responseHelper'

/**
 * POST /api/v1/tests/:id/practice/answer
 * Submit a single answer in practice mode with instant feedback.
 */
export const practiceAnswer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string
  const { question_id, selected_option_id } = req.body

  if (!question_id || !selected_option_id) {
    sendValidationError(res, 'question_id and selected_option_id are required')
    return
  }

  const result = await testEngineService.submitPracticeAnswer({
    userId,
    testId,
    questionId: question_id,
    selectedOptionId: selected_option_id,
  })

  sendSuccess(res, result)
})

/**
 * GET /api/v1/tests/:id/questions
 * Get test questions (shuffled for practice mode).
 */
export const getTestQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string

  const questions = await testEngineService.getTestQuestions(testId, userId)

  sendSuccess(res, { questions, count: questions.length })
})

/**
 * GET /api/v1/tests/:id/adaptive-next
 * Get the optimal next question for an adaptive test based on real-time IRT ability theta.
 */
export const getNextAdaptiveTestQuestion = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const testId = req.params.id as string
    const answeredParam = req.query.answered as string | undefined

    const answeredQuestionIds = answeredParam
      ? answeredParam
          .split(',')
          .map(id => id.trim())
          .filter(Boolean)
      : []

    const nextQuestion = await testEngineService.getNextAdaptiveTestQuestion(
      testId,
      userId,
      answeredQuestionIds
    )

    sendSuccess(res, { question: nextQuestion, hasMore: !!nextQuestion })
  }
)

/**
 * GET /api/v1/tests/analytics
 * Get comprehensive test analytics for the user.
 */
export const getTestAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const analytics = await testEngineService.getTestAnalytics(userId)
  sendSuccess(res, analytics)
})

/**
 * GET /api/v1/tests/attempts/history
 * Get paginated attempt history with filtering.
 */
export const getAttemptHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { test_id, mode, status, page, limit } = req.query

    const history = await testEngineService.getAttemptHistory(userId, {
      testId: test_id as string,
      mode: mode as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })

    sendSuccess(res, history)
  }
)

/**
 * GET /api/v1/tests/:id/time
 * Get remaining time for an active test.
 */
export const getTimeRemaining = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const testId = req.params.id as string

  const time = await testEngineService.validateTimeRemaining(userId, testId)

  sendSuccess(res, time)
})
