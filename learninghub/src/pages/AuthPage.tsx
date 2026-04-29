import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../stores/useStore';
import { fetchApi } from '../utils/api';
import { Lock, Mail, Shield, Zap, ArrowRight, Sparkles } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// ─── Admin Quick-Access Configuration ───────────────────────────────────
const ADMIN_USER = {
  id: 'admin-001',
  email: 'admin@learninghub.com',
  username: 'Admin',
  xp: 9999,
  level: 50,
  streak: 365,
  lastActive: new Date().toISOString(),
  is_active: true,
  role: 'admin' as const,
};

const DEMO_USER = {
  id: 'demo-001',
  email: 'demo@learninghub.com',
  username: 'DemoUser',
  xp: 250,
  level: 5,
  streak: 7,
  lastActive: new Date().toISOString(),
  is_active: true,
  role: 'student' as const,
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setAuth, addToast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  // ─── Admin Shortcut Login ─────────────────────────────────────────────
  const handleAdminLogin = useCallback(() => {
    setAuth('admin-token-dev', 'admin-refresh-dev', ADMIN_USER);
    addToast({ message: '⚡ GOD MODE ACTIVATED', type: 'success' });
    navigate(from, { replace: true });
  }, [setAuth, addToast, navigate, from]);

  // ─── Demo User Quick Login ────────────────────────────────────────────
  const handleDemoLogin = useCallback(() => {
    setAuth('demo-token-dev', 'demo-refresh-dev', DEMO_USER);
    addToast({ message: '🎓 Welcome to the demo!', type: 'success' });
    navigate(from, { replace: true });
  }, [setAuth, addToast, navigate, from]);

  // ─── Standard Auth Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!email.trim() || !password.trim()) {
      addToast({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    if (!isLogin && password.length < 8) {
      addToast({ message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      
      // Build request body — registration requires username and password_confirm
      const body: Record<string, string> = { email, password };
      if (!isLogin) {
        // Generate username from email (before @)
        body.username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        body.password_confirm = password;
      }
      
      const response = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      // Backend returns { status, message, data: { user, accessToken, refreshToken } }
      const data = response.data || response;
      const token = data.accessToken || data.access_token || response.token;
      const refreshToken = data.refreshToken || data.refresh_token || response.refresh_token;
      const user = data.user || response.user;
      
      if (token && user) {
        setAuth(token, refreshToken || null, user);
        addToast({ message: response.message || (isLogin ? 'Welcome back!' : 'Account created!'), type: 'success' });
        navigate(from, { replace: true });
      } else {
        addToast({ message: 'Authentication succeeded but received incomplete data', type: 'error' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      addToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full"
            style={{ 
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
              filter: 'blur(60px)'
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full"
            style={{ 
              background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
              filter: 'blur(60px)'
            }}
            animate={{
              x: [0, -20, 0],
              y: [0, 20, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div 
            className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full"
            style={{ 
              background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
              filter: 'blur(60px)'
            }}
            animate={{
              x: [0, 40, 0],
              y: [0, -20, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>

        <motion.div 
          className="max-w-md w-full card-static p-8 rounded-2xl relative overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Decorative gradient border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />
          
          {/* Header */}
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
              <span>Start Your Journey</span>
            </motion.div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-x">
              Welcome to LearningHub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isLogin ? 'Sign in to jump straight back into your courses.' : 'Create an account to start your journey.'}
            </p>
          </motion.div>

          {/* ─── Quick Access Buttons ─────────────────────────────────── */}
          <motion.div 
            className="relative z-10 mb-6 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <motion.button
              onClick={handleAdminLogin}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-[2rem] border-2 border-primary-500/30 bg-gradient-to-r from-primary-600 to-indigo-600 text-white transition-all duration-300 group relative overflow-hidden shadow-xl shadow-primary-500/20"
              type="button"
              aria-label="Access God Mode"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform relative z-10 backdrop-blur-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left relative z-10">
                <p className="text-sm font-black uppercase tracking-widest">Access God Mode</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Full Privileges • Developer Console</p>
              </div>
              <Sparkles className="w-5 h-5 text-white/50 group-hover:text-white group-hover:scale-125 transition-all relative z-10" />
            </motion.button>

            <motion.button
              onClick={handleDemoLogin}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-primary-500/50 transition-all duration-300 group relative overflow-hidden shadow-lg"
              type="button"
              aria-label="Quick login as Demo User"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 text-left relative z-10">
                <p className="text-sm font-bold">Try Demo Account</p>
                <p className="text-[11px] text-gray-400 font-medium">Explore as guest • Level 5</p>
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all relative z-10 text-primary-500" />
            </motion.button>
          </motion.div>

          {/* Divider */}
          <motion.div 
            className="relative z-10 flex items-center gap-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <motion.div 
              className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
              or sign in with email
            </span>
            <motion.div 
              className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            />
          </motion.div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              fullWidth
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              fullWidth
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              helperText={!isLogin ? 'Password must be at least 8 characters' : undefined}
            />

            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              size="lg"
              className="mt-6"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <motion.div 
            className="mt-8 text-center relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <motion.button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold text-primary-600 dark:text-primary-400 hover:underline relative"
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
  );
}
