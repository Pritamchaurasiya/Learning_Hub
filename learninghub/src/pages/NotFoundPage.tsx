import { useNavigate } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <AnimatedPage className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <SEO title="Page Not Found" description="The page you are looking for does not exist." />
      <div className="relative mb-8">
        <span className="text-[120px] md:text-[160px] font-bold text-gradient select-none leading-none">
          404
        </span>
        <div className="absolute inset-0 blur-3xl opacity-15 bg-gradient-to-br from-primary-500 via-purple-500 to-rose-500 rounded-full" aria-hidden="true" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-3">Page Not Found</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
        Let's get you back on track.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-md">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Go Back
        </Button>
        <Button
          onClick={() => navigate('/')}
          leftIcon={<Home className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Home
        </Button>
      </div>
    </AnimatedPage>
  )
}
