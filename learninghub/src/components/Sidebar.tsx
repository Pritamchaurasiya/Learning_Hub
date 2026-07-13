import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Bookmark,
  Award,
  Flame,
  X,
  Code2,
  Brain,
  Trophy,
  Library,
  BarChart3,
  Settings,
  User,
  Shield,
  Gauge,
  Sparkles,
  History,
  MessageSquare,
  Bot,
  ScrollText,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { useBreakpoint } from '../hooks/useMediaQuery'

interface NavSection {
  label: string
  items: { to: string; icon: typeof Home; label: string }[]
  defaultOpen?: boolean
}

export default function Sidebar() {
  const sidebarOpen = useStore(s => s.sidebarOpen)
  const setSidebarOpen = useStore(s => s.setSidebarOpen)
  const progress = useStore(s => s.progress)
  const auth = useStore(s => s.auth)
  const isDesktop = useBreakpoint('lg')

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Practice: true,
    Community: true,
    'AI & Tools': true,
    Account: false,
  })

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const userRole = (auth.user?.role ?? '').toUpperCase()
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN'

  const mainNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Explore' },
    { to: '/library', icon: Library, label: 'My Library' },
    ...(isAdmin
      ? [
          { to: '/admin', icon: Shield, label: 'Admin Panel' },
          { to: '/admin/ai-lab', icon: Sparkles, label: 'AI Workshop' },
          { to: '/monitoring', icon: Gauge, label: 'System Health' },
        ]
      : []),
  ]

  const sections: NavSection[] = [
    {
      label: 'Practice',
      defaultOpen: true,
      items: [
        { to: '/problems', icon: Code2, label: 'DSA Practice' },
        { to: '/tests-a', icon: Brain, label: 'Tests A+' },
        { to: '/tests-a-history', icon: History, label: 'Test History' },
        { to: '/contest', icon: Trophy, label: 'Contests' },
        { to: '/leaderboard', icon: BarChart3, label: 'Leaderboard' },
      ],
    },
    {
      label: 'Community',
      defaultOpen: true,
      items: [{ to: '/discussions', icon: MessageSquare, label: 'Discussions' }],
    },
    {
      label: 'AI & Tools',
      defaultOpen: true,
      items: [
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/ai-tutor', icon: Bot, label: 'AI Tutor' },
      ],
    },
    {
      label: 'Account',
      defaultOpen: false,
      items: [
        { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
        { to: '/achievements', icon: Award, label: 'Achievements' },
        { to: '/profile', icon: User, label: 'Profile' },
        { to: '/settings', icon: Settings, label: 'Settings' },
        { to: '/certificates', icon: ScrollText, label: 'Certificates' },
      ],
    },
  ]

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  }

  const closeMobileSidebar = () => {
    if (!isDesktop) {
      setSidebarOpen(false)
    }
  }

  const xpForNextLevel = Math.max(1, progress.level * 100)
  const xpInLevel = progress.xp % xpForNextLevel
  const xpProgress = Math.min(100, (xpInLevel / xpForNextLevel) * 100)

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            role="button"
            aria-label="Close sidebar"
            tabIndex={0}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isDesktop || sidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed lg:static inset-y-0 left-0 z-[70] w-72 glass-strong border-r flex flex-col overflow-hidden lg:shadow-none lg:translate-x-0"
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/40 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/25">
              L
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none">
                LearningHub
              </h2>
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Pro Platform
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Streak indicator */}
        {progress.streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight">
                  {progress.streak} Day Streak!
                </span>
                <span className="text-[10px] text-white/80">You&apos;re doing great!</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {/* Main nav items */}
          <div className="mb-4">
            {mainNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 relative overflow-hidden mb-1 ${
                    isActive
                      ? 'text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5'
                  }`
                }
                onClick={closeMobileSidebar}
              >
                {({ isActive }) => (
                  <>
                    {/* Active route indicator background */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-main-bg"
                        className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 rounded-xl"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`w-5 h-5 relative z-10 transition-colors duration-300 ${
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-500'
                      }`}
                    />
                    <span className="relative z-10 text-sm">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Collapsible sections */}
          {sections.map(section => {
            const isOpen = openSections[section.label] ?? section.defaultOpen ?? true
            return (
              <div key={section.label} className="mb-3">
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-4 py-1.5 group cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                    {section.label}
                  </h3>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-1">
                        {section.items.map(({ to, icon: Icon, label }) => (
                          <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                              `group flex items-center gap-3 px-4 py-2 rounded-xl mb-0.5 font-medium transition-all duration-300 relative overflow-hidden ${
                                isActive
                                  ? 'text-primary-700 dark:text-primary-300'
                                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5'
                              }`
                            }
                            onClick={closeMobileSidebar}
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <motion.div
                                    layoutId="sidebar-section-bg"
                                    className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 rounded-xl"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  />
                                )}
                                <Icon
                                  className={`w-4 h-4 relative z-10 transition-colors duration-300 ${
                                    isActive
                                      ? 'text-primary-600 dark:text-primary-400'
                                      : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-500'
                                  }`}
                                />
                                <span className="relative z-10 text-sm">{label}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* Learning Path */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-3 px-4">
              Learning Path
            </h3>

            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Browse courses from the{' '}
                <NavLink
                  to="/search"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                  onClick={closeMobileSidebar}
                >
                  Course Catalog
                </NavLink>
              </p>
            </div>
          </div>
        </nav>

        {/* Bottom profile card with XP progress */}
        <div className="p-4 border-t border-gray-200/60 dark:border-gray-700/40 shrink-0 bg-gray-50/50 dark:bg-gray-800/20">
          {/* Mini profile */}
          <NavLink
            to="/profile"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(auth.user?.username ?? 'L')[0].toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                {auth.user?.username ?? 'Learner'}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Level {progress.level}
              </p>
            </div>
          </NavLink>

          {/* XP Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                {progress.xp} XP
              </span>
              <span>
                {xpInLevel}/{xpForNextLevel} to Lv.{progress.level + 1}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-600 to-purple-600 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
              <span>{progress.completedCourses.length} Completed</span>
              <span>{progress.streak > 0 ? `🔥 ${progress.streak}d` : 'No streak'}</span>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
