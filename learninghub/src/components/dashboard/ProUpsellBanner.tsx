import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Zap, ArrowRight, Clock, X, CheckCircle2, Users } from 'lucide-react'
import { subscriptionService } from '../../services/subscriptionService'
import { useStore } from '../../stores/useStore'

const SNOOZE_KEY = 'lh_pro_upsell_snooze_until'

export function ProUpsellBanner() {
  const navigate = useNavigate()
  const auth = useStore(state => state.auth)

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      const snoozed = localStorage.getItem(SNOOZE_KEY)
      if (snoozed && Number(snoozed) > Date.now()) {
        return true
      }
    } catch {}
    return false
  })

  const [isLoading, setIsLoading] = useState(false)

  // 4-hour countdown timer simulating a live flash sale window
  const [timeLeft, setTimeLeft] = useState<{ hours: number; mins: number; secs: number }>({
    hours: 3,
    mins: 42,
    secs: 18,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 }
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, mins: 59, secs: 59 }
        return { hours: 3, mins: 59, secs: 59 } // reset loop
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      // Snooze for 24 hours
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
    } catch {}
  }

  const handleUpgrade = async () => {
    if (!auth.isAuthenticated) {
      navigate('/auth?mode=login')
      return
    }

    try {
      setIsLoading(true)
      const checkoutUrl = await subscriptionService.createCheckoutSession('pro')
      window.location.href = checkoutUrl
    } catch {
      // Fallback navigate to pricing page
      navigate('/pricing')
    } finally {
      setIsLoading(false)
    }
  }

  if (isDismissed || Boolean(auth.user?.isPro)) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.98 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-violet-950/80 via-slate-900/90 to-indigo-950/80 backdrop-blur-2xl border border-violet-500/30 dark:border-violet-400/20 shadow-2xl shadow-indigo-950/40"
        data-testid="pro-upsell-banner"
      >
        {/* Iridescent shimmer overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.25),rgba(255,255,255,0))] pointer-events-none" />

        {/* Ambient floating blur orb */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left info column */}
          <div className="space-y-3 max-w-2xl">
            {/* Top badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scholar Pro Flash Offer • 40% OFF</span>
              </span>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.mins).padStart(2, '0')}
                  :{String(timeLeft.secs).padStart(2, '0')}
                </span>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>8,420+ scholars upgraded</span>
              </span>
            </div>

            {/* Headline */}
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                Unlock All 15+ Advanced AI Simulators & FAANG Mock Banks
              </h2>
              <p className="text-xs md:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                Supercharge your career readiness with unlimited adaptive diagnostic tests, Socratic
                AI tutoring, code sandboxes, and verified blockchain certificates.
              </p>
            </div>

            {/* Highlights Checklist */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                1,000+ Curated Interview Problems
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                3PL Adaptive IRT Test Engine
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Personalized Career Mentorship
              </span>
            </div>
          </div>

          {/* Right Action column */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <div className="text-center sm:text-right lg:text-right">
              <div className="flex items-baseline justify-center sm:justify-end gap-1.5">
                <span className="text-2xl md:text-3xl font-black text-white">$19</span>
                <span className="text-xs text-slate-400 line-through">$32</span>
                <span className="text-xs font-bold text-slate-300">/ month</span>
              </div>
              <span className="text-[10px] text-amber-400 font-bold block">
                ⚡ Only 3 scholarship slots remaining today
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>{isLoading ? 'Processing...' : 'Claim 40% Off & Upgrade'}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={handleDismiss}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title="Dismiss offer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
