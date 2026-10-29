import { Router } from 'express'
import {
  listAssignments,
  getAssignment,
  submitReview,
  disputeReview,
} from '../../controllers/peerReviewController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/assignments', optionalAuth, listAssignments)
router.get('/all', optionalAuth, listAssignments)
router.get('/pending', optionalAuth, (req, res, next) => {
  req.query.status = 'pending'
  return listAssignments(req, res, next)
})
router.get('/completed', optionalAuth, (req, res, next) => {
  req.query.status = 'submitted'
  return listAssignments(req, res, next)
})
router.get('/feedback', optionalAuth, (req, res, next) => {
  req.query.status = 'submitted'
  return listAssignments(req, res, next)
})
router.post('/submit', optionalAuth, submitReview)
router.get('/:id', optionalAuth, getAssignment)
router.post('/:id/submit', optionalAuth, submitReview)
router.post('/:id/dispute', optionalAuth, disputeReview)

export default router
