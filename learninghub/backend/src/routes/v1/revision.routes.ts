import { Router } from 'express'
import { optionalAuth } from '../../middleware/authMiddleware'
import {
  getDailyDeck,
  submitReview,
  createCustomCard,
  generateCards,
  getRetentionStats,
} from '../../controllers/revisionController'

const router = Router()

// GET /api/v1/revision/deck
router.get('/deck', optionalAuth, getDailyDeck)

// POST /api/v1/revision/deck
router.post('/deck', optionalAuth, createCustomCard)

// POST /api/v1/revision/review
router.post('/review', optionalAuth, submitReview)

// POST /api/v1/revision/generate
router.post('/generate', optionalAuth, generateCards)

// GET /api/v1/revision/stats
router.get('/stats', optionalAuth, getRetentionStats)

export default router
