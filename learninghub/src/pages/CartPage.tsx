import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Lock,
  CreditCard,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { cartService } from '../services/cartService'
import { useStore } from '../stores/useStore'
import AnimatedPage from '../components/AnimatedPage'

export default function CartPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useStore(state => state.addToast)

  const [couponInput, setCouponInput] = useState('')
  const [selectedGateway, setSelectedGateway] = useState<'razorpay' | 'stripe'>('razorpay')

  // Fetch Cart query
  const { data: cartResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
  })

  const cart = cartResponse?.data
  const items = cart?.items || []

  // Remove Item Mutation
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => cartService.removeFromCart(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      addToast({ message: 'Item removed from cart', type: 'info' })
    },
    onError: () => {
      addToast({ message: 'Failed to remove item', type: 'error' })
    },
  })

  // Apply Coupon Mutation
  const couponMutation = useMutation({
    mutationFn: (code: string) => cartService.applyCoupon(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      addToast({ message: 'Coupon applied successfully!', type: 'success' })
      setCouponInput('')
    },
    onError: (err: any) => {
      addToast({
        message: err?.message || 'Invalid or expired coupon code',
        type: 'error',
      })
    },
  })

  // Clear Cart Mutation
  const clearMutation = useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      addToast({ message: 'Cart cleared', type: 'info' })
    },
    onError: () => {
      addToast({ message: 'Failed to clear cart', type: 'error' })
    },
  })

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: () => cartService.checkout(selectedGateway),
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      addToast({
        message: 'Order created successfully! Proceeding to payment...',
        type: 'success',
      })
      if (data?.data?.order_id) {
        navigate(`/dashboard?order_id=${data.data.order_id}&status=success`)
      }
    },
    onError: (err: any) => {
      addToast({
        message: err?.message || 'Checkout failed. Please try again.',
        type: 'error',
      })
    },
  })

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    couponMutation.mutate(couponInput.trim().toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
          Loading your learning cart...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Unable to Load Cart
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 text-sm">
          We encountered an issue while loading your active cart items.
        </p>
        <Button onClick={() => void refetch()} variant="primary">
          Try Again
        </Button>
      </div>
    )
  }

  const isEmpty = items.length === 0

  return (
    <AnimatedPage className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Shopping Cart | LearningHub"
        description="Review your selected courses and proceed to secure checkout."
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-primary-500" />
              Shopping Cart
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {isEmpty
                ? 'Your cart is empty'
                : `${items.length} ${items.length === 1 ? 'course' : 'courses'} ready for enrollment`}
            </p>
          </div>

          {!isEmpty && (
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>

        {/* Content Layout */}
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-white dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 shadow-sm"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center text-primary-500 mb-6">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your cart is waiting for knowledge
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm mb-8">
              Explore our comprehensive library of computer science courses, tests, and masterclasses to level up your career.
            </p>
            <Button
              variant="primary"
              className="px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
              onClick={() => navigate('/library')}
            >
              Explore Course Catalog <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Thumbnail + Details */}
                    <div className="flex items-center gap-4 min-w-0">
                      {item.course.thumbnail ? (
                        <img
                          src={item.course.thumbnail}
                          alt={item.course.title}
                          className="w-20 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-indigo-500/20 border border-primary-200 dark:border-primary-800/40 flex items-center justify-center shrink-0">
                          <Sparkles className="w-6 h-6 text-primary-500" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug line-clamp-1">
                          {item.course.title}
                        </h3>
                        {item.course.instructor?.display_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            By {item.course.instructor.display_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                            Instant Access
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Remove Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-gray-700">
                      <div className="text-left sm:text-right">
                        <div className="text-lg font-black text-gray-900 dark:text-white">
                          ${item.course.price.toFixed(2)}
                        </div>
                        {item.course.original_price &&
                          item.course.original_price > item.course.price && (
                            <span className="text-xs text-gray-400 line-through">
                              ${item.course.original_price.toFixed(2)}
                            </span>
                          )}
                      </div>

                      <button
                        onClick={() => removeMutation.mutate(item.id)}
                        disabled={removeMutation.isPending}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        aria-label={`Remove ${item.course.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 shadow-xl shadow-gray-200/20 dark:shadow-none space-y-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">
                  Order Summary
                </h2>

                {/* Subtotal / Discount / Total breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${(cart?.subtotal ?? 0).toFixed(2)}
                    </span>
                  </div>

                  {cart && cart.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Discount
                        {cart.coupon_code && (
                          <span className="text-xs font-mono uppercase bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                            {cart.coupon_code}
                          </span>
                        )}
                      </span>
                      <span>-${cart.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-baseline">
                    <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-900 dark:text-white">
                        ${(cart?.total ?? 0).toFixed(2)}
                      </div>
                      <span className="text-[11px] text-gray-400 uppercase font-semibold">
                        {cart?.currency || 'USD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coupon Input Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label
                    htmlFor="coupon-code-input"
                    className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-code-input"
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      placeholder="e.g. LEARN50"
                      className="flex-1 px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white uppercase font-mono placeholder:normal-case placeholder:font-sans"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={couponMutation.isPending || !couponInput.trim()}
                      className="px-4 text-xs font-bold rounded-xl"
                    >
                      {couponMutation.isPending ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                </form>

                {/* Payment Gateway Selection */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('razorpay')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedGateway === 'razorpay'
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Razorpay
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('stripe')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedGateway === 'stripe'
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <Lock className="w-4 h-4" /> Stripe
                    </button>
                  </div>
                </div>

                {/* Checkout CTA Button */}
                <Button
                  variant="primary"
                  className="w-full py-4 rounded-2xl font-black text-base shadow-xl shadow-primary-500/25 flex items-center justify-center gap-2"
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    'Processing Checkout...'
                  ) : (
                    <>
                      Complete Checkout <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                {/* Security Trust Badges */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>256-Bit SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                    <span>30-Day Money-Back Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}
