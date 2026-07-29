import { Router, Request, Response } from 'express'

import authRoutes from './v1/auth.routes'
import testsRoutes from './v1/tests.routes'
import questionBookmarksRoutes from './v1/questionBookmarks.routes'
import analyticsRoutes from './v1/analytics.routes'
import adminRoutes from './v1/admin.routes'
import notificationsRoutes from './v1/notifications.routes'
import examContentRoutes from './v1/examContent.routes'
import aiRoutes from './v1/ai.routes'
import gamificationRoutes from './v1/gamification.routes'
import monitoringRoutes from './v1/monitoring.routes'
import mediaRoutes from './v1/media.routes'
import userAnalyticsRoutes from './v1/userAnalytics.routes'
import recommendationsRoutes from './v1/recommendations.routes'
import abTestingRoutes from './v1/abTesting.routes'
import problemsRoutes from './v1/problems.routes'
import { authenticate } from '../middleware/authMiddleware'
import { asyncHandler } from '../utils/errorHandler'
import { searchService, SearchParams } from '../services/SearchService'
import { courseService } from '../services/CourseService'
import { sendSuccess } from '../utils/responseHelper'
import { createRateLimiter } from '../middleware/rateLimiter'
import coursesRoutes from './v1/courses.routes'
import jobsRoutes from './jobs'
import metricsRoutes from './metrics'

const router = Router()

const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'search',
})

// Mount all v1 routes under /api/v1 prefix
router.use('/auth', authRoutes)
router.use('/tests', testsRoutes)
router.use('/question-bookmarks', questionBookmarksRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/admin', adminRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/exam-content', examContentRoutes)
router.use('/ai', aiRoutes)
router.use('/gamification', gamificationRoutes)
router.use('/monitoring', monitoringRoutes)
router.use('/media', mediaRoutes)
router.use('/user-analytics', userAnalyticsRoutes)
router.use('/recommendations', recommendationsRoutes)
router.use('/ab-testing', abTestingRoutes)
router.use('/problems', problemsRoutes)
router.use('/courses', coursesRoutes)
router.use('/jobs', jobsRoutes)
router.use('/prometheus', metricsRoutes)

// Search routes
router.get(
  '/search',
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const results = await searchService.search(req.query as unknown as SearchParams)
    sendSuccess(res, results.data, undefined, 200, results.meta)
  })
)

router.get(
  '/search/suggestions',
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const suggestions = await searchService.getSuggestions(q)
    sendSuccess(res, suggestions)
  })
)

router.get(
  '/courses/:id/progress',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const progress = await courseService.getProgress(req.user!.userId, id)
    sendSuccess(res, progress)
  })
)

router.post(
  '/courses/:id/progress',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id : ''
    const result = await courseService.updateProgress(req.user!.userId, id, req.body.progress)
    sendSuccess(res, result, 'Progress updated')
  })
)

// Health check
import { healthCheck, livenessProbe, readinessProbe } from '../monitoring/healthCheck'
import { optionalAuth } from '../middleware/authMiddleware'
router.get('/health', optionalAuth, healthCheck)
router.get('/health/live', livenessProbe)
router.get('/health/ready', readinessProbe)
router.get('/healthz', livenessProbe)

export default router
