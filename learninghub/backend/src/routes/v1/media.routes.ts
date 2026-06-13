import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/authMiddleware'
import { mediaService } from '../../services/MediaService'
import {
  uploadAvatar,
  uploadCourseThumbnail,
  uploadGenericMedia,
} from '../../controllers/mediaController'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const uploadRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'media-upload',
  message: 'Too many upload requests. Please try again later.',
})

router.use(authenticate)
router.use(uploadRateLimit)

// User avatar upload
router.post('/avatar', mediaService.single('file'), uploadAvatar)

// Course thumbnail (Admin/Instructor only)
router.post(
  '/course-thumbnail',
  authorize('ADMIN', 'INSTRUCTOR'),
  mediaService.single('file'),
  uploadCourseThumbnail
)

// Generic media upload
router.post('/generic', mediaService.single('file'), uploadGenericMedia)

export default router
