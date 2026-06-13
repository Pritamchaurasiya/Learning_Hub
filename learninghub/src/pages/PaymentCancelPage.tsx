import { useNavigate } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function PaymentCancelPage() {
  const navigate = useNavigate()

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-32 pb-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 border-none shadow-xl rounded-3xl bg-white dark:bg-gray-900 text-center relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
              Payment Cancelled
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
              Your payment process was cancelled and no charges were made. You can try again
              whenever you are ready.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                onClick={() => navigate('/cart')}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/20"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Browse Courses
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  )
}
