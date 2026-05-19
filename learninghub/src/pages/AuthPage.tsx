import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { Lock, Mail, Sparkles, Eye, EyeOff } from 'lucide-react'
import AnimatedPage from '../components/AnimatedPage'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { setAuth, addToast } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  interface LocationState {
    from?: {
      pathname: string
    }
  }
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      addToast({ message: 'Please fill in all fields', type: 'error' })
      return
    }

    if (!isLogin) {
      if (password.length < 8) {
        addToast({ message: 'Password must be at least 8 characters', type: 'error' })
        return
      }
      if (password !== confirmPassword) {
        addToast({ message: 'Passwords do not match', type: 'error' })
        return
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        addToast({
          message: 'Password must contain uppercase, lowercase, and a number',
          type: 'error',
        })
        return
      }
    }

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

      const rawData = response.data ?? response
      const data = rawData.data ?? rawData
      const token = data.access_token ?? data.accessToken ?? data.token
      const refreshToken = data.refresh_token ?? data.refreshToken ?? data.refresh
      const user = data.user ?? rawData

      if (token && user?.id) {
        setAuth(token, refreshToken ?? null, user)
        addToast({
          message: isLogin ? 'Welcome back!' : 'Account created successfully!',
          type: 'success',
        })
        navigate(from, { replace: true })
      } else {
        addToast({
          message: data.message ?? 'Authentication failed. Please try again.',
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

  return (
    <AnimatedPage>
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

          <form onSubmit={handleAuth} className="relative z-10 space-y-5">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              fullWidth
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLogin ? 'Enter your password' : 'Min 8 characters'}
                leftIcon={<Lock className="h-4 w-4" />}
                fullWidth
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                helperText={!isLogin ? 'Must contain uppercase, lowercase, and number' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {!isLogin && (
              <Input
                label="Confirm Password"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                fullWidth
                autoComplete="new-password"
              />
            )}

            <Button type="submit" isLoading={loading} fullWidth size="lg" className="mt-6">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

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
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </motion.button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AnimatedPage>
  )
}
