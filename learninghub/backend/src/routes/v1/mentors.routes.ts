import { Router } from 'express'
import {
  listMentors,
  getMentor,
  getMySessions,
  bookSession,
} from '../../controllers/mentorsController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listMentors)
router.get('/sessions/my-sessions', optionalAuth, getMySessions)
router.get('/:id', optionalAuth, getMentor)
router.post('/book', authenticate, bookSession)
router.post('/:id/book', authenticate, bookSession)

export default router
