import { Request, Response } from 'express'
import logger from '../utils/logger'
import { testEngineService } from '../services/TestEngineService'

/**
 * POST /api/v1/questions/bookmarks
 * Bookmark a question for later review.
 */
export const bookmarkQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { question_id, notes } = req.body

    if (!question_id) {
      res.status(400).json({ status: 'error', message: 'question_id is required' })
      return
    }

    const bookmark = await testEngineService.bookmarkQuestion(userId, question_id, notes)

    res.status(201).json({ status: 'success', data: bookmark })
  } catch (error) {
    if (error instanceof Error && error.message === 'Question already bookmarked') {
      res.status(409).json({ status: 'error', message: error.message })
      return
    }
    logger.error(
      '[QuestionBookmarks] bookmarkQuestion error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const bookmarks = await testEngineService.getBookmarkedQuestions(userId)

    res.json({ status: 'success', data: { bookmarks, count: bookmarks.length } })
  } catch (error) {
    logger.error(
      '[QuestionBookmarks] getBookmarkedQuestions error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    await testEngineService.removeBookmark(userId, questionId)

    res.json({ status: 'success', message: 'Bookmark removed' })
  } catch (error) {
    logger.error(
      '[QuestionBookmarks] removeBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, questionId: req.params.questionId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
