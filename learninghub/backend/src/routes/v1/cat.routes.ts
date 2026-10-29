import { Router } from 'express'
import {
  startCatSession,
  submitCatAnswer,
  getCatSessionState,
  getCatDiagnosticScorecard,
  getCatItemBankStats,
  getCatItemBankItems,
} from '../../controllers/catController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/stats', optionalAuth, getCatItemBankStats)
router.get('/item-bank', optionalAuth, getCatItemBankItems)
router.post('/session/start', optionalAuth, startCatSession)
router.post('/session/submit', optionalAuth, submitCatAnswer)
router.get('/session/:sessionId', optionalAuth, getCatSessionState)
router.get('/session/:sessionId/scorecard', optionalAuth, getCatDiagnosticScorecard)

export default router
