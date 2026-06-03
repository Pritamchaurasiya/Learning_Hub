import { Router } from 'express'
import { authenticate, optionalAuth } from '../middleware/authMiddleware'
import { cacheMiddleware } from '../middleware/cacheMiddleware'
import { validate } from '../middleware/validationMiddleware'
import { requireAdmin, requireInstructorOrAdmin } from '../middleware/roleMiddleware'
import { checkUsageLimit } from '../middleware/subscriptionMiddleware'
import { createRateLimiter } from '../middleware/rateLimiter'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  enrollCourseSchema,
  updateProgressSchema,
  submitTestSchema,
  createLiveSessionSchema,
  submitProblemSchema,
  updateDailyGoalSchema,
  completeCourseSchema,
  bookmarkSchema,
  adminLoginSchema,
  adminRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/schemas'

// Controllers
import {
  register,
  login,
  refresh,
  me,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAccount,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/authController'
import {
  listCourses,
  getCourseDetails,
  enrollInCourse,
  updateCourseProgress,
} from '../controllers/coursesController'
import {
  getCourseReviews as getCourseReviewsImpl,
  createCourseReview,
  markReviewHelpful,
} from '../controllers/courseReviewsController'
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
} from '../controllers/lessonsController'
import {
  listTests,
  getTestDetails,
  startTest,
  autosaveTest,
  submitTest,
  getTestAttempts,
  getTestResults,
  getTestAttemptDetails,
} from '../controllers/testsController'
import {
  practiceAnswer,
  getTestQuestions,
  getTestAnalytics,
  getAttemptHistory,
  getTimeRemaining,
} from '../controllers/testEngineController'
import {
  getPerformanceTrend,
  getWeakAreas,
  getLearnerDashboardStats,
  getLearningActivity,
} from '../controllers/analyticsController'
import {
  bookmarkQuestion,
  getBookmarkedQuestions,
  removeBookmark,
} from '../controllers/questionBookmarksController'
import { completeCourse, updateStreak, toggleBookmark } from '../controllers/progressController'
import {
  getLeaderboard,
  getAchievements,
  updateDailyGoal,
  getDsaStats,
} from '../controllers/gamificationController'
import { getBookmarks, createBookmark, deleteBookmark } from '../controllers/bookmarksController'
import {
  listProblems,
  getProblemDetails,
  submitProblemSolution,
  getProblemSubmissions,
} from '../controllers/problemsController'
import { globalSearch, suggestions, trending } from '../controllers/searchController'
import {
  analyzeLearningPath,
  getTutorResponse,
  generatePracticeTest,
  generateWeakAreaTest,
  getWeakTopics,
  generateCourse,
} from '../controllers/aiController'
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getSystemStatus,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAnalytics,
  getUserAnalytics,
  getCourseAnalytics,
  getAuditLogs,
  getSecurityEvents,
} from '../controllers/adminController'
import { adminLogin, adminRegister } from '../controllers/adminAuthController'
import {
  listLiveSessions,
  createLiveSession,
  joinLiveSession,
} from '../controllers/liveClassController'
import {
  listContests,
  getContest,
  createContest,
  joinContest,
  submitContestSolution,
  getContestLeaderboard,
  getContestResults,
  updateContestStatus,
} from '../controllers/contestsController'
import { createOrder, applyCoupon } from '../controllers/paymentsController'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationsController'
import { examContentController } from '../controllers/examContentController'
import {
  deepHealthCheck,
  getMetrics,
  getDatabaseStatus,
  getCacheStatus,
  getProcesses,
} from '../controllers/monitoringController'
import {
  getTiers,
  getMySubscription,
  createSubscription,
  cancelSubscription,
  validateCoupon,
} from '../controllers/subscriptionsController'

const router = Router()

