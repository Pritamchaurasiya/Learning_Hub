"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const cacheMiddleware_1 = require("../middleware/cacheMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const subscriptionMiddleware_1 = require("../middleware/subscriptionMiddleware");
const schemas_1 = require("../validations/schemas");
// Controllers
const authController_1 = require("../controllers/authController");
const coursesController_1 = require("../controllers/coursesController");
const courseReviewsController_1 = require("../controllers/courseReviewsController");
const lessonsController_1 = require("../controllers/lessonsController");
const testsController_1 = require("../controllers/testsController");
const testEngineController_1 = require("../controllers/testEngineController");
const analyticsController_1 = require("../controllers/analyticsController");
const questionBookmarksController_1 = require("../controllers/questionBookmarksController");
const progressController_1 = require("../controllers/progressController");
const gamificationController_1 = require("../controllers/gamificationController");
const bookmarksController_1 = require("../controllers/bookmarksController");
const problemsController_1 = require("../controllers/problemsController");
const searchController_1 = require("../controllers/searchController");
const aiController_1 = require("../controllers/aiController");
const adminController_1 = require("../controllers/adminController");
const adminAuthController_1 = require("../controllers/adminAuthController");
const liveClassController_1 = require("../controllers/liveClassController");
const contestsController_1 = require("../controllers/contestsController");
const paymentsController_1 = require("../controllers/paymentsController");
const notificationsController_1 = require("../controllers/notificationsController");
const examContentController_1 = require("../controllers/examContentController");
const monitoringController_1 = require("../controllers/monitoringController");
const subscriptionsController_1 = require("../controllers/subscriptionsController");
const router = (0, express_1.Router)();
// ==================== AUTH ROUTES ====================
router.post('/auth/register', (0, validationMiddleware_1.validate)(schemas_1.registerSchema), authController_1.register);
router.post('/auth/login', (0, validationMiddleware_1.validate)(schemas_1.loginSchema), authController_1.login);
router.post('/auth/refresh', (0, validationMiddleware_1.validate)(schemas_1.refreshSchema), authController_1.refresh);
router.get('/auth/me', authMiddleware_1.authenticate, authController_1.me);
router.put('/auth/profile', authMiddleware_1.authenticate, authController_1.updateProfile);
router.post('/auth/change-password', authMiddleware_1.authenticate, authController_1.changePassword);
router.post('/auth/avatar', authMiddleware_1.authenticate, authController_1.uploadAvatar);
router.delete('/auth/delete-account', authMiddleware_1.authenticate, authController_1.deleteAccount);
router.post('/auth/send-verification', authMiddleware_1.authenticate, authController_1.sendVerificationEmail);
router.get('/auth/verify-email/:token', authController_1.verifyEmail);
router.post('/auth/forgot-password', authController_1.forgotPassword);
router.post('/auth/reset-password', authController_1.resetPassword);
// ==================== ADMIN AUTH ====================
router.post('/admin/auth/login', (0, validationMiddleware_1.validate)(schemas_1.adminLoginSchema), adminAuthController_1.adminLogin);
// First admin registration: uses ADMIN_SECRET only (no prior admin auth needed)
router.post('/admin/auth/register/initial', (0, validationMiddleware_1.validate)(schemas_1.adminRegisterSchema), adminAuthController_1.adminRegister);
// Subsequent admin registration: requires existing admin authentication
router.post('/admin/auth/register', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, (0, validationMiddleware_1.validate)(schemas_1.adminRegisterSchema), adminAuthController_1.adminRegister);
// ==================== COURSE ROUTES ====================
router.get('/courses', (0, cacheMiddleware_1.cacheMiddleware)(600), authMiddleware_1.optionalAuth, coursesController_1.listCourses);
router.get('/courses/:id', (0, cacheMiddleware_1.cacheMiddleware)(300), authMiddleware_1.optionalAuth, coursesController_1.getCourseDetails);
router.get('/courses/:id/reviews', (0, cacheMiddleware_1.cacheMiddleware)(300), courseReviewsController_1.getCourseReviews);
router.post('/courses/:id/reviews', authMiddleware_1.authenticate, courseReviewsController_1.createCourseReview);
router.put('/courses/:courseId/reviews/:reviewId/helpful', authMiddleware_1.authenticate, courseReviewsController_1.markReviewHelpful);
router.post('/courses/enroll', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.enrollCourseSchema), coursesController_1.enrollInCourse);
router.put('/courses/progress', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.updateProgressSchema), coursesController_1.updateCourseProgress);
// Admin course management
router.get('/admin/courses', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getAdminCourses);
router.post('/admin/courses', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.createCourse);
router.put('/admin/courses/:id', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.updateCourse);
router.delete('/admin/courses/:id', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.deleteCourse);
// ==================== LESSON ROUTES ====================
router.get('/courses/:courseId/lessons', (0, cacheMiddleware_1.cacheMiddleware)(300), authMiddleware_1.optionalAuth, lessonsController_1.getCourseLessons);
router.get('/courses/:courseId/lessons/:lessonId', (0, cacheMiddleware_1.cacheMiddleware)(300), authMiddleware_1.optionalAuth, lessonsController_1.getLesson);
router.get('/courses/:courseId/progress', authMiddleware_1.authenticate, lessonsController_1.getCourseProgress);
router.put('/courses/:courseId/lessons/:lessonId/progress', authMiddleware_1.authenticate, lessonsController_1.updateLessonProgress);
router.post('/courses/:courseId/lessons/:lessonId/complete', authMiddleware_1.authenticate, lessonsController_1.completeLesson);
router.get('/courses/:courseId/lessons/:lessonId/notes', authMiddleware_1.authenticate, lessonsController_1.getLessonNotes);
router.put('/courses/:courseId/lessons/:lessonId/notes', authMiddleware_1.authenticate, lessonsController_1.saveLessonNotes);
router.get('/courses/:courseId/lessons/:lessonId/next', authMiddleware_1.authenticate, lessonsController_1.getNextLesson);
router.get('/courses/:courseId/lessons/:lessonId/previous', authMiddleware_1.authenticate, lessonsController_1.getPreviousLesson);
// ==================== TEST ENGINE ROUTES ====================
// IMPORTANT: Static paths MUST come before parameterized /:id routes
router.get('/tests', (0, cacheMiddleware_1.cacheMiddleware)(300), authMiddleware_1.optionalAuth, testsController_1.listTests);
// Static sub-paths first (before /:id which would shadow them)
router.get('/tests/attempts', authMiddleware_1.authenticate, testsController_1.getTestAttempts);
router.get('/tests/attempts/history', authMiddleware_1.authenticate, testEngineController_1.getAttemptHistory);
router.get('/tests/analytics', authMiddleware_1.authenticate, testEngineController_1.getTestAnalytics);
router.get('/tests/my-results', authMiddleware_1.authenticate, testsController_1.getTestAttempts); // alias used by quizService
// Parameterized routes after static ones
router.get('/tests/:id', (0, cacheMiddleware_1.cacheMiddleware)(300), authMiddleware_1.optionalAuth, testsController_1.getTestDetails);
router.get('/tests/:id/questions', authMiddleware_1.authenticate, testEngineController_1.getTestQuestions);
router.get('/tests/:id/time', authMiddleware_1.authenticate, testEngineController_1.getTimeRemaining);
router.post('/tests/:id/start', authMiddleware_1.authenticate, testsController_1.startTest);
router.post('/tests/:id/autosave', authMiddleware_1.authenticate, testsController_1.autosaveTest);
router.post('/tests/:id/submit', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.submitTestSchema), testsController_1.submitTest);
router.post('/tests/:id/practice/answer', authMiddleware_1.authenticate, testEngineController_1.practiceAnswer);
router.get('/tests/:id/result', authMiddleware_1.authenticate, testsController_1.getTestResults);
router.get('/tests/attempts/:id', authMiddleware_1.authenticate, testsController_1.getTestAttemptDetails);
// ==================== PROGRESS ROUTES ====================
router.post('/progress/complete-course', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.completeCourseSchema), progressController_1.completeCourse);
router.post('/progress/update-streak', authMiddleware_1.authenticate, progressController_1.updateStreak);
router.post('/progress/bookmark', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.bookmarkSchema), progressController_1.toggleBookmark);
// ==================== BOOKMARK ROUTES ====================
router.get('/users/bookmarks', authMiddleware_1.authenticate, bookmarksController_1.getBookmarks);
router.post('/users/bookmarks', authMiddleware_1.authenticate, bookmarksController_1.createBookmark);
router.delete('/users/bookmarks/:courseId', authMiddleware_1.authenticate, bookmarksController_1.deleteBookmark);
// ==================== QUESTION BOOKMARK ROUTES ====================
router.get('/questions/bookmarks', authMiddleware_1.authenticate, questionBookmarksController_1.getBookmarkedQuestions);
router.post('/questions/bookmarks', authMiddleware_1.authenticate, questionBookmarksController_1.bookmarkQuestion);
router.delete('/questions/bookmarks/:questionId', authMiddleware_1.authenticate, questionBookmarksController_1.removeBookmark);
// ==================== GAMIFICATION ROUTES ====================
router.get('/gamification/leaderboard', (0, cacheMiddleware_1.cacheMiddleware)(300), gamificationController_1.getLeaderboard);
router.get('/gamification/achievements', authMiddleware_1.authenticate, gamificationController_1.getAchievements);
router.put('/gamification/daily-goal', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.updateDailyGoalSchema), gamificationController_1.updateDailyGoal);
router.get('/gamification/dsa-stats', authMiddleware_1.authenticate, gamificationController_1.getDsaStats);
// ==================== PROBLEMS (DSA) ROUTES ====================
router.get('/problems', (0, cacheMiddleware_1.cacheMiddleware)(300), problemsController_1.listProblems);
router.get('/problems/:slug', (0, cacheMiddleware_1.cacheMiddleware)(300), problemsController_1.getProblemDetails);
router.post('/problems/:id/submit', authMiddleware_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.submitProblemSchema), problemsController_1.submitProblemSolution);
// ==================== SEARCH ROUTES ====================
router.get('/search', authMiddleware_1.authenticate, searchController_1.globalSearch);
router.get('/search/suggestions', authMiddleware_1.authenticate, searchController_1.suggestions);
router.get('/search/trending', (0, cacheMiddleware_1.cacheMiddleware)(600), searchController_1.trending);
// ==================== AI ROUTES ====================
router.post('/ai/learning-path', authMiddleware_1.authenticate, aiController_1.analyzeLearningPath);
router.post('/ai/tutor', authMiddleware_1.authenticate, aiController_1.getTutorResponse);
router.post('/ai/generate-test', authMiddleware_1.authenticate, (0, subscriptionMiddleware_1.checkUsageLimit)('aiGenerations'), aiController_1.generatePracticeTest);
router.post('/ai/generate-weak-area-test', authMiddleware_1.authenticate, (0, subscriptionMiddleware_1.checkUsageLimit)('aiGenerations'), aiController_1.generateWeakAreaTest);
router.get('/ai/weak-topics', authMiddleware_1.authenticate, aiController_1.getWeakTopics);
// ==================== EXAM CONTENT ROUTES ====================
router.get('/exam-content/pyqs', (0, cacheMiddleware_1.cacheMiddleware)(600), examContentController_1.examContentController.getPYQs);
router.get('/exam-content/pyqs/:id', (0, cacheMiddleware_1.cacheMiddleware)(600), examContentController_1.examContentController.getPYQById);
router.post('/exam-content/pyqs', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, examContentController_1.examContentController.createPYQ);
router.get('/exam-content/formulas', (0, cacheMiddleware_1.cacheMiddleware)(600), examContentController_1.examContentController.getFormulas);
router.get('/exam-content/revision-notes', (0, cacheMiddleware_1.cacheMiddleware)(600), examContentController_1.examContentController.getRevisionNotes);
// ==================== LIVE CLASS ROUTES ====================
router.get('/live-sessions', (0, cacheMiddleware_1.cacheMiddleware)(60), liveClassController_1.listLiveSessions);
router.post('/live-sessions', authMiddleware_1.authenticate, roleMiddleware_1.requireInstructorOrAdmin, (0, validationMiddleware_1.validate)(schemas_1.createLiveSessionSchema), liveClassController_1.createLiveSession);
router.post('/live-sessions/:id/join', authMiddleware_1.authenticate, liveClassController_1.joinLiveSession);
// ==================== CONTEST ROUTES ====================
router.get('/contests', (0, cacheMiddleware_1.cacheMiddleware)(60), contestsController_1.listContests);
router.get('/contests/:id', (0, cacheMiddleware_1.cacheMiddleware)(30), authMiddleware_1.optionalAuth, contestsController_1.getContest);
router.post('/contests', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, contestsController_1.createContest);
router.post('/contests/join', authMiddleware_1.authenticate, contestsController_1.joinContest);
router.post('/contests/submit', authMiddleware_1.authenticate, contestsController_1.submitContestSolution);
router.get('/contests/:id/leaderboard', (0, cacheMiddleware_1.cacheMiddleware)(30), contestsController_1.getContestLeaderboard);
router.get('/contests/:id/results', authMiddleware_1.authenticate, contestsController_1.getContestResults);
router.patch('/contests/:id/status', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, contestsController_1.updateContestStatus);
// ==================== PAYMENT ROUTES ====================
router.post('/payments/webhook', express_2.default.raw({ type: 'application/json' }), paymentsController_1.handleWebhook);
router.post('/payments/orders', authMiddleware_1.authenticate, paymentsController_1.createOrder);
router.post('/payments/coupons', authMiddleware_1.authenticate, paymentsController_1.applyCoupon);
// ==================== ADMIN ROUTES ====================
router.get('/admin/dashboard', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getDashboardStats);
router.get('/admin/users', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getUsers);
router.put('/admin/users/:id/role', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.updateUserRole);
router.delete('/admin/users/:id', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.deleteUser);
router.get('/admin/system-status', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getSystemStatus);
router.get('/admin/analytics', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getAnalytics);
router.get('/admin/audit-logs', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getAuditLogs);
router.get('/admin/security', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getSecurityEvents);
// ==================== MONITORING ROUTES ====================
router.get('/monitoring/health', monitoringController_1.deepHealthCheck);
router.get('/monitoring/metrics', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, monitoringController_1.getMetrics);
router.get('/monitoring/database', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, monitoringController_1.getDatabaseStatus);
router.get('/monitoring/cache', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, monitoringController_1.getCacheStatus);
router.get('/monitoring/processes', authMiddleware_1.authenticate, roleMiddleware_1.requireAdmin, monitoringController_1.getProcesses);
// ==================== SUBSCRIPTION ROUTES ====================
router.get('/subscriptions/tiers', subscriptionsController_1.getTiers);
router.get('/subscriptions/me', authMiddleware_1.authenticate, subscriptionsController_1.getMySubscription);
router.post('/subscriptions/create', authMiddleware_1.authenticate, subscriptionsController_1.createSubscription);
router.post('/subscriptions/cancel', authMiddleware_1.authenticate, subscriptionsController_1.cancelSubscription);
router.post('/subscriptions/coupon/validate', authMiddleware_1.authenticate, subscriptionsController_1.validateCoupon);
// ==================== NOTIFICATION ROUTES ====================
router.get('/notifications', authMiddleware_1.authenticate, notificationsController_1.getNotifications);
router.get('/notifications/unread-count', authMiddleware_1.authenticate, notificationsController_1.getUnreadCount);
router.patch('/notifications/:id/read', authMiddleware_1.authenticate, notificationsController_1.markAsRead);
router.post('/notifications/mark-all-read', authMiddleware_1.authenticate, notificationsController_1.markAllAsRead);
router.delete('/notifications/:id', authMiddleware_1.authenticate, notificationsController_1.deleteNotification);
// ==================== USER ANALYTICS ROUTES ====================
router.get('/analytics/performance-trend', authMiddleware_1.authenticate, analyticsController_1.getPerformanceTrend);
router.get('/analytics/weak-areas', authMiddleware_1.authenticate, analyticsController_1.getWeakAreas);
// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
    res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() });
});
exports.default = router;
