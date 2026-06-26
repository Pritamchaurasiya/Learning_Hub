import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
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
} from '../../controllers/authController'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../validations/schemas'
import { strictLimiter } from '../../middleware/rateLimiter'
import { mfaRateLimit } from '../../config/security'

const router = Router()

router.post('/register', strictLimiter, validate(registerSchema), register)
router.post('/login', strictLimiter, validate(loginSchema), login)
router.post('/mfa', mfaRateLimit, (req, res) => res.status(501).send('Not implemented'))
router.post('/verify-mfa', mfaRateLimit, (req, res) => res.status(501).send('Not implemented'))
router.post('/logout', authenticate, logout)
router.post('/refresh', strictLimiter, validate(refreshSchema), refresh)
router.get('/me', authenticate, me)
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile)
router.post('/change-password', authenticate, changePassword)
router.post('/avatar', authenticate, uploadAvatar)
router.delete('/delete-account', authenticate, deleteAccount)
router.post('/send-verification', authenticate, sendVerificationEmail)
router.get('/verify-email/:token', verifyEmail)
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', strictLimiter, validate(resetPasswordSchema), resetPassword)
router.get('/export-data', authenticate, exportUserData)

export default router