// ==================== AUTH ROUTES ====================
const passwordResetRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyPrefix: 'password-reset',
  message: 'Too many password reset attempts. Please try again later.',
})
router.post('/auth/register', validate(registerSchema), register)
router.post('/auth/login', validate(loginSchema), login)
router.post('/auth/logout', authenticate, logout)
router.post('/auth/refresh', validate(refreshSchema), refresh)
router.get('/auth/me', authenticate, me)
router.put('/auth/profile', authenticate, updateProfile)
router.post('/auth/change-password', authenticate, changePassword)
router.post('/auth/avatar', authenticate, uploadAvatar)
router.delete('/auth/delete-account', authenticate, deleteAccount)
router.post('/auth/send-verification', authenticate, sendVerificationEmail)
router.get('/auth/verify-email/:token', verifyEmail)
router.post('/auth/forgot-password', passwordResetRateLimit, validate(forgotPasswordSchema), forgotPassword)
router.post('/auth/reset-password', passwordResetRateLimit, validate(resetPasswordSchema), resetPassword)

// ==================== ADMIN AUTH ====================
router.post('/admin/auth/login', validate(adminLoginSchema), adminLogin)
// First admin registration: uses ADMIN_SECRET only (no prior admin auth needed)
router.post('/admin/auth/register/initial', validate(adminRegisterSchema), adminRegister)
// Subsequent admin registration: requires existing admin authentication
router.post(
  '/admin/auth/register',
  authenticate,
  requireAdmin,
  validate(adminRegisterSchema),
  adminRegister
)

// ==================== COURSE ROUTES ====================
router.get('/courses', cacheMiddleware(600), optionalAuth, listCourses)
router.get('/courses/:id', cacheMiddleware(300), optionalAuth, getCourseDetails)
router.get('/courses/:id/reviews', cacheMiddleware(300), getCourseReviewsImpl)
router.post('/courses/:id/reviews', authenticate, createCourseReview)
router.put('/courses/:courseId/reviews/:reviewId/helpful', authenticate, markReviewHelpful)
router.post('/courses/enroll', authenticate, validate(enrollCourseSchema), enrollInCourse)
router.put('/courses/progress', authenticate, validate(updateProgressSchema), updateCourseProgress)

// Admin course management
router.get('/admin/courses', authenticate, requireAdmin, getAdminCourses)
router.post('/admin/courses', authenticate, requireAdmin, createCourse)
router.put('/admin/courses/:id', authenticate, requireAdmin, updateCourse)
router.delete('/admin/courses/:id', authenticate, requireAdmin, deleteCourse)

// ==================== LESSON ROUTES ====================
router.get('/courses/:courseId/lessons', cacheMiddleware(300), optionalAuth, getCourseLessons)
router.get('/courses/:courseId/lessons/:lessonId', cacheMiddleware(300), optionalAuth, getLesson)
router.get('/courses/:courseId/progress', authenticate, getCourseProgress)
router.put('/courses/:courseId/lessons/:lessonId/progress', authenticate, updateLessonProgress)
router.post('/courses/:courseId/lessons/:lessonId/complete', authenticate, completeLesson)
router.get('/courses/:courseId/lessons/:lessonId/notes', authenticate, getLessonNotes)
router.put('/courses/:courseId/lessons/:lessonId/notes', authenticate, saveLessonNotes)
router.get('/courses/:courseId/lessons/:lessonId/next', authenticate, getNextLesson)
router.get('/courses/:courseId/lessons/:lessonId/previous', authenticate, getPreviousLesson)

// ==================== TEST ENGINE ROUTES ====================
// IMPORTANT: Static paths MUST come before parameterized /:id routes
router.get('/tests', cacheMiddleware(300), optionalAuth, listTests)
// Static sub-paths first (before /:id which would shadow them)
router.get('/tests/attempts', authenticate, getTestAttempts)
router.get('/tests/attempts/history', authenticate, getAttemptHistory)
router.get('/tests/analytics', authenticate, getTestAnalytics)
router.get('/tests/my-results', authenticate, getTestAttempts) // alias used by quizService
// Parameterized routes after static ones
router.get('/tests/:id', cacheMiddleware(300), optionalAuth, getTestDetails)
router.get('/tests/:id/questions', authenticate, getTestQuestions)
router.get('/tests/:id/time', authenticate, getTimeRemaining)
router.post('/tests/:id/start', authenticate, startTest)
router.post('/tests/:id/autosave', authenticate, autosaveTest)
router.post('/tests/:id/submit', authenticate, validate(submitTestSchema), submitTest)
router.post('/tests/:id/practice/answer', authenticate, practiceAnswer)
router.get('/tests/:id/result', authenticate, getTestResults)
router.get('/tests/attempts/:id', authenticate, getTestAttemptDetails)

