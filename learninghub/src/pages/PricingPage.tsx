import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Shield,
  Zap,
  Sparkles,
  CreditCard,
  ChevronDown,
  Building2,
  Lock,
  ArrowRight,
  Award,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { subscriptionService } from '../services/subscriptionService'
import { useStore } from '../stores/useStore'
import AnimatedPage from '../components/AnimatedPage'

interface FAQItem {
  question: string
  answer: string
}

const FAQS: FAQItem[] = [
  {
    question: 'Can I cancel or pause my subscription anytime?',
    answer:
      'Yes, absolutely. You can cancel your subscription with 1-click inside your Account Settings. Your premium access remains active until the end of the current billing cycle with zero penalty.',
  },
  {
    question: 'What is included in the 15+ Advanced AI Simulators?',
    answer:
      'Pro and Elite scholars get unlimited access to the Socratic AI Tutor, AST Code Sandbox, System Design Distributed Simulator, Adaptive 3PL IRT Mock Exams, and AI Recruiter Dialogue Simulator.',
  },
  {
    question: 'Are the certificates and blockchain attestations verifiable by employers?',
    answer:
      'Yes. Upon passing capstone assessments, you receive a cryptographically signed Zero-Knowledge / SHA-256 verifiable credential that can be attached directly to your LinkedIn or resume.',
  },
  {
    question: 'Do you offer a money-back guarantee?',
    answer:
      'We stand 100% behind our curriculum. If you are not completely satisfied within your first 14 days, contact our support team for an unconditional, prompt full refund.',
  },
]

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const navigate = useNavigate()
  const auth = useStore(state => state.auth)
  const addToast = useStore(state => state.addToast)

  const {
    data: tiers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: () => subscriptionService.getTiers(),
    staleTime: 10 * 60 * 1000,
  })

  const handleSubscribe = async (tierId: string) => {
    if (!auth.isAuthenticated) {
      addToast({ message: 'Please log in to subscribe.', type: 'info' })
      navigate('/auth?mode=login')
      return
    }

    try {
      setLoadingTier(tierId)
      const checkoutUrl = await subscriptionService.createCheckoutSession(tierId)
      window.location.href = checkoutUrl
    } catch {
      addToast({ message: 'Failed to initiate checkout', type: 'error' })
      setLoadingTier(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <ErrorState
          title="Unable to Load Plans"
          message={error?.message ?? 'Failed to load subscription tiers. Please try again.'}
          onRetry={() => void refetch()}
          onGoHome={() => navigate('/dashboard')}
        />
      </div>
    )
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <SEO
        title="Pricing & Plans - LearningHub"
        description="Choose the perfect plan for your learning journey. Transparent pricing, upgrade or cancel anytime."
      />

      {/* Ambient background glow orbs */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary-500/10 dark:bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 right-10 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 font-extrabold text-xs uppercase tracking-wider mb-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Accelerate Your Engineering Career</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight"
          >
            Invest in your future.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-gray-600 dark:text-gray-300"
          >
            Simple, transparent pricing. Upgrade anytime. Cancel anytime.
          </motion.p>

          {/* Annual vs Monthly Toggle Pill */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-bold ${
                !isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              }`}
            >
              Monthly Billing
            </span>

            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800 transition-colors focus:outline-none p-1"
              aria-label="Toggle annual billing"
            >
              <div
                className={`w-5 h-5 rounded-full bg-primary-600 shadow-md transform transition-transform ${
                  isAnnual ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${
                  isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                }`}
              >
                Annual Billing
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Save 25% + 2 Mo Free
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.length === 0 ? (
            <div className="md:col-span-3">
              <EmptyState
                icon={CreditCard}
                title="No Plans Available"
                description="Subscription plans are being updated. Please check back soon."
                actionLabel="Go Home"
                actionHref="/dashboard"
              />
            </div>
          ) : (
            tiers.map((tier, idx) => {
              const displayPrice =
                tier.price === 0
                  ? 0
                  : isAnnual
                    ? Math.round(tier.price * 0.75)
                    : tier.price

              const isPopular = tier.isPopular || (tier as any).popular

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`relative flex flex-col p-8 rounded-[2rem] backdrop-blur-2xl transition-all duration-300 ${
                    isPopular
                      ? 'bg-white/90 dark:bg-slate-900/90 border-2 border-primary-500 shadow-2xl shadow-primary-500/25 scale-105 z-10'
                      : 'bg-white/70 dark:bg-slate-900/60 border border-white/60 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-xl'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-gradient-to-r from-primary-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-primary-600/30">
                        <Zap className="w-3.5 h-3.5 fill-current" /> Most Popular • Recommended
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs min-h-[32px] leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-8 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">
                      ${displayPrice}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">
                        /{tier.interval}
                        {isAnnual && ' (billed annually)'}
                      </span>
                    )}
                  </div>

                  {/* Subscribe Action Button */}
                  <Button
                    variant={isPopular ? 'primary' : 'outline'}
                    className={`w-full mb-8 py-3.5 rounded-2xl font-extrabold text-sm transition-all shadow-md ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white'
                        : ''
                    }`}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === tier.id
                      ? 'Processing...'
                      : tier.price === 0
                        ? 'Start Free'
                        : isPopular
                          ? 'Unlock Pro Scholar'
                          : 'Subscribe Now'}
                  </Button>

                  {/* Features list */}
                  <div className="space-y-3.5 flex-1 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                      Included Capabilities
                    </span>
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold leading-snug">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Trust Badges & Money-back Guarantee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
          <div className="p-6 rounded-3xl bg-white/60 dark:bg-slate-900/50 border border-white/50 dark:border-slate-800 backdrop-blur-xl flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">
                14-Day Money-Back Guarantee
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Full unconditional refund within 14 days if not 100% satisfied.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/60 dark:bg-slate-900/50 border border-white/50 dark:border-slate-800 backdrop-blur-xl flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">
                Bank-Grade Stripe Security
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                256-bit SSL encrypted checkout. No card data stored on our servers.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/60 dark:bg-slate-900/50 border border-white/50 dark:border-slate-800 backdrop-blur-xl flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">
                Verified Credentials
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Blockchain-attested certificates recognized by hiring partners.
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise & University Banner */}
        <div className="max-w-5xl mx-auto rounded-3xl p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/20 shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">
                Engineering Teams & University Cohorts
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Custom SSO authentication, dedicated mentoring workspaces, LMS integration, and
                volume licensing for teams of 5 or more engineers.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/discussions')}
            className="border-white/30 text-white hover:bg-white/10 rounded-2xl px-6 py-3 font-bold text-xs shrink-0 flex items-center gap-2"
          >
            <span>Contact Team Admissions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Frequently Asked Questions Accordion */}
        <div className="max-w-3xl mx-auto space-y-4 pt-4">
          <div className="text-center space-y-1 mb-8">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Everything you need to know about LearningHub plans and billing
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-primary-500' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Guarantee Banner */}
        <div className="text-center max-w-2xl mx-auto pt-8">
          <Shield className="w-10 h-10 text-primary-500 mx-auto mb-3" />
          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            Enterprise-Grade Security & PCI-DSS Compliance
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            All payments are processed securely via Stripe. We do not store your credit card
            information.
          </p>
        </div>
      </div>
    </AnimatedPage>
  )
}
