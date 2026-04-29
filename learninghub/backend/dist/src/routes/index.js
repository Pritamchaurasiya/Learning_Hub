"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const progressController_1 = require("../controllers/progressController");
const coursesController_1 = require("../controllers/coursesController");
const testsController_1 = require("../controllers/testsController");
const liveClassController_1 = require("../controllers/liveClassController");
const problemsController_1 = require("../controllers/problemsController");
const gamificationController_1 = require("../controllers/gamificationController");
const aiController_1 = require("../controllers/aiController");
const lessonsController_1 = require("../controllers/lessonsController");
const bookmarksController_1 = require("../controllers/bookmarksController");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../utils/auth");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const schemas_1 = require("../validations/schemas");
const router = (0, express_1.Router)();
// ==================== AUTH ROUTES ====================
// Note: Auth rate limiting is applied at server level
router.post('/auth/register', (0, validationMiddleware_1.validate)(schemas_1.registerSchema), authController_1.register);
router.post('/auth/login', (0, validationMiddleware_1.validate)(schemas_1.loginSchema), authController_1.login);
router.post('/auth/refresh', (0, validationMiddleware_1.validate)(schemas_1.refreshSchema), authController_1.refresh);
router.get('/auth/me', auth_1.authenticate, authController_1.me);
router.put('/auth/profile', auth_1.authenticate, authController_1.updateProfile);
router.post('/auth/change-password', auth_1.authenticate, authController_1.changePassword);
router.post('/auth/avatar', auth_1.authenticate, authController_1.uploadAvatar);
// ==================== USER BOOKMARKS ROUTES ====================
router.get('/users/bookmarks', auth_1.authenticate, bookmarksController_1.getBookmarks);
router.post('/users/bookmarks', auth_1.authenticate, bookmarksController_1.createBookmark);
router.delete('/users/bookmarks/:courseId', auth_1.authenticate, bookmarksController_1.deleteBookmark);
// ==================== COURSE ROUTES ====================
router.get('/courses', coursesController_1.listCourses);
// Lesson routes (must be before /courses/:id to avoid param clash)
router.get('/courses/:id/lessons', auth_1.authenticate, lessonsController_1.getCourseLessons);
router.get('/courses/:id/lessons/:lessonId', auth_1.authenticate, lessonsController_1.getLesson);
router.get('/courses/:id/lessons/:lessonId/next', auth_1.authenticate, lessonsController_1.getNextLesson);
router.get('/courses/:id/lessons/:lessonId/previous', auth_1.authenticate, lessonsController_1.getPreviousLesson);
router.get('/courses/:id/progress', auth_1.authenticate, lessonsController_1.getCourseProgress);
router.post('/courses/:id/lessons/:lessonId/progress', auth_1.authenticate, lessonsController_1.updateLessonProgress);
router.post('/courses/:id/lessons/:lessonId/complete', auth_1.authenticate, lessonsController_1.completeLesson);
router.get('/courses/:id/lessons/:lessonId/notes', auth_1.authenticate, lessonsController_1.getLessonNotes);
router.post('/courses/:id/lessons/:lessonId/notes', auth_1.authenticate, lessonsController_1.saveLessonNotes);
router.get('/courses/:id', coursesController_1.getCourseDetails);
router.get('/courses/:id/reviews', coursesController_1.getCourseReviews);
router.post('/courses/enroll', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.enrollCourseSchema), coursesController_1.enrollInCourse);
router.post('/courses/progress', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.updateProgressSchema), coursesController_1.updateCourseProgress);
// ==================== TEST/QUIZ ROUTES ====================
router.get('/tests', testsController_1.listTests);
router.get('/tests/:id', testsController_1.getTestDetails);
router.post('/tests/:id/start', auth_1.authenticate, testsController_1.startTest);
router.post('/tests/:id/submit', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.submitTestSchema), testsController_1.submitTest);
// ==================== LIVE CLASS ROUTES ====================
router.get('/live-sessions', liveClassController_1.listLiveSessions);
router.post('/live-sessions', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.createLiveSessionSchema), liveClassController_1.createLiveSession); // Admin/Instructor only in real app
router.post('/live-sessions/:id/join', auth_1.authenticate, liveClassController_1.joinLiveSession);
// ==================== PROBLEM/DSA ROUTES ====================
router.get('/problems', problemsController_1.listProblems);
router.get('/problems/:id', problemsController_1.getProblemDetails);
router.post('/problems/:id/submit', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.submitProblemSchema), problemsController_1.submitProblemSolution);
// ==================== GAMIFICATION ROUTES ====================
router.get('/leaderboard', gamificationController_1.getLeaderboard);
router.get('/achievements', auth_1.authenticate, gamificationController_1.getAchievements);
router.post('/daily-goal', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.updateDailyGoalSchema), gamificationController_1.updateDailyGoal);
// ==================== AI ROUTES ====================
router.post('/ai/analyze', auth_1.authenticate, aiController_1.analyzeLearningPath);
router.post('/ai/tutor', auth_1.authenticate, aiController_1.getTutorResponse);
// ==================== PROGRESS ROUTES (Legacy Support) ====================
router.post('/progress/complete', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.completeCourseSchema), progressController_1.completeCourse);
router.post('/progress/streak', auth_1.authenticate, progressController_1.updateStreak);
router.post('/progress/bookmark', auth_1.authenticate, (0, validationMiddleware_1.validate)(schemas_1.bookmarkSchema), progressController_1.toggleBookmark);
// ==================== ADMIN ROUTES ====================
router.get('/admin/dashboard', auth_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getDashboardStats);
router.get('/admin/users', auth_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getUsers);
router.patch('/admin/users/:id/role', auth_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.updateUserRole);
router.delete('/admin/users/:id', auth_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.deleteUser);
router.get('/admin/system-status', auth_1.authenticate, roleMiddleware_1.requireAdmin, adminController_1.getSystemStatus);
// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
exports.default = router;
