import { Router } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  listCourses,
  getCourseDetails,
  enrollInCourse,
  updateCourseProgress,
} from '../../controllers/coursesController'
import {
  getCourseReviews as getCourseReviewsImpl,
  createCourseReview,
  markReviewHelpful,
} from '../../controllers/courseReviewsController'
import { enrollCourseSchema, updateProgressSchema } from '../../validations/schemas'

const router = Router()

const courseMutationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: 'course-mutation',
})

router.get('/', cacheMiddleware(600), optionalAuth, listCourses)
router.get('/:id', cacheMiddleware(300), optionalAuth, getCourseDetails)
router.get('/:id/reviews', cacheMiddleware(300), getCourseReviewsImpl)
router.post('/:id/reviews', authenticate, courseMutationLimiter, createCourseReview)
router.put(
  '/:courseId/reviews/:reviewId/helpful',
  authenticate,
  courseMutationLimiter,
  markReviewHelpful
)
router.post(
  '/enroll',
  authenticate,
  courseMutationLimiter,
  validate(enrollCourseSchema),
  enrollInCourse
)
router.put(
  '/progress',
  authenticate,
  courseMutationLimiter,
  validate(updateProgressSchema),
  updateCourseProgress
)

export default router
