import { Router } from 'express'
import { authenticate, authorizeAdmin } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { mfaRateLimit } from '../../config/security'
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getAnalytics,
  getUserAnalytics,
  getDauAnalytics,
  getAuditLogs,
  getSecurityEvents,
  getJobQueueHealth,
  triggerDataExport,
} from '../../controllers/adminController'
import { adminLogin, adminRegister, verifyMfa } from '../../controllers/adminAuthController'
import {
  adminLoginSchema,
  adminRegisterSchema,
  verifyMfaSchema,
  adminUpdateRoleSchema,
  adminAnalyticsQuerySchema,
  adminAuditLogQuerySchema,
  adminDauQuerySchema,
  adminSecurityEventsSchema,
} from '../../validations/schemas'
import { validateUUIDParam } from '../../middleware/validationMiddleware'

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
router.post('/auth/verify-mfa', mfaRateLimit, validate(verifyMfaSchema), verifyMfa)
router.post(
  '/auth/register/initial',
  adminAuthLimiter,
  validate(adminRegisterSchema),
  adminRegister
)
router.post(
  '/auth/register',
  authenticate,
  authorizeAdmin,
  validate(adminRegisterSchema),
  adminRegister
)

// Dashboard and user management
router.get('/dashboard', authenticate, authorizeAdmin, getDashboardStats)
router.get('/users', authenticate, authorizeAdmin, getUsers)
router.put(
  '/users/:id/role',
  authenticate,
  authorizeAdmin,
  validateUUIDParam('id'),
  validate(adminUpdateRoleSchema),
  updateUserRole
)
router.delete('/users/:id', authenticate, authorizeAdmin, validateUUIDParam('id'), deleteUser)
router.get(
  '/analytics',
  authenticate,
  authorizeAdmin,
  validate(adminAnalyticsQuerySchema),
  getAnalytics
)
router.get('/analytics/users', authenticate, authorizeAdmin, getUserAnalytics)

router.get(
  '/analytics/dau',
  authenticate,
  authorizeAdmin,
  validate(adminDauQuerySchema),
  getDauAnalytics
)
router.get(
  '/audit-logs',
  authenticate,
  authorizeAdmin,
  validate(adminAuditLogQuerySchema),
  getAuditLogs
)
router.get(
  '/security',
  authenticate,
  authorizeAdmin,
  validate(adminSecurityEventsSchema),
  getSecurityEvents
)

// System & Data Management
router.get('/system/queues', authenticate, authorizeAdmin, getJobQueueHealth)
router.post(
  '/users/:id/export',
  authenticate,
  authorizeAdmin,
  validateUUIDParam('id'),
  triggerDataExport
)

export default router
