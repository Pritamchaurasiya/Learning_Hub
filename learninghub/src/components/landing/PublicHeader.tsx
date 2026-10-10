import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, BookOpen, Code2, Sparkles, Layers } from 'lucide-react'
import BrandLogo from '../BrandLogo'
import { Button } from '../ui/Button'
import { useStore } from '../../stores/useStore'

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = useStore(s => s.auth.isAuthenticated)

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/80 dark:border-gray-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg p-1"
          aria-label="LearningHub Home"
        >
          <BrandLogo size="sm" variant="full" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          <Link
            to="/library"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-blue-500" aria-hidden="true" />
            Courses & Library
          </Link>
          <Link
            to="/problems"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5"
          >
            <Code2 className="w-4 h-4 text-indigo-500" aria-hidden="true" />
            DSA Practice
          </Link>
          <Link
            to="/tests-a"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-purple-500" aria-hidden="true" />
            Tests A+
          </Link>
          <Link
            to="/pricing"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
            Pricing
          </Link>
          <Link
            to="/updates"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Notices
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm px-5 py-2 min-h-[44px] min-w-[44px]"
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] px-4"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth?mode=signup')}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm px-4 min-h-[44px] min-w-[44px] shadow-sm flex items-center gap-1.5"
              >
                Start Free
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/library"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            Courses & Library
          </Link>
          <Link
            to="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            DSA Practice
          </Link>
          <Link
            to="/tests-a"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            Tests A+
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            Pricing & Plans
          </Link>
          <Link
            to="/updates"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            Student Updates
          </Link>
          <Link
            to="/verify-certificate"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            Verify Certificate
          </Link>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/dashboard')
                }}
                className="w-full bg-primary-600 text-white min-h-[44px]"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/auth')
                  }}
                  className="w-full min-h-[44px]"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/auth?mode=signup')
                  }}
                  className="w-full bg-primary-600 text-white min-h-[44px]"
                >
                  Start Free Practice
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
