import { Request, Response } from 'express'
import { testEngineService } from '../services/TestEngineService'
import { asyncHandler } from '../utils/errorHandler'
import {
  sendSuccess,
  sendCreated,
  sendConflict,
  sendValidationError,
} from '../utils/responseHelper'

/**
 * POST /api/v1/questions/bookmarks
 * Bookmark a question for later review.
 */
export const bookmarkQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { question_id, notes } = req.body

  if (!question_id) {
    sendValidationError(res, 'question_id is required')
    return
  }

  try {
    const bookmark = await testEngineService.bookmarkQuestion(userId, question_id, notes)
    sendCreated(res, bookmark)
  } catch (error) {
    if (error instanceof Error && error.message === 'Question already bookmarked') {
      sendConflict(res, error.message)
      return
    }
    throw error
  }
})

/**
 * GET /api/v1/questions/bookmarks
 * Get user's bookmarked questions.
 */
export const getBookmarkedQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const bookmarks = await testEngineService.getBookmarkedQuestions(userId)
    sendSuccess(res, { bookmarks, count: bookmarks.length })
  }
)

/**
 * DELETE /api/v1/questions/bookmarks/:questionId
 * Remove a question bookmark.
 */
export const removeBookmark = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const questionId = req.params.questionId as string

  await testEngineService.removeBookmark(userId, questionId)

  sendSuccess(res, null, 'Bookmark removed')
})
