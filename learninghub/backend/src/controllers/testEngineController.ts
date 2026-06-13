import { Request, Response } from 'express'
import logger from '../utils/logger'
import { testEngineService } from '../services/TestEngineService'
import {
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendError,
  sendInternalError,
} from '../utils/responseHelper'

/**
 * POST /api/v1/tests/:id/practice/answer
 * Submit a single answer in practice mode with instant feedback.
 */
export const practiceAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string
    const { question_id, selected_option_id } = req.body

    if (!userId) {
      sendUnauthorized(res)
      return
    }

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
  } catch (error) {
    logger.error(
      '[TestsController] practiceAnswer error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    sendError(res, error instanceof Error ? error.message : 'Internal server error', 500)
  }
}

/**
 * GET /api/v1/tests/:id/questions
 * Get test questions (shuffled for practice mode).
 */
export const getTestQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const questions = await testEngineService.getTestQuestions(testId, userId)

    sendSuccess(res, { questions, count: questions.length })
  } catch (error) {
    logger.error(
      '[TestsController] getTestQuestions error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id }
    )
    sendError(res, error instanceof Error ? error.message : 'Internal server error', 500)
  }
}

/**
 * GET /api/v1/tests/analytics
 * Get comprehensive test analytics for the user.
 */
export const getTestAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const analytics = await testEngineService.getTestAnalytics(userId)

    sendSuccess(res, analytics)
  } catch (error) {
    logger.error(
      '[TestsController] getTestAnalytics error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/tests/attempts/history
 * Get paginated attempt history with filtering.
 */
export const getAttemptHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const { test_id, mode, status, page, limit } = req.query

    const history = await testEngineService.getAttemptHistory(userId, {
      testId: test_id as string,
      mode: mode as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })

    sendSuccess(res, history)
  } catch (error) {
    logger.error(
      '[TestsController] getAttemptHistory error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/tests/:id/time
 * Get remaining time for an active test.
 */
export const getTimeRemaining = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const testId = req.params.id as string

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const time = await testEngineService.validateTimeRemaining(userId, testId)

    sendSuccess(res, time)
  } catch (error) {
    logger.error(
      '[TestsController] getTimeRemaining error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id }
    )
    sendInternalError(res)
  }
}
