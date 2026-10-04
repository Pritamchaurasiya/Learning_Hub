import { Router } from 'express'
import { optionalAuth } from '../../middleware/authMiddleware'
import {
  getLearningPaths,
  getLearningPath,
  enrollInPath,
  getMyProgress,
} from '../../controllers/learningPathsController'

const router = Router()

// GET /api/v1/learning-paths/my-progress (must come before /:id)
router.get('/my-progress', optionalAuth, getMyProgress)

// GET /api/v1/learning-paths/
router.get('/', optionalAuth, getLearningPaths)

// GET /api/v1/learning-paths/:id
router.get('/:id', optionalAuth, getLearningPath)

// POST /api/v1/learning-paths/:id/enroll
router.post('/:id/enroll', optionalAuth, enrollInPath)

export default router
