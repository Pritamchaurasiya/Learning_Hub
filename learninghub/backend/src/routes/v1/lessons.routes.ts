import { Router } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import {
  getCourseLessons,
  getLesson,
  getCourseProgress,
  updateLessonProgress,
  completeLesson,
  getLessonNotes,
  saveLessonNotes,
  getNextLesson,
  getPreviousLesson,
} from '../../controllers/lessonsController'
import {
  updateLessonProgressSchema,
  completeLessonSchema,
  saveLessonNotesSchema,
} from '../../validations/schemas'

const router = Router()

const lessonMutationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'lesson-mutation',
})

router.get('/:courseId/lessons', cacheMiddleware(300), optionalAuth, getCourseLessons)
router.get('/:courseId/lessons/:lessonId', cacheMiddleware(300), optionalAuth, getLesson)
router.get('/:courseId/progress', authenticate, getCourseProgress)
router.put(
  '/:courseId/lessons/:lessonId/progress',
  authenticate,
  lessonMutationLimiter,
  validate(updateLessonProgressSchema),
  updateLessonProgress
)
router.post(
  '/:courseId/lessons/:lessonId/complete',
  authenticate,
  lessonMutationLimiter,
  validate(completeLessonSchema),
  completeLesson
)
router.get('/:courseId/lessons/:lessonId/notes', authenticate, getLessonNotes)
router.put(
  '/:courseId/lessons/:lessonId/notes',
  authenticate,
  lessonMutationLimiter,
  validate(saveLessonNotesSchema),
  saveLessonNotes
)
router.get('/:courseId/lessons/:lessonId/next', authenticate, getNextLesson)
router.get('/:courseId/lessons/:lessonId/previous', authenticate, getPreviousLesson)

export default router