// ==================== PROGRESS ROUTES ====================
router.post(
  '/progress/complete-course',
  authenticate,
  validate(completeCourseSchema),
  completeCourse
)
router.post('/progress/update-streak', authenticate, updateStreak)
router.post('/progress/bookmark', authenticate, validate(bookmarkSchema), toggleBookmark)

// ==================== BOOKMARK ROUTES ====================
router.get('/users/bookmarks', authenticate, getBookmarks)
router.post('/users/bookmarks', authenticate, createBookmark)
router.delete('/users/bookmarks/:courseId', authenticate, deleteBookmark)

// ==================== QUESTION BOOKMARK ROUTES ====================
router.get('/questions/bookmarks', authenticate, getBookmarkedQuestions)
router.post('/questions/bookmarks', authenticate, bookmarkQuestion)
router.delete('/questions/bookmarks/:questionId', authenticate, removeBookmark)

// ==================== GAMIFICATION ROUTES ====================
router.get('/gamification/leaderboard', cacheMiddleware(300), getLeaderboard)
router.get('/gamification/achievements', authenticate, getAchievements)
router.put(
  '/gamification/daily-goal',
  authenticate,
  validate(updateDailyGoalSchema),
  updateDailyGoal
)
router.get('/gamification/dsa-stats', authenticate, getDsaStats)

// ==================== PROBLEMS (DSA) ROUTES ====================
router.get('/problems', cacheMiddleware(300), listProblems)
router.get('/problems/:slug', cacheMiddleware(300), getProblemDetails)
router.get('/problems/:id/submissions', authenticate, getProblemSubmissions)
router.post(
  '/problems/:id/submit',
  authenticate,
  createRateLimiter({
    windowMs: 10 * 1000, // 10 seconds
    max: 2, // Maximum 2 requests per 10 seconds per IP/User
    keyPrefix: 'sandbox',
    message: 'Too many code execution requests. Please wait a few seconds before trying again.',
  }),
  validate(submitProblemSchema),
  submitProblemSolution
)

// ==================== SEARCH ROUTES ====================
router.get('/search', authenticate, globalSearch)
router.get('/search/suggestions', authenticate, suggestions)
router.get('/search/trending', cacheMiddleware(600), trending)

// ==================== AI ROUTES ====================
router.post('/ai/learning-path', authenticate, analyzeLearningPath)
router.post('/ai/tutor', authenticate, getTutorResponse)
router.post(
  '/ai/generate-test',
  authenticate,
  checkUsageLimit('aiGenerations'),
  generatePracticeTest
)
router.post(
  '/ai/generate-weak-area-test',
  authenticate,
  checkUsageLimit('aiGenerations'),
  generateWeakAreaTest
)
router.get('/ai/weak-topics', authenticate, getWeakTopics)

// ==================== EXAM CONTENT ROUTES ====================
router.get('/exam-content/pyqs', cacheMiddleware(600), examContentController.getPYQs)
router.get('/exam-content/pyqs/:id', cacheMiddleware(600), examContentController.getPYQById)
router.post('/exam-content/pyqs', authenticate, requireAdmin, examContentController.createPYQ)
router.get('/exam-content/formulas', cacheMiddleware(600), examContentController.getFormulas)
router.get(
  '/exam-content/revision-notes',
  cacheMiddleware(600),
  examContentController.getRevisionNotes
)

// ==================== LIVE CLASS ROUTES ====================
router.get('/live-sessions', cacheMiddleware(60), listLiveSessions)
router.post(
  '/live-sessions',
  authenticate,
  requireInstructorOrAdmin,
  validate(createLiveSessionSchema),
  createLiveSession
)
router.post('/live-sessions/:id/join', authenticate, joinLiveSession)

