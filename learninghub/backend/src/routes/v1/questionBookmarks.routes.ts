import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { bookmarkQuestionSchema, removeBookmarkSchema } from '../../validations/schemas'
import {
  bookmarkQuestion,
  getBookmarkedQuestions,
  removeBookmark,
} from '../../controllers/questionBookmarksController'

const router = Router()

router.get('/', authenticate, getBookmarkedQuestions)
router.post('/', authenticate, validate(bookmarkQuestionSchema), bookmarkQuestion)
router.delete('/:questionId', authenticate, validate(removeBookmarkSchema), removeBookmark)

export default router
