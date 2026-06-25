import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Shield, Zap, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { subscriptionService, SubscriptionTier } from '../services/subscriptionService'
import { useStore } from '../stores/useStore'
import AnimatedPage from '../components/AnimatedPage'

export default function PricingPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const navigate = useNavigate()
  const auth = useStore(state => state.auth)
  const addToast = useStore(state => state.addToast)

  useEffect(() => {
    const loadTiers = async () => {
      try {
        const data = await subscriptionService.getTiers()
        setTiers(data)
      } catch {
        addToast({ message: 'Failed to load subscription tiers', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    void loadTiers()
  }, [addToast])

  const handleSubscribe = async (tierId: string) => {
    if (!auth.isAuthenticated) {
      addToast({ message: 'Please log in to subscribe.', type: 'info' })
      navigate('/auth?mode=login')
      return
    }

    try {
      setLoadingTier(tierId)
      const checkoutUrl = await subscriptionService.createCheckoutSession(tierId)
      window.location.href = checkoutUrl // Redirect to Stripe (or mock success)
    } catch {
      addToast({ message: 'Failed to initiate checkout', type: 'error' })
      setLoadingTier(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Pricing & Plans"
        description="Choose the perfect plan for your learning journey."
      />

      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" /> Unlock Your Potential
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight"
          >
            Invest in your future.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 dark:text-gray-400"
          >
            Simple, transparent pricing. Upgrade anytime. Cancel anytime.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={`relative flex flex-col p-8 rounded-[2rem] border-2 transition-all duration-300 ${
                tier.isPopular
                  ? 'bg-white dark:bg-gray-800 border-primary-500 shadow-2xl shadow-primary-500/20 scale-105 z-10'
                  : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-xl'
              }`}
            >
              {tier.isPopular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-primary-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <Zap className="w-3 h-3 fill-current" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm h-10">{tier.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-black text-gray-900 dark:text-white">
                  ${tier.price}
                </span>
                {tier.price > 0 && (
                  <span className="text-gray-500 font-medium">/{tier.interval}</span>
                )}
              </div>

              <Button
                variant={tier.isPopular ? 'primary' : 'outline'}
                className="w-full mb-8 py-4 rounded-xl font-bold"
                onClick={() => handleSubscribe(tier.id)}
                disabled={loadingTier !== null}
              >
                {loadingTier === tier.id
                  ? 'Processing...'
                  : tier.price === 0
                    ? 'Start Free'
                    : 'Subscribe Now'}
              </Button>

              <div className="space-y-4 flex-1">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center max-w-2xl mx-auto">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Enterprise-Grade Security
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            All payments are processed securely via Stripe. We do not store your credit card
            information.
          </p>
        </div>
      </div>
    </AnimatedPage>
  )
}
