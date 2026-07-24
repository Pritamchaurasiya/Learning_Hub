import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { strictLimiter } from '../../middleware/rateLimiter'
import { mfaRateLimit } from '../../config/security'
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAccount,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  exportUserData,
  getPreferences,
  updatePreferences,
  setupMfa,
  verifyAndEnableMfa,
  disableMfa,
  verifyMfaLogin,
  listSessions,
  revokeSession,
} from '../../controllers/authController'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyMfaEnableSchema,
  disableMfaSchema,
  verifyMfaSchema,
} from '../../validations/schemas'
import { mediaService } from '../../services/MediaService'

const router = Router()

router.post('/register', strictLimiter, validate(registerSchema), register)
router.post('/login', strictLimiter, validate(loginSchema), login)
router.post('/logout', authenticate, logout)
router.post('/refresh', strictLimiter, validate(refreshSchema), refresh)
router.get('/me', authenticate, me)
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile)
router.post(
  '/change-password',
  strictLimiter,
  authenticate,
  validate(changePasswordSchema),
  changePassword
)
router.post('/avatar', authenticate, mediaService.single('file'), uploadAvatar)
router.delete('/delete-account', authenticate, deleteAccount)
router.post('/send-verification', authenticate, sendVerificationEmail)
router.get('/verify-email/:token', verifyEmail)
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', strictLimiter, validate(resetPasswordSchema), resetPassword)
router.get('/export-data', authenticate, exportUserData)

router.get('/preferences', authenticate, getPreferences)
router.put('/preferences', authenticate, updatePreferences)

// Session management
router.get('/sessions', authenticate, listSessions)
router.delete('/sessions/:id', authenticate, revokeSession)

// MFA routes
router.post('/mfa/setup', authenticate, setupMfa)
router.post('/mfa/verify-enable', authenticate, mfaRateLimit, validate(verifyMfaEnableSchema), verifyAndEnableMfa)
router.post('/mfa/disable', authenticate, validate(disableMfaSchema), disableMfa)
router.post('/mfa/verify-login', mfaRateLimit, validate(verifyMfaSchema), verifyMfaLogin)

export default router
