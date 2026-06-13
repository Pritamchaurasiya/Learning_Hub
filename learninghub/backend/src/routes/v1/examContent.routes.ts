import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/roleMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { examContentController } from '../../controllers/examContentController'

const router = Router()

router.get('/pyqs', cacheMiddleware(600), examContentController.getPYQs)
router.get('/pyqs/:id', cacheMiddleware(600), examContentController.getPYQById)
router.post('/pyqs', authenticate, requireAdmin, examContentController.createPYQ)
router.get('/formulas', cacheMiddleware(600), examContentController.getFormulas)
router.get('/revision-notes', cacheMiddleware(600), examContentController.getRevisionNotes)

export default router
