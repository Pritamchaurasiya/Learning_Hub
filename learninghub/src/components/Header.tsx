import { useState, useRef, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Moon, Sun, Monitor, Trophy, Zap, Menu, X, User, LogOut, Bookmark, Settings, ChevronDown } from 'lucide-react'
import { useStore } from '../stores/useStore'
import ProgressRing from './ui/ProgressRing'

const Header = memo(() => {
  const navigate = useNavigate()
  const { theme, toggleDarkMode, progress, setSidebarOpen, dailyGoal, auth, logout } = useStore()
  const [searchInput, setSearchInput] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ctrl+K / Cmd+K keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        // Desktop: focus the search input
        const searchInput = document.querySelector('form[role="search"] input') as HTMLInputElement
        if (searchInput && window.innerWidth >= 768) {
          searchInput.focus()
        } else {
          // Mobile: open mobile search overlay
          setMobileSearchOpen(true)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`)
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
      case 'dark': return 'Dark mode (click for system)'
      case 'light': return 'Light mode (click for dark)'
      default: return 'System mode (click for light)'
    }
  }

  const dailyProgress = dailyGoal.target > 0
    ? (dailyGoal.progress / dailyGoal.target) * 100
    : 0

  return (
    <header className="h-16 glass-strong bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/40 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-30">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all duration-200"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        <motion.h1
          whileHover={{ scale: 1.02 }}
          className="text-xl font-bold text-gradient cursor-pointer select-none hidden sm:block"
          onClick={() => navigate('/')}
        >
          LearningHub
        </motion.h1>
        <motion.h1
          whileHover={{ scale: 1.02 }}
          className="text-xl font-bold text-gradient cursor-pointer select-none sm:hidden"
          onClick={() => navigate('/')}
        >
          LH
        </motion.h1>
      </div>

      {/* Desktop Search */}
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8" role="search">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses..."
            aria-label="Search courses"
            className="input-field pl-10 pr-16 text-sm w-full bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600" aria-hidden="true">
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
            transition={{ duration: 0.2, ease: "easeOut" }}
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search courses..."
                  aria-label="Search courses"
                  className="input-field pl-10 text-sm w-full"
                  autoFocus
                />
              </div>
            </form>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setMobileSearchOpen(false); setSearchInput('') }}
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
          className="md:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" />
        </motion.button>

        {/* Daily Progress Ring */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden sm:flex items-center cursor-help" 
          title={`Daily Goal: ${dailyGoal.progress}/${dailyGoal.target} XP`}
          aria-label={`Daily Goal Progress: ${dailyGoal.progress} of ${dailyGoal.target} XP`}
          role="img"
        >
          <ProgressRing progress={dailyProgress} size={32} strokeWidth={2.5} />
        </motion.div>

        {/* XP & Level badges */}
        <div className="hidden sm:flex items-center gap-2" role="status" aria-live="polite">
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40" 
            aria-label={`${progress.xp} experience points`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{progress.xp}</span>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40" 
            aria-label={`Level ${progress.level}`}
          >
            <Trophy className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Lv.{progress.level}</span>
          </motion.div>
        </div>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleDarkMode}
          className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label={themeLabel()}
          title={themeLabel()}
        >
          {themeIcon()}
        </motion.button>

        {/* User Menu Dropdown */}
        {auth?.isAuthenticated && (
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
              aria-label="User menu"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden border border-primary-200 dark:border-primary-800/50">
                <User className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" />
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-56 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Account</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{auth.user?.username || 'Learner'}</p>
                  </div>
                  
                  <button
                    onClick={() => { navigate('/profile'); setUserMenuOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { navigate('/bookmarks'); setUserMenuOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    <span>Bookmarks</span>
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => { logout(); navigate('/auth'); }}
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
    </header>
  )
}

Header.displayName = 'Header'
export default Header
