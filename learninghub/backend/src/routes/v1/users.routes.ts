import { Router } from 'express'
import { getBookmarks, addBookmark, removeBookmark } from '../../controllers/usersController'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/bookmarks', authenticate, getBookmarks)
router.post('/bookmarks', authenticate, addBookmark)
router.delete('/bookmarks/:id', authenticate, removeBookmark)

export default router
