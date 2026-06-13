import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { requireAdmin, requireAdminPermission } from '../../middleware/roleMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getAnalytics,
  getUserAnalytics,
  getCourseAnalytics,
  getDauAnalytics,
  getAuditLogs,
  getSecurityEvents,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getJobQueueHealth,
  triggerDataExport,
} from '../../controllers/adminController'
import { adminLogin, adminRegister, verifyMfa } from '../../controllers/adminAuthController'
import { adminLoginSchema, adminRegisterSchema, verifyMfaSchema } from '../../validations/schemas'

const router = Router()

// Admin auth rate limiting (stricter than general auth)
const adminAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'admin-auth',
  message: 'Too many admin authentication attempts. Please try again later.',
})

// Auth routes (no admin auth required for initial admin registration)
router.post('/auth/login', adminAuthLimiter, validate(adminLoginSchema), adminLogin)
router.post('/auth/verify-mfa', adminAuthLimiter, validate(verifyMfaSchema), verifyMfa)
router.post('/auth/register/initial', adminAuthLimiter, validate(adminRegisterSchema), adminRegister)
router.post(
  '/auth/register',
  authenticate,
  requireAdmin,
  validate(adminRegisterSchema),
  adminRegister
)

// Dashboard and user management
router.get('/dashboard', authenticate, requireAdmin, getDashboardStats)
router.get('/users', authenticate, requireAdmin, getUsers)
router.put('/users/:id/role', authenticate, requireAdmin, updateUserRole)
router.delete('/users/:id', authenticate, requireAdmin, deleteUser)
router.get('/analytics', authenticate, requireAdminPermission(['analytics.read']), getAnalytics)
router.get('/analytics/users', authenticate, requireAdminPermission(['analytics.read']), getUserAnalytics)
router.get('/analytics/courses', authenticate, requireAdminPermission(['analytics.read']), getCourseAnalytics)
router.get('/analytics/dau', authenticate, requireAdminPermission(['analytics.read']), getDauAnalytics)
router.get('/audit-logs', authenticate, requireAdminPermission(['audit.read']), getAuditLogs)
router.get('/security', authenticate, requireAdminPermission(['audit.read']), getSecurityEvents)

// System & Data Management
router.get('/system/queues', authenticate, requireAdmin, getJobQueueHealth)
router.post('/users/:id/export', authenticate, requireAdminPermission(['users.write']), triggerDataExport)

// Course management
router.get('/courses', authenticate, requireAdmin, getAdminCourses)
router.post('/courses', authenticate, requireAdminPermission(['courses.write']), createCourse)
router.put('/courses/:id', authenticate, requireAdminPermission(['courses.write']), updateCourse)
router.delete(
  '/courses/:id',
  authenticate,
  requireAdminPermission(['courses.delete']),
  deleteCourse
)

export default router
