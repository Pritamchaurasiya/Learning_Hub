import { Router } from 'express'

import authRoutes from './v1/auth.routes'
import coursesRoutes from './v1/courses.routes'
import lessonsRoutes from './v1/lessons.routes'
import testsRoutes from './v1/tests.routes'
import progressRoutes from './v1/progress.routes'
import bookmarksRoutes from './v1/bookmarks.routes'
import questionBookmarksRoutes from './v1/questionBookmarks.routes'
import analyticsRoutes from './v1/analytics.routes'
import adminRoutes from './v1/admin.routes'
import web3Routes from './v1/web3.routes'
import notificationsRoutes from './v1/notifications.routes'
import examContentRoutes from './v1/examContent.routes'
import subscriptionsRoutes from './v1/subscriptions.routes'
import aiRoutes from './v1/ai.routes'
import gamificationRoutes from './v1/gamification.routes'
import searchRoutes from './v1/search.routes'
import problemsRoutes from './v1/problems.routes'
import liveSessionsRoutes from './v1/liveSessions.routes'
import contestsRoutes from './v1/contests.routes'
import paymentsRoutes from './v1/payments.routes'
import monitoringRoutes from './v1/monitoring.routes'
import commerceRoutes from './v1/commerce.routes'
import mediaRoutes from './v1/media.routes'
import userAnalyticsRoutes from './v1/userAnalytics.routes'
import recommendationsRoutes from './v1/recommendations.routes'

const router = Router()

// Mount all v1 routes under /api/v1 prefix
router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/courses', lessonsRoutes)
router.use('/tests', testsRoutes)
router.use('/progress', progressRoutes)
router.use('/users/bookmarks', bookmarksRoutes)
router.use('/questions/bookmarks', questionBookmarksRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/admin', adminRoutes)
router.use('/web3', web3Routes)
router.use('/notifications', notificationsRoutes)
router.use('/exam-content', examContentRoutes)
router.use('/subscriptions', subscriptionsRoutes)
router.use('/ai', aiRoutes)
router.use('/gamification', gamificationRoutes)
router.use('/search', searchRoutes)
router.use('/problems', problemsRoutes)
router.use('/live-sessions', liveSessionsRoutes)
router.use('/contests', contestsRoutes)
router.use('/payments', paymentsRoutes)
router.use('/monitoring', monitoringRoutes)
router.use('/commerce/cart', commerceRoutes)
router.use('/media', mediaRoutes)

// Core Engine routes
router.use('/user-analytics', userAnalyticsRoutes)
router.use('/recommendations', recommendationsRoutes)

// Health check
import { healthCheck, livenessProbe, readinessProbe } from '../monitoring/healthCheck'
router.get('/health', healthCheck)
router.get('/health/live', livenessProbe)
router.get('/health/ready', readinessProbe)
router.get('/healthz', livenessProbe) // Kubernetes-friendly alias

// Public metrics endpoint for Prometheus scraping
import { register } from '../utils/metrics'
router.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType)
  const metrics = await register.metrics()
  res.send(metrics)
})

export default router
