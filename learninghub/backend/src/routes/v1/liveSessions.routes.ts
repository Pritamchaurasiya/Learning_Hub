import { Router } from 'express'
import {
  listSessions,
  getSession,
  joinSession,
  registerSession,
} from '../../controllers/liveSessionsController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listSessions)
router.get('/:id', optionalAuth, getSession)
router.post('/:id/join', optionalAuth, joinSession)
router.post('/:id/register', optionalAuth, registerSession)

export default router
