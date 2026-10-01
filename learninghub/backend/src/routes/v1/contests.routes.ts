import { Router } from 'express'
import {
  listContests,
  getContest,
  getLeaderboard,
  registerContest,
  getContestResults,
  logProctorEvent,
  getTimeSync,
} from '../../controllers/contestsController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const contestLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: 'contest-req',
})

// Static sub-paths first to prevent shadow by /:id
router.get('/time/sync', getTimeSync)

router.get('/', optionalAuth, contestLimiter, listContests)
router.get('/:id', optionalAuth, contestLimiter, getContest)
router.get('/:id/leaderboard', optionalAuth, contestLimiter, getLeaderboard)
router.get('/:id/results', optionalAuth, contestLimiter, getContestResults)
router.post('/:id/register', authenticate, contestLimiter, registerContest)
router.post('/:id/proctor-event', optionalAuth, contestLimiter, logProctorEvent)

export default router
