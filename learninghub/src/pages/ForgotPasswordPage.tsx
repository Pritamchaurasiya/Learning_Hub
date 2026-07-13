import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { fetchApi } from '../utils/api'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatedPage>
      <SEO title="Forgot Password - LearningHub" />
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
        </div>

        <motion.div
          className="max-w-md w-full card-static p-8 rounded-2xl relative shadow-2xl"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <motion.div
            className="text-center mb-8"
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
              <Sparkles className="w-4 h-4" />
              <span>Reset Password</span>
            </motion.div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600">
              LearningHub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {sent
                ? 'Check your email for the reset link.'
                : "Enter your email and we'll send you a reset link."}
            </p>
          </motion.div>

          {sent ? (
            <motion.div
              className="text-center py-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                If an account exists with{' '}
                <strong className="text-gray-900 dark:text-white">{email}</strong>, you&apos;ll
                receive a password reset link shortly.
              </p>
              <Button onClick={() => navigate('/auth')} fullWidth>
                Back to Sign In
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`flex h-11 w-full min-h-[44px] rounded-lg border pl-10 pr-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors duration-200 ${
                      error
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>

              <Button type="submit" isLoading={loading} fullWidth size="lg">
                Send Reset Link
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatedPage>
  )
}
