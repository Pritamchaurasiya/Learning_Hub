import { Request, Response } from 'express'
// prisma reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { testEngineService } from '../services/TestEngineService'

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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    if (!question_id || !selected_option_id) {
      res
        .status(400)
        .json({ status: 'error', message: 'question_id and selected_option_id are required' })
      return
    }

    const result = await testEngineService.submitPracticeAnswer({
      userId,
      testId,
      questionId: question_id,
      selectedOptionId: selected_option_id,
    })

    res.json({ status: 'success', data: result })
  } catch (error) {
    logger.error(
      '[TestsController] practiceAnswer error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id, userId: req.user?.userId }
    )
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const questions = await testEngineService.getTestQuestions(testId, userId)

    res.json({ status: 'success', data: { questions, count: questions.length } })
  } catch (error) {
    logger.error(
      '[TestsController] getTestQuestions error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id }
    )
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const analytics = await testEngineService.getTestAnalytics(userId)

    res.json({ status: 'success', data: analytics })
  } catch (error) {
    logger.error(
      '[TestsController] getTestAnalytics error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

    res.json({ status: 'success', data: history })
  } catch (error) {
    logger.error(
      '[TestsController] getAttemptHistory error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const time = await testEngineService.validateTimeRemaining(userId, testId)

    res.json({ status: 'success', data: time })
  } catch (error) {
    logger.error(
      '[TestsController] getTimeRemaining error',
      error instanceof Error ? error : new Error(String(error)),
      { testId: req.params.id }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
