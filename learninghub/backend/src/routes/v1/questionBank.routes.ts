import { Router } from 'express'
import {
  importQuestions,
  validateQuestion,
  exportQuestions,
  getQuestionBankStats,
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reviewQuestion,
} from '../../controllers/questionBankController'
import { authenticate, authorizeInstructor } from '../../middleware/authMiddleware'

/**
 * Question Bank Routes
 */

const router = Router()

// All Question Bank admin/instructor endpoints require authentication and instructor/admin privileges
router.use(authenticate, authorizeInstructor)

// Collection routes
router.get('/questions', listQuestions)
router.post('/questions', createQuestion)

// Single question routes
router.get('/questions/:id', getQuestion)
router.put('/questions/:id', updateQuestion)
router.delete('/questions/:id', deleteQuestion)
router.post('/questions/:id/review', reviewQuestion)

// Bulk import & export
router.post('/import', importQuestions)
router.post('/validate', validateQuestion)
router.get('/export', exportQuestions)
router.get('/stats', getQuestionBankStats)

export default router

