import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/roleMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import {
  listContests,
  getContest,
  createContest,
  joinContest,
  submitContestSolution,
  getContestLeaderboard,
  getContestResults,
  updateContestStatus,
} from '../../controllers/contestsController'

const router = Router()

router.get('/', cacheMiddleware(60), listContests)
router.get('/:id', cacheMiddleware(30), getContest)
router.post('/', authenticate, requireAdmin, createContest)
router.post('/join', authenticate, joinContest)
router.post('/submit', authenticate, submitContestSolution)
router.get('/:id/leaderboard', cacheMiddleware(30), getContestLeaderboard)
router.get('/:id/results', authenticate, getContestResults)
router.patch('/:id/status', authenticate, requireAdmin, updateContestStatus)

export default router
