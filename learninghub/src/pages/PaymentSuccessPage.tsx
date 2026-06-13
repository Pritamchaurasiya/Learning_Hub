import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { CheckCircle, ArrowRight, BookOpen } from 'lucide-react'
import { useStore } from '../stores/useStore'

export default function PaymentSuccessPage() {
  const addToast = useStore(state => state.addToast)
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const navigate = useNavigate()

  const [isVerifying, setIsVerifying] = useState(true)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setIsVerifying(false)
      return
    }

    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ session_id: sessionId }),
        })

        const data = await response.json()
        if (data.status === 'success' && data.data?.status === 'paid') {
          setIsVerified(true)
          addToast({
            message: 'Payment successful! You have been enrolled.',
            type: 'success',
          })
        } else {
          setIsVerified(false)
          addToast({
            message: 'Payment verification is still processing. Check your email.',
            type: 'info',
          })
        }
      } catch (error) {
        console.error('Failed to verify session', error)
        setIsVerified(false)
      } finally {
        setIsVerifying(false)
      }
    }

    void verifySession()
  }, [sessionId, addToast])

  if (isVerifying) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-32 pb-12 px-4 flex items-center justify-center">
          <Card className="max-w-md w-full p-8 border-none shadow-xl rounded-3xl bg-white dark:bg-gray-900 text-center flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-bold">Verifying Payment...</h2>
            <p className="text-gray-500 mt-2">Please wait while we confirm your enrollment.</p>
          </Card>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-32 pb-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 border-none shadow-xl rounded-3xl bg-white dark:bg-gray-900 text-center relative overflow-hidden">
          {/* Confetti decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-20 h-20 ${isVerified ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'} rounded-full flex items-center justify-center mb-6`}
            >
              <CheckCircle className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
              {isVerified ? 'Payment Successful!' : 'Payment Pending'}
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
              {isVerified
                ? 'Thank you for your purchase. Your payment has been processed and you are now officially enrolled in the course.'
                : 'We have received your order, but payment confirmation is still pending from the gateway.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                onClick={() => navigate('/library')}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/20"
              >
                <BookOpen className="w-5 h-5" />
                Go to My Courses
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  )
}
