import { Router } from 'express';
import { register, login, me, refresh, updateProfile, changePassword, uploadAvatar } from '../controllers/authController';
import { completeCourse, updateStreak, toggleBookmark } from '../controllers/progressController';
import {
  listCourses,
  getCourseDetails,
  getCourseReviews,
  enrollInCourse,
  updateCourseProgress
} from '../controllers/coursesController';
import {
  listTests,
  getTestDetails,
  submitTest,
  startTest
} from '../controllers/testsController';
import {
  listLiveSessions,
  createLiveSession,
  joinLiveSession
} from '../controllers/liveClassController';
import {
  listProblems,
  getProblemDetails,
  submitProblemSolution
} from '../controllers/problemsController';
import {
  getLeaderboard,
  getAchievements,
  updateDailyGoal
} from '../controllers/gamificationController';
import {
  analyzeLearningPath,
  getTutorResponse
} from '../controllers/aiController';
import {
  getCourseLessons,
  getLesson,
  getNextLesson,
  getPreviousLesson,
  getCourseProgress,
  updateLessonProgress,
  completeLesson,
  getLessonNotes,
  saveLessonNotes
} from '../controllers/lessonsController';
import { getBookmarks, createBookmark, deleteBookmark } from '../controllers/bookmarksController';
import { 
  getDashboardStats, 
  getUsers, 
  updateUserRole, 
  deleteUser, 
  getSystemStatus 
} from '../controllers/adminController';
import { authenticate } from '../utils/auth';
import { validate } from '../middleware/validationMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
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
  bookmarkSchema
} from '../validations/schemas';

const router = Router();

// ==================== AUTH ROUTES ====================
// Note: Auth rate limiting is applied at server level
router.post('/auth/register', validate(registerSchema), register);
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/refresh', validate(refreshSchema), refresh);
router.get('/auth/me', authenticate, me);
router.put('/auth/profile', authenticate, updateProfile);
router.post('/auth/change-password', authenticate, changePassword);
router.post('/auth/avatar', authenticate, uploadAvatar);

// ==================== USER BOOKMARKS ROUTES ====================
router.get('/users/bookmarks', authenticate, getBookmarks);
router.post('/users/bookmarks', authenticate, createBookmark);
router.delete('/users/bookmarks/:courseId', authenticate, deleteBookmark);

// ==================== COURSE ROUTES ====================
router.get('/courses', listCourses);
// Lesson routes (must be before /courses/:id to avoid param clash)
router.get('/courses/:id/lessons', authenticate, getCourseLessons);
router.get('/courses/:id/lessons/:lessonId', authenticate, getLesson);
router.get('/courses/:id/lessons/:lessonId/next', authenticate, getNextLesson);
router.get('/courses/:id/lessons/:lessonId/previous', authenticate, getPreviousLesson);
router.get('/courses/:id/progress', authenticate, getCourseProgress);
router.post('/courses/:id/lessons/:lessonId/progress', authenticate, updateLessonProgress);
router.post('/courses/:id/lessons/:lessonId/complete', authenticate, completeLesson);
router.get('/courses/:id/lessons/:lessonId/notes', authenticate, getLessonNotes);
router.post('/courses/:id/lessons/:lessonId/notes', authenticate, saveLessonNotes);
router.get('/courses/:id', getCourseDetails);
router.get('/courses/:id/reviews', getCourseReviews);
router.post('/courses/enroll', authenticate, validate(enrollCourseSchema), enrollInCourse);
router.post('/courses/progress', authenticate, validate(updateProgressSchema), updateCourseProgress);

// ==================== TEST/QUIZ ROUTES ====================
router.get('/tests', listTests);
router.get('/tests/:id', getTestDetails);
router.post('/tests/:id/start', authenticate, startTest);
router.post('/tests/:id/submit', authenticate, validate(submitTestSchema), submitTest);

// ==================== LIVE CLASS ROUTES ====================
router.get('/live-sessions', listLiveSessions);
router.post('/live-sessions', authenticate, validate(createLiveSessionSchema), createLiveSession); // Admin/Instructor only in real app
router.post('/live-sessions/:id/join', authenticate, joinLiveSession);

// ==================== PROBLEM/DSA ROUTES ====================
router.get('/problems', listProblems);
router.get('/problems/:id', getProblemDetails);
router.post('/problems/:id/submit', authenticate, validate(submitProblemSchema), submitProblemSolution);

// ==================== GAMIFICATION ROUTES ====================
router.get('/leaderboard', getLeaderboard);
router.get('/achievements', authenticate, getAchievements);
router.post('/daily-goal', authenticate, validate(updateDailyGoalSchema), updateDailyGoal);

// ==================== AI ROUTES ====================
router.post('/ai/analyze', authenticate, analyzeLearningPath);
router.post('/ai/tutor', authenticate, getTutorResponse);

// ==================== PROGRESS ROUTES (Legacy Support) ====================
router.post('/progress/complete', authenticate, validate(completeCourseSchema), completeCourse);
router.post('/progress/streak', authenticate, updateStreak);
router.post('/progress/bookmark', authenticate, validate(bookmarkSchema), toggleBookmark);

// ==================== ADMIN ROUTES ====================
router.get('/admin/dashboard', authenticate, requireAdmin, getDashboardStats);
router.get('/admin/users', authenticate, requireAdmin, getUsers);
router.patch('/admin/users/:id/role', authenticate, requireAdmin, updateUserRole);
router.delete('/admin/users/:id', authenticate, requireAdmin, deleteUser);
router.get('/admin/system-status', authenticate, requireAdmin, getSystemStatus);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
