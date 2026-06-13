import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { requireInstructorOrAdmin } from '../../middleware/roleMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import {
  listLiveSessions,
  createLiveSession,
  joinLiveSession,
} from '../../controllers/liveClassController'
import { createLiveSessionSchema } from '../../validations/schemas'

const router = Router()

router.get('/', cacheMiddleware(60), listLiveSessions)
router.post(
  '/',
  authenticate,
  requireInstructorOrAdmin,
  validate(createLiveSessionSchema),
  createLiveSession
)
router.post('/:id/join', authenticate, joinLiveSession)

export default router
