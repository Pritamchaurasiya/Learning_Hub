import { useState, useRef, useEffect, memo, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Moon,
  Sun,
  Monitor,
  Trophy,
  Zap,
  Menu,
  X,
  User,
  LogOut,
  Bookmark,
  Settings,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { useShallow } from 'zustand/react/shallow'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import ProgressRing from './ui/ProgressRing'
import { NotificationBell } from './NotificationBell'
import { BrandLogo } from './BrandLogo'
import { ExamContextBadge } from './exam/ExamContextBadge'
import { useLearningContextStore } from '../stores/useLearningContextStore'
import { prefetchRoute } from '../utils/routePrefetchRegistry'

const LevelProgressionModal = lazy(() =>
  import('./gamification/LevelProgressionModal').then(m => ({ default: m.LevelProgressionModal }))
)
const LevelUpCelebrationModal = lazy(() =>
  import('./gamification/LevelUpCelebrationModal').then(m => ({
    default: m.LevelUpCelebrationModal,
  }))
)

const Header = memo(() => {
  const navigate = useNavigate()
  const location = useLocation()
  const activeExam = useLearningContextStore(s => s.activeExam)
  const isUpdatesPage = location.pathname.startsWith('/updates')
  const searchPlaceholder = isUpdatesPage
    ? 'Search student updates, circulars, exams...'
    : activeExam
      ? `Search ${activeExam.name} tests, courses, topics...`
      : 'Search exams, courses, tests...'
  const searchAriaLabel = isUpdatesPage
    ? 'Search student updates and notices'
    : activeExam
      ? `Search ${activeExam.name} resources`
      : 'Search resources'
  const {
    theme,
    toggleDarkMode,
    progressXp,
    progressLevel,
    progressStreak,
    setSidebarOpen,
    dailyGoalProgress,
    dailyGoalTarget,
    isAuthenticated,
    authUsername,
    logout,
  } = useStore(
    useShallow(s => ({
      theme: s.theme,
      toggleDarkMode: s.toggleDarkMode,
      progressXp: s.progress.xp,
      progressLevel: s.progress.level,
      progressStreak: s.progress.streak,
      setSidebarOpen: s.setSidebarOpen,
      dailyGoalProgress: s.dailyGoal.progress,
      dailyGoalTarget: s.dailyGoal.target,
      isAuthenticated: s.auth.isAuthenticated,
      authUsername: s.auth.user?.username,
      logout: s.logout,
    }))
  )
  const [searchInput, setSearchInput] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [progressionModalOpen, setProgressionModalOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(userMenuRef, () => setUserMenuOpen(false))

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  // Escape key handler and focus trap for mobile search overlay
  useEffect(() => {
    if (!mobileSearchOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileSearchOpen(false)
        setSearchInput('')
      }
      // Trap focus inside the search overlay
      if (e.key === 'Tab') {
        const overlay = document.querySelector('[aria-label="Mobile Search"]') as HTMLElement | null
        if (!overlay) return
        const focusable = overlay.querySelectorAll<HTMLElement>('input, button')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Focus the input when overlay opens
    mobileSearchInputRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileSearchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      if (isUpdatesPage) {
        navigate(`/updates?search=${encodeURIComponent(searchInput.trim())}`)
      } else {
        navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
      }
      setSearchInput('')
      setMobileSearchOpen(false)
    }
  }

  const themeIcon = () => {
    switch (theme.mode) {
      case 'dark':
        return <Moon className="w-5 h-5" />
      case 'light':
        return <Sun className="w-5 h-5" />
      default:
        return <Monitor className="w-5 h-5" />
    }
  }

  const themeLabel = () => {
    switch (theme.mode) {
      case 'dark':
        return 'Dark mode (click for system)'
      case 'light':
        return 'Light mode (click for dark)'
      default:
        return 'System mode (click for light)'
    }
  }

  const dailyProgress = dailyGoalTarget > 0 ? (dailyGoalProgress / dailyGoalTarget) * 100 : 0

  return (
    <header
      className={`h-16 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-30 transition-all duration-300 ${
        isScrolled
          ? 'glass-strong bg-white/70 dark:bg-slate-900/60 border-b border-gray-200/40 dark:border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all duration-200"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/')
            }
          }}
          onPointerEnter={() => prefetchRoute('/')}
          onTouchStart={() => prefetchRoute('/')}
          className="cursor-pointer flex items-center"
        >
          <BrandLogo size="md" variant="full" badgeText="PRO" className="hidden sm:inline-flex" />
          <BrandLogo size="sm" variant="full" showBadge={false} className="sm:hidden" />
          <span className="sr-only">LearningHub</span>
          <span className="sr-only">LH</span>
        </div>

        <ExamContextBadge className="hidden sm:inline-flex ml-1 sm:ml-2" />
        <ExamContextBadge compact className="sm:hidden ml-1" />
      </div>

      {/* Desktop Search */}
      <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-8" role="search">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onFocus={() => prefetchRoute(isUpdatesPage ? '/updates' : '/search')}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="input-field pl-10 pr-16 text-sm w-full bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
          />
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
            aria-hidden="true"
          >
            Ctrl+K
          </kbd>
        </div>
      </form>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-[100] flex items-center px-4 gap-3"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Search"
          >
            <form onSubmit={handleSearch} className="flex-1" role="search">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  ref={mobileSearchInputRef}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchAriaLabel}
                  className="input-field pl-10 text-sm w-full"
                />
              </div>
            </form>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setMobileSearchOpen(false)
                setSearchInput('')
              }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Mobile search trigger */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMobileSearchOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" />
        </motion.button>

        {/* Daily Progress Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden sm:flex items-center cursor-help"
          title={`Daily Goal: ${dailyGoalProgress}/${dailyGoalTarget} XP`}
          aria-label={`Daily Goal Progress: ${dailyGoalProgress} of ${dailyGoalTarget} XP`}
          role="img"
        >
          <ProgressRing progress={dailyProgress} size={32} strokeWidth={2.5} />
        </motion.div>

        {/* XP & Level badges */}
        <div className="hidden sm:flex items-center gap-2" role="status" aria-live="polite">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setProgressionModalOpen(true)}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
            title="Click to view Cognitive Level & Progression Matrix"
            aria-label={`${progressXp} experience points. Click to view level progression.`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {progressXp}
            </span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setProgressionModalOpen(true)}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition-colors"
            title="Click to view Cognitive Level & Progression Matrix"
            aria-label={`Level ${progressLevel}. Click to view level progression.`}
          >
            <Trophy className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              Lv.{progressLevel}
            </span>
          </motion.button>
        </div>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleDarkMode}
          className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all duration-200 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center"
          aria-label={themeLabel()}
          title={themeLabel()}
        >
          {themeIcon()}
        </motion.button>

        {/* Notification Bell */}
        {isAuthenticated && <NotificationBell />}

        {/* Shopping Cart */}
        {isAuthenticated && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/cart')}
            onPointerEnter={() => prefetchRoute('/cart')}
            onTouchStart={() => prefetchRoute('/cart')}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center relative"
            aria-label="View shopping cart"
          >
            <ShoppingBag className="w-5 h-5" />
          </motion.button>
        )}

        {/* Unauthenticated CTAs */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/auth')}
              onPointerEnter={() => prefetchRoute('/auth')}
              onTouchStart={() => prefetchRoute('/auth')}
              className="px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              onPointerEnter={() => prefetchRoute('/auth')}
              onTouchStart={() => prefetchRoute('/auth')}
              className="hidden sm:inline-flex px-4 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-500/20 transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        )}

        {/* User Menu Dropdown */}
        {isAuthenticated && (
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onPointerEnter={() => {
                prefetchRoute('/profile')
                prefetchRoute('/bookmarks')
                prefetchRoute('/cart')
                prefetchRoute('/settings')
              }}
              onTouchStart={() => {
                prefetchRoute('/profile')
                prefetchRoute('/bookmarks')
                prefetchRoute('/cart')
                prefetchRoute('/settings')
              }}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
              aria-label="User menu"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden border border-primary-200 dark:border-primary-800/50">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-56 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Account
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {authUsername ?? 'Learner'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile')
                      setUserMenuOpen(false)
                    }}
                    onPointerEnter={() => prefetchRoute('/profile')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/bookmarks')
                      setUserMenuOpen(false)
                    }}
                    onPointerEnter={() => prefetchRoute('/bookmarks')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    <span>Bookmarks</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/cart')
                      setUserMenuOpen(false)
                    }}
                    onPointerEnter={() => prefetchRoute('/cart')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <span>Shopping Cart</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setUserMenuOpen(false)
                    }}
                    onPointerEnter={() => prefetchRoute('/settings')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      void logout()
                      navigate('/auth')
                    }}
                    onPointerEnter={() => prefetchRoute('/auth')}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-medium"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Progression & Level Up Modals (Lazy Loaded) */}
      {progressionModalOpen && (
        <Suspense fallback={null}>
          <LevelProgressionModal
            isOpen={progressionModalOpen}
            onClose={() => setProgressionModalOpen(false)}
            currentXp={progressXp}
            streak={progressStreak}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <LevelUpCelebrationModal />
      </Suspense>
    </header>
  )
})
Header.displayName = 'Header'
export default Header
