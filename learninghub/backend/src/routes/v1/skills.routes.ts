import { Router } from 'express'
import { optionalAuth } from '../../middleware/authMiddleware'
import {
  getSkillGraph,
  recordSkillInteraction,
  getNextBestAction,
} from '../../controllers/skillsController'

const router = Router()

// GET /api/v1/skills/graph
router.get('/graph', optionalAuth, getSkillGraph)

// POST /api/v1/skills/interaction
router.post('/interaction', optionalAuth, recordSkillInteraction)

// GET /api/v1/skills/next-action
router.get('/next-action', optionalAuth, getNextBestAction)

export default router
