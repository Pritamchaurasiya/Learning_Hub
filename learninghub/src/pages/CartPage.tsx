import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, CreditCard, Check, BookOpen, Clock, Star } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cartService, type CartItem } from '../services/cartService'
import { useStore } from '../stores/useStore'

export default function CartPage() {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const { addToast } = useStore()

  const fetchCart = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await cartService.getCart({ signal })
      if (!signal?.aborted) {
        setCartItems(res.data.items)
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        if (import.meta.env.DEV) {
          console.error('[CartPage] Failed to fetch cart:', err)
        }
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchCart(controller.signal)
    return () => controller.abort()
  }, [fetchCart])

  const subtotal = cartItems.reduce((sum, item) => sum + item.course.price * item.quantity, 0)
  const discount = appliedPromo ? subtotal * 0.1 : 0
  const total = subtotal - discount

  const removeItem = async (id: string) => {
    try {
      await cartService.removeFromCart(id)
      setCartItems(prev => prev.filter(item => item.id !== id))
      addToast({ message: 'Item removed from cart', type: 'success' })
    } catch (err) {
      addToast({ message: 'Failed to remove item', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[CartPage] Failed to remove item:', err)
      }
    }
  }

  const applyPromo = async () => {
    try {
      await cartService.applyCoupon(promoCode)
      setAppliedPromo(promoCode.toUpperCase())
      addToast({ message: 'Coupon applied successfully!', type: 'success' })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      addToast({ message: 'Invalid coupon code', type: 'error' })
    }
  }

  const checkout = async () => {
    try {
      const res = await cartService.checkout('stripe')
      addToast({ message: 'Redirecting to payment...', type: 'info' })
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url
      }
    } catch (err) {
      addToast({ message: 'Checkout failed', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[CartPage] Checkout failed:', err)
      }
    }
  }

  return (
    <>
      <SEO
        title="Cart - LearningHub"
        description="Review your cart and checkout"
        keywords="cart, checkout, purchase"
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Shopping Cart</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {cartItems.length} course{cartItems.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add courses to get started</p>
            <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-32 h-24 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-8 h-8 text-white/80" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.course.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {item.course.instructor.display_name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Dynamic Duration</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>4.5</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Digital goods: quantity is always 1, no +/- controls */}
                          <span className="text-sm text-gray-500 dark:text-gray-400">Qty: 1</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {item.course.original_price && (
                              <p className="text-sm text-gray-400 line-through">
                                ${item.course.original_price.toFixed(2)}
                              </p>
                            )}
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${(item.course.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            onClick={() => removeItem(item.id)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Discount ({appliedPromo})
                      </span>
                      <span className="font-medium text-green-600">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="font-medium text-gray-900 dark:text-white">$0.00</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-xl text-gray-900 dark:text-white">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mt-6 space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <Button variant="outline" onClick={applyPromo} disabled={!promoCode}>
                      Apply
                    </Button>
                  </div>
                  {appliedPromo && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Promo code applied!
                    </p>
                  )}
                </div>

                {/* Checkout Button */}
                <Button
                  className="w-full mt-6"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  onClick={checkout}
                >
                  Checkout
                </Button>

                {/* Security Note */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  Secure checkout powered by Stripe
                </p>
              </Card>

              {/* Trust Badges */}
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Secure</p>
                  </div>
                  <div>
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Refund</p>
                  </div>
                  <div>
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Support</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