// ==================== CONTEST ROUTES ====================
router.get('/contests', cacheMiddleware(60), listContests)
router.get('/contests/:id', cacheMiddleware(30), optionalAuth, getContest)
router.post('/contests', authenticate, requireAdmin, createContest)
router.post('/contests/join', authenticate, joinContest)
router.post('/contests/submit', authenticate, submitContestSolution)
router.get('/contests/:id/leaderboard', cacheMiddleware(30), getContestLeaderboard)
router.get('/contests/:id/results', authenticate, getContestResults)
router.patch('/contests/:id/status', authenticate, requireAdmin, updateContestStatus)

// ==================== PAYMENT ROUTES ====================
// NOTE: Webhook route is mounted at server level BEFORE express.json() middleware
// for Stripe signature verification. See server.ts.
router.post('/payments/orders', authenticate, createOrder)
router.post('/payments/coupons', authenticate, applyCoupon)

// ==================== ADMIN ROUTES ====================
router.get('/admin/dashboard', authenticate, requireAdmin, getDashboardStats)
router.get('/admin/users', authenticate, requireAdmin, getUsers)
router.put('/admin/users/:id/role', authenticate, requireAdmin, updateUserRole)
router.delete('/admin/users/:id', authenticate, requireAdmin, deleteUser)
router.get('/admin/system-status', authenticate, requireAdmin, getSystemStatus)
router.get('/admin/analytics', authenticate, requireAdmin, getAnalytics)
router.get('/admin/analytics/users', authenticate, requireAdmin, getUserAnalytics)
router.get('/admin/analytics/courses', authenticate, requireAdmin, getCourseAnalytics)
router.post('/admin/ai/generate-course', authenticate, requireAdmin, generateCourse)
router.get('/admin/audit-logs', authenticate, requireAdmin, getAuditLogs)
router.get('/admin/security', authenticate, requireAdmin, getSecurityEvents)

// ==================== MONITORING ROUTES ====================
router.get('/monitoring/health', deepHealthCheck)
router.get('/monitoring/metrics', authenticate, requireAdmin, getMetrics)
router.get('/monitoring/database', authenticate, requireAdmin, getDatabaseStatus)
router.get('/monitoring/cache', authenticate, requireAdmin, getCacheStatus)
router.get('/monitoring/processes', authenticate, requireAdmin, getProcesses)

// ==================== SUBSCRIPTION ROUTES ====================
router.get('/subscriptions/tiers', getTiers)
router.get('/subscriptions/me', authenticate, getMySubscription)
router.post('/subscriptions/create', authenticate, createSubscription)
router.post('/subscriptions/cancel', authenticate, cancelSubscription)
router.post('/subscriptions/coupon/validate', authenticate, validateCoupon)

// ==================== NOTIFICATION ROUTES ====================
router.get('/notifications', authenticate, getNotifications)
router.get('/notifications/unread-count', authenticate, getUnreadCount)
router.patch('/notifications/:id/read', authenticate, markAsRead)
router.post('/notifications/mark-all-read', authenticate, markAllAsRead)
router.delete('/notifications/:id', authenticate, deleteNotification)

// ==================== USER ANALYTICS ROUTES ====================
router.get('/analytics/dashboard', authenticate, getLearnerDashboardStats)
router.get('/analytics/learning-activity', authenticate, getLearningActivity)
router.get('/analytics/performance-trend', authenticate, getPerformanceTrend)
router.get('/analytics/weak-areas', authenticate, getWeakAreas)

// ==================== CERTIFICATE ROUTES (stub) ====================
router.get('/courses/certificates', authenticate, (req, res) => {
  res.json({ status: 'success', data: [] })
})
router.get('/courses/certificates/:code', authenticate, (req, res) => {
  res.status(404).json({ status: 'error', message: 'Certificate not found' })
})
router.get('/courses/public-certificates/:code/verify', (req, res) => {
  res.status(404).json({ status: 'error', message: 'Certificate not found' })
})

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() })
})

export default router
