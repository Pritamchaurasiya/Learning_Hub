import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import {
  bookmarkQuestion,
  getBookmarkedQuestions,
  removeBookmark,
} from '../../controllers/questionBookmarksController'

const router = Router()

router.get('/', authenticate, getBookmarkedQuestions)
router.post('/', authenticate, bookmarkQuestion)
router.delete('/:questionId', authenticate, removeBookmark)

export default router
