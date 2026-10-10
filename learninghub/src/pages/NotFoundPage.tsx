import { useNavigate, Link } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Home, ArrowLeft, BookOpen, Code2, Sparkles, Bell } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <AnimatedPage className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-12">
      <SEO
        title="404: Page Not Found | LearningHub"
        description="The requested page could not be found. Explore our course library, DSA practice problems, or student updates."
        noindex={true}
      />
      <div className="relative mb-6">
        <span className="text-[100px] sm:text-[140px] md:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 select-none leading-none tracking-tight">
          404
        </span>
        <div
          className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-br from-primary-500 via-purple-500 to-rose-500 rounded-full"
          aria-hidden="true"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
        The page you are looking for might have been removed, renamed, or is temporarily unavailable. Let&apos;s get you back on track to your learning journey.
      </p>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-md mb-12">
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
          className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
        >
          Return Home
        </Button>
      </div>

      {/* Helpful Quick Links (Crawl Budget & User Retention) */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-4">
          Popular Destinations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/library"
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 group"
          >
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Course Library</span>
          </Link>
          <Link
            to="/problems"
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 group"
          >
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 group-hover:scale-110 transition-transform">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">DSA Practice</span>
          </Link>
          <Link
            to="/pricing"
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 group"
          >
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Pro Plans</span>
          </Link>
          <Link
            to="/updates"
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Notices</span>
          </Link>
        </div>
      </div>
    </AnimatedPage>
  )
}
