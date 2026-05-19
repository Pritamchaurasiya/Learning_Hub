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
  Video,
  Settings,
  User,
  Shield,
  Gauge,
  History,
} from 'lucide-react'
import { useStore } from '../stores/useStore'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, progress, auth } = useStore()

  const mainNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/library', icon: Library, label: 'Library' },
    ...((auth.user?.role ?? '').toUpperCase() === 'ADMIN' ||
    (auth.user?.role ?? '').toUpperCase() === 'SUPERADMIN'
      ? [
          { to: '/admin', icon: Shield, label: 'Admin Panel' },
          { to: '/monitoring', icon: Gauge, label: 'System Health' },
        ]
      : []),
  ]

  const practiceNavItems = [
    { to: '/problems', icon: Code2, label: 'DSA Practice' },
    { to: '/tests-a', icon: Brain, label: 'Tests A+' },
    { to: '/tests-a-history', icon: History, label: 'Test History' },
    { to: '/contest', icon: Trophy, label: 'Contests' },
    { to: '/leaderboard', icon: BarChart3, label: 'Leaderboard' },
  ]

  const communityNavItems = [{ to: '/live-class', icon: Video, label: 'Live Classes' }]

  const aiNavItems = [{ to: '/analytics', icon: BarChart3, label: 'Analytics' }]

  const accountNavItems = [
    { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { to: '/achievements', icon: Award, label: 'Achievements' },
    { to: '/quiz-history', icon: History, label: 'Quiz History' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const totalCourses =
    progress.completedCourses.length > 0 ? progress.completedCourses.length * 2 : 20 // Temporary mock until API provides total
  const overallProgress = Math.round((progress.completedCourses.length / totalCourses) * 100) || 0

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            role="button"
            aria-label="Close sidebar"
            tabIndex={0}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed lg:static inset-y-0 left-0 z-[70] w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/40 flex flex-col overflow-hidden shadow-2xl lg:shadow-none"
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/60 dark:border-gray-700/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20">
              L
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              LearningHub
            </h2>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-5 h-5 animate-pulse-subtle" />
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
          <div className="mb-6">
            {mainNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1
                  transition-all duration-300 group
                  ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm font-medium">{label}</span>
              </NavLink>
            ))}
          </div>

          {[
            { label: 'Practice', items: practiceNavItems },
            { label: 'Community', items: communityNavItems },
            { label: 'AI & Tools', items: aiNavItems },
            { label: 'Account', items: accountNavItems },
          ].map(section => (
            <div key={section.label} className="mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-2 px-4">
                {section.label}
              </h3>
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-xl mb-0.5
                    transition-all duration-300 group
                    ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-sm font-medium">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Learning Path */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-3 px-4">
              Learning Path
            </h3>

            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Browse courses from the{' '}
                <NavLink
                  to="/courses"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                  onClick={() => setSidebarOpen(false)}
                >
                  Course Catalog
                </NavLink>
              </p>
            </div>
          </div>
        </nav>

        {/* Bottom stats */}
        <div className="p-5 border-t border-gray-200/60 dark:border-gray-700/40 shrink-0 bg-gray-50/50 dark:bg-gray-800/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            <span>Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              className="h-full bg-primary-600 rounded-full"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>{progress.completedCourses.length} Courses</span>
            <span>Level {progress.level}</span>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
