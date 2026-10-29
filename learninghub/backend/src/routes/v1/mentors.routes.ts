import { Router } from 'express'
import {
  listMentors,
  getMentor,
  getMySessions,
  bookSession,
  getMentorAvailability,
  cancelSession,
} from '../../controllers/mentorsController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listMentors)
router.get('/sessions/my-sessions', optionalAuth, getMySessions)
router.post('/sessions/:id/cancel', optionalAuth, cancelSession)
router.get('/:id/availability', optionalAuth, getMentorAvailability)
router.get('/:id', optionalAuth, getMentor)
router.post('/book', authenticate, bookSession)
router.post('/:id/book', authenticate, bookSession)

export default router
