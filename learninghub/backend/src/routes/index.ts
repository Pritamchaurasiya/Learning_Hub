import { Router, Request, Response, NextFunction } from 'express'

import authRoutes from './v1/auth.routes'
import testsRoutes from './v1/tests.routes'
import questionBankRoutes from './v1/questionBank.routes'
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
import coursesRoutes from './v1/courses.routes'
import discussionsRoutes from './v1/discussions.routes'
import studyPlannerRoutes from './v1/studyPlanner.routes'
import studyGoalsRoutes from './v1/studyGoals.routes'
import liveSessionsRoutes from './v1/liveSessions.routes'
import mentorsRoutes from './v1/mentors.routes'
import subscriptionsRoutes from './v1/subscriptions.routes'
import certificatesRoutes from './v1/certificates.routes'
import credentialsRoutes from './v1/credentials.routes'
import contestsRoutes from './v1/contests.routes'
import cartRoutes from './v1/cart.routes'
import downloadsRoutes from './v1/downloads.routes'
import web3Routes from './v1/web3.routes'
import usersRoutes from './v1/users.routes'
import ebooksRoutes from './v1/ebooks.routes'
import jobsRoutes from './jobs'
import metricsRoutes from './metrics'
import searchRoutes from './v1/search.routes'

import { authenticate, optionalAuth } from '../middleware/authMiddleware'
import { asyncHandler } from '../utils/errorHandler'
import { searchService, SearchParams } from '../services/SearchService'
import { courseService } from '../services/CourseService'
import { sendSuccess } from '../utils/responseHelper'
import { createRateLimiter } from '../middleware/rateLimiter'
import { requestLogger, responseCompression, bodySizeLimiter } from '../middleware/requestLogger'

const router = Router()

const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'search',
})

// API versioning middleware
const apiVersion = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-API-Version', '1.0.0')
  res.setHeader('X-Powered-By', 'LearningHub')
  next()
}

// Response time header
const responseTimeHeader = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()
  const originalEnd = res.end
  res.end = function (this: any, ...args: any[]): any {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${Date.now() - start}ms`)
    }
    return (originalEnd as any).apply(this, args)
  } as any
  next()
}

// Apply global middleware
router.use(apiVersion)
router.use(responseTimeHeader)
router.use(responseCompression)
router.use(bodySizeLimiter(10 * 1024 * 1024)) // 10MB limit

// Mount all v1 routes under /api/v1 prefix
router.use('/auth', authRoutes)
router.use('/tests', testsRoutes)
router.use('/question-bank', questionBankRoutes)
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
router.use('/discussions', discussionsRoutes)
router.use('/study-planner', studyPlannerRoutes)
router.use('/study-goals', studyGoalsRoutes)
router.use('/live-sessions', liveSessionsRoutes)
router.use('/mentors', mentorsRoutes)
router.use('/subscriptions', subscriptionsRoutes)
router.use('/certificates', certificatesRoutes)
router.use('/credentials', credentialsRoutes)
router.use('/contests', contestsRoutes)
router.use('/commerce/cart', cartRoutes)
router.use('/cart', (req, res) => {
  res.redirect(301, req.originalUrl.replace('/cart', '/commerce/cart'))
})
router.use('/payments', cartRoutes)
router.use('/badges', gamificationRoutes)
router.use('/downloads', downloadsRoutes)
router.use('/ebooks', ebooksRoutes)
router.use('/web3', web3Routes)
router.use('/users', usersRoutes)
router.use('/jobs', jobsRoutes)
router.use('/prometheus', metricsRoutes)
router.use('/search', searchRoutes)

// Health check
import { healthCheck, livenessProbe, readinessProbe } from '../monitoring/healthCheck'
router.get('/health', healthCheck)
router.get('/health/live', livenessProbe)
router.get('/health/ready', readinessProbe)

export default router
