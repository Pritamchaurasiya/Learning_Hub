import { Router } from 'express'
import { authenticate, authorizeAdmin } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { redisCacheMiddleware as cacheMiddleware } from '../../middleware/redisCacheMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { examContentController } from '../../controllers/examContentController'
import { createPYQSchema, getExamsSchema, getSubjectsSchema } from '../../validations/schemas'

const router = Router()

const examContentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'exam-content',
})

router.get('/pyqs', cacheMiddleware(600), examContentLimiter, examContentController.getPYQs)
router.get('/pyqs/:id', cacheMiddleware(600), examContentLimiter, examContentController.getPYQById)
router.post(
  '/pyqs',
  authenticate,
  authorizeAdmin,
  validate(createPYQSchema),
  examContentController.createPYQ
)
router.get('/formulas', cacheMiddleware(600), examContentLimiter, examContentController.getFormulas)
router.get(
  '/revision-notes',
  cacheMiddleware(600),
  examContentLimiter,
  examContentController.getRevisionNotes
)

// Countries, exams and subjects selection routes
router.get('/countries', cacheMiddleware(600), examContentController.getCountries)
router.get('/exams', cacheMiddleware(600), validate(getExamsSchema), examContentController.getExams)
router.get(
  '/exams/:examId/subjects',
  cacheMiddleware(600),
  validate(getSubjectsSchema),
  examContentController.getSubjects
)

export default router
