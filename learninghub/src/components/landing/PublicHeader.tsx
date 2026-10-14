import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, BookOpen, Code2, Layers, Keyboard } from 'lucide-react'
import BrandLogo from '../BrandLogo'
import { Button } from '../ui/Button'
import { useStore } from '../../stores/useStore'

interface PublicHeaderProps {
  onOpenShortcuts?: () => void
}

export function PublicHeader({ onOpenShortcuts }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = useStore(s => s.auth.isAuthenticated)

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/90 border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Track Indicator */}
        <div className="flex items-center gap-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
            aria-label="LearningHub Home"
          >
            <BrandLogo size="sm" variant="full" />
          </Link>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            STEM & Systems Studio
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          <Link
            to="/library"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-amber-400" aria-hidden="true" />
            Curriculum & PYQs
          </Link>
          <Link
            to="/problems"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Code2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
            DSA Sandbox
          </Link>
          <Link
            to="/tests-a"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Tests A+ (CBT)
          </Link>
          <Link
            to="/pricing"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/updates"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Notices
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-800 transition-colors"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {isAuthenticated ? (
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2"
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 px-3 py-2"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth?mode=signup')}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2 shadow-sm flex items-center gap-1.5"
              >
                Start Free
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-2 text-slate-400 hover:text-white"
              aria-label="Shortcuts"
            >
              <Keyboard className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg text-slate-300 hover:bg-slate-900 focus:outline-none flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/library"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-200"
          >
            Curriculum & PYQs
          </Link>
          <Link
            to="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-200"
          >
            DSA Sandbox
          </Link>
          <Link
            to="/tests-a"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-200"
          >
            Tests A+ (CBT Simulator)
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-200"
          >
            Pricing & Free Tier
          </Link>
          <Link
            to="/updates"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-200"
          >
            Student Notices
          </Link>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/dashboard')
                }}
                className="w-full bg-amber-400 text-slate-950 font-bold"
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
                  className="w-full border-slate-800 text-slate-200 hover:bg-slate-900"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/auth?mode=signup')
                  }}
                  className="w-full bg-amber-400 text-slate-950 font-bold"
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

export default PublicHeader
