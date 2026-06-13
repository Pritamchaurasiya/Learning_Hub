import { Request, Response } from 'express'
import logger from '../utils/logger'
import { testEngineService } from '../services/TestEngineService'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendConflict,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

/**
 * POST /api/v1/questions/bookmarks
 * Bookmark a question for later review.
 */
export const bookmarkQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const { question_id, notes } = req.body

    if (!question_id) {
      sendValidationError(res, 'question_id is required')
      return
    }

    const bookmark = await testEngineService.bookmarkQuestion(userId, question_id, notes)

    sendCreated(res, bookmark)
  } catch (error) {
    if (error instanceof Error && error.message === 'Question already bookmarked') {
      sendConflict(res, error.message)
      return
    }
    logger.error(
      '[QuestionBookmarks] bookmarkQuestion error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/questions/bookmarks
 * Get user's bookmarked questions.
 */
export const getBookmarkedQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const bookmarks = await testEngineService.getBookmarkedQuestions(userId)

    sendSuccess(res, { bookmarks, count: bookmarks.length })
  } catch (error) {
    logger.error(
      '[QuestionBookmarks] getBookmarkedQuestions error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * DELETE /api/v1/questions/bookmarks/:questionId
 * Remove a question bookmark.
 */
export const removeBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const questionId = req.params.questionId as string

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    await testEngineService.removeBookmark(userId, questionId)

    sendSuccess(res, null, 'Bookmark removed')
  } catch (error) {
    logger.error(
      '[QuestionBookmarks] removeBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, questionId: req.params.questionId }
    )
    sendInternalError(res)
  }
}
