import { Router } from 'express'
import { ebooksController } from '../../controllers/ebooksController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const aiEbookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'AI request limit exceeded. Please wait a moment.',
})

router.get('/', ebooksController.getEbooks)
router.get('/:id', ebooksController.getEbookById)
router.get('/:id/chapters', ebooksController.getChapters)
router.get('/:id/chapters/:chapterId', ebooksController.getChapterById)
router.get('/:id/highlights', optionalAuth, ebooksController.getHighlights)
router.post('/:id/highlights', authenticate, ebooksController.saveHighlight)
router.delete('/:id/highlights/:highlightId', authenticate, ebooksController.deleteHighlight)
router.post('/:id/progress', optionalAuth, ebooksController.saveProgress)
router.post('/summarize-ai', authenticate, aiEbookLimiter, ebooksController.summarizeChapterAI)
router.post('/explain-ai', authenticate, aiEbookLimiter, ebooksController.explainParagraphAI)

export default router
