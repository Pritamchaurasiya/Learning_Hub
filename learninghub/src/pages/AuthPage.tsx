import React, { useState, useEffect, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import {
  Lock,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'

interface FieldErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

const calculatePasswordStrength = (pass: string) => {
  let score = 0
  if (!pass) return score
  if (pass.length >= 8) score += 1
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pass)) score += 1
  return score
}

const AuthPage = memo(function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const setAuth = useStore(state => state.setAuth)
  const addToast = useStore(state => state.addToast)
  const navigate = useNavigate()
  const location = useLocation()

  interface LocationState {
    from?: {
      pathname: string
    }
  }
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  useEffect(() => {
    setFieldErrors({})
  }, [isLogin])

  // Read ?mode=signup from URL (used by HomePage's handleStartFree)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const mode = params.get('mode')
    if (mode === 'signup') {
      setIsLogin(false)
    } else if (mode === 'login') {
      setIsLogin(true)
    }
  }, [location.search])

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email format'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (!isLogin) {
      if (password.length < 8) {
        errors.password = 'Must be at least 8 characters'
      } else if (!/[A-Z]/.test(password)) {
        errors.password = 'Must contain an uppercase letter'
      } else if (!/[a-z]/.test(password)) {
        errors.password = 'Must contain a lowercase letter'
      } else if (!/[0-9]/.test(password)) {
        errors.password = 'Must contain a number'
      } else if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
        errors.password = 'Must contain a special character'
      }
    }

    if (!isLogin && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'

      const body: Record<string, string> = { email: email.trim().toLowerCase(), password }
      if (!isLogin) {
        body.username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
      }

      const response = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const data = response?.data ?? response
      const user = data?.user ?? data

      if (user?.id) {
        setAuth('', null, user)
        addToast({
          message: isLogin ? 'Welcome back!' : 'Account created successfully!',
          type: 'success',
        })
        navigate(from, { replace: true })
      } else {
        addToast({
          message: response?.message ?? data?.message ?? 'Authentication failed. Please try again.',
          type: 'error',
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const quickFillAdmin = () => {
    setEmail('admin@learninghub.com')
    setPassword('Admin@123!')
  }

  const quickFillStudent = () => {
    setEmail('student@learninghub.com')
    setPassword('Student@123!')
  }

  const fieldClass = (field: keyof FieldErrors) => {
    // eslint-disable-next-line security/detect-object-injection
    const hasError = field === 'email' ? fieldErrors.email : fieldErrors[field]
    return `flex h-11 w-full min-h-[44px] rounded-lg border pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
      hasError
        ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-primary-500/20 focus:border-primary-500 hover:border-gray-300 dark:hover:border-gray-600'
    }`
  }

  const passwordFieldClass = (field: keyof FieldErrors) => {
    // eslint-disable-next-line security/detect-object-injection
    const hasError = field === 'password' ? fieldErrors.password : fieldErrors[field]
    return `flex h-11 w-full min-h-[44px] rounded-lg border pl-10 pr-10 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
      hasError
        ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-primary-500/20 focus:border-primary-500 hover:border-gray-300 dark:hover:border-gray-600'
    }`
  }

  return (
    <AnimatedPage>
      <SEO
        title={isLogin ? 'Sign In - LearningHub' : 'Create Account - LearningHub'}
        description={
          isLogin
            ? 'Sign in to access your LearningHub dashboard'
            : 'Join LearningHub to master your skills'
        }
      />
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ x: [0, -20, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <motion.div
          className="max-w-md w-full card-static p-8 rounded-2xl relative overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />

          <motion.div
            className="relative z-10 text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary-100/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>{isLogin ? 'Welcome Back' : 'Get Started'}</span>
            </motion.div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600">
              LearningHub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isLogin
                ? 'Sign in to continue your learning journey.'
                : 'Create an account to start learning.'}
            </p>
          </motion.div>

          <form onSubmit={handleAuth} className="relative z-10 space-y-5" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={fieldClass('email')}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                  aria-errormessage={fieldErrors.email ? 'auth-email-error' : undefined}
                />
                {fieldErrors.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                  </div>
                )}
              </div>
              {fieldErrors.email && (
                <p
                  id="auth-email-error"
                  className="text-xs text-red-500 mt-1 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (fieldErrors.password)
                      setFieldErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  placeholder={isLogin ? 'Enter your password' : 'Min 8 characters'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className={passwordFieldClass('password')}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                  aria-errormessage={fieldErrors.password ? 'auth-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="auth-password-error"
                  className="text-xs text-red-500 mt-1 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {fieldErrors.password}
                </p>
              )}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {!isLogin && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map(level => {
                      const strength = calculatePasswordStrength(password)
                      const isActive = strength >= level
                      let bgColor = 'bg-gray-200 dark:bg-gray-700'
                      if (isActive) {
                        if (strength === 1) bgColor = 'bg-red-500'
                        else if (strength === 2) bgColor = 'bg-yellow-500'
                        else if (strength === 3) bgColor = 'bg-blue-500'
                        else bgColor = 'bg-green-500'
                      }
                      return (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-colors duration-300 ${bgColor}`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {calculatePasswordStrength(password) === 0 &&
                      'Must contain uppercase, lowercase, number, and special character'}
                    {calculatePasswordStrength(password) === 1 && 'Weak - add more variety'}
                    {calculatePasswordStrength(password) === 2 &&
                      'Fair - add numbers & special chars'}
                    {calculatePasswordStrength(password) === 3 && 'Good - add special chars'}
                    {calculatePasswordStrength(password) >= 4 && 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm Password <span className="ml-1 text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword)
                        setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }))
                    }}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={`flex h-11 w-full min-h-[44px] rounded-lg border pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors duration-200 ${
                      fieldErrors.confirmPassword
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'auth-confirm-password-error' : undefined
                    }
                    aria-errormessage={
                      fieldErrors.confirmPassword ? 'auth-confirm-password-error' : undefined
                    }
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p
                    id="auth-confirm-password-error"
                    className="text-xs text-red-500 mt-1 flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" isLoading={loading} fullWidth size="lg" className="mt-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {isLogin && import.meta.env.DEV && (
            <motion.div
              className="mt-6 relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                    Quick Login
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <motion.button
                  onClick={quickFillAdmin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Shield className="h-4 w-4" />
                  <User className="h-4 w-4" />
                  Admin Login
                </motion.button>
                <motion.button
                  onClick={quickFillStudent}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <User className="h-4 w-4" />
                  Student Login
                </motion.button>
              </div>
            </motion.div>
          )}

          <motion.div
            className="mt-8 text-center relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <motion.button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={isLogin ? 'Switch to sign up' : 'Switch to sign in'}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </motion.button>
            </p>
          </motion.div>

          {!isLogin && (
            <motion.div
              className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center relative z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex -space-x-2">
                  <img
                    src="https://i.pravatar.cc/100?img=1"
                    alt="User"
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900"
                  />
                  <img
                    src="https://i.pravatar.cc/100?img=2"
                    alt="User"
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900"
                  />
                  <img
                    src="https://i.pravatar.cc/100?img=3"
                    alt="User"
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Join 10,000+ developers</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatedPage>
  )
})

export default AuthPage
