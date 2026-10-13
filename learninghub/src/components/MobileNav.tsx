import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Code2,
  Brain,
  BarChart3,
  BookOpen,
  Library,
  Swords,
  RotateCcw,
  Calendar,
  Layers,
  Trophy,
  BellRing,
  Settings,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useStore } from '../stores/useStore'

const authPrimaryNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/problems', icon: Code2, label: 'Practice' },
  { to: '/tests-a', icon: Brain, label: 'Tests A+' },
  { to: '/analytics', icon: BarChart3, label: 'Stats' },
]

const publicNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/updates', icon: BellRing, label: 'Updates' },
  { to: '/pricing', icon: BookOpen, label: 'Pricing' },
  { to: '/auth', icon: Library, label: 'Sign In' },
]

const moreFeatureItems = [
  {
    to: '/arena',
    icon: Swords,
    label: '1v1 Arena Duel',
    desc: 'Live head-to-head coding',
    badge: 'Live',
    badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
  },
  {
    to: '/revision',
    icon: RotateCcw,
    label: 'Spaced Revision',
    desc: 'FSRS active recall flashcards',
    badge: 'FSRS',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    to: '/study-planner',
    icon: Calendar,
    label: 'Study Planner',
    desc: 'Adaptive dynamic syllabus',
    badge: 'AI Plan',
    badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    to: '/visualizer',
    icon: Layers,
    label: 'DSA Visualizer',
    desc: 'Interactive step-by-step algorithms',
    badge: 'Interactive',
    badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40',
  },
  {
    to: '/contest',
    icon: Trophy,
    label: 'Contests',
    desc: 'Global competitive leaderboards',
    badge: 'Ranked',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
  },
  {
    to: '/library',
    icon: Library,
    label: 'Library & Ebooks',
    desc: 'Courses, textbooks & notes',
    badge: 'Free',
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
  },
  {
    to: '/updates',
    icon: BellRing,
    label: 'Platform Updates',
    desc: 'Changelogs, announcements & alerts',
    badge: 'New',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
  },
  {
    to: '/settings',
    icon: Settings,
    label: 'Account Settings',
    desc: 'Preferences, security & profile',
    badge: null,
    badgeColor: '',
    color: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
  },
]

export default function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAuthenticated = useStore(s => s.auth.isAuthenticated)
  const location = useLocation()
  const navigate = useNavigate()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  // Determine if a "More" item is currently active
  const isMoreItemActive = moreFeatureItems.some(item => location.pathname.startsWith(item.to))

  if (!isAuthenticated) {
    return (
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
        aria-label="Mobile navigation"
      >
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-700/30 shadow-[0_-4px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-4px_30px_rgb(0,0,0,0.3)]" />
        <div className="relative flex items-center justify-around gap-0.5 px-1 py-1 h-[68px] overflow-hidden">
          {publicNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-2xl transition-all duration-300 min-w-0 flex-1 max-w-[72px] relative group',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
                )
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-bg"
                      className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-2xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.75 }}
                    transition={{ duration: 0.1 }}
                    className="relative z-10 p-1"
                  >
                    <Icon
                      className={cn(
                        'w-[22px] h-[22px] transition-all duration-300',
                        isActive && 'scale-110'
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      aria-hidden="true"
                    />
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-tight transition-all duration-300 relative z-10 whitespace-nowrap overflow-hidden text-ellipsis',
                      isActive ? 'font-bold opacity-100' : 'opacity-70'
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <>
      {/* Quick Launcher Bottom Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl border-t border-gray-200 dark:border-gray-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-8"
              role="dialog"
              aria-modal="true"
              aria-label="All features menu"
            >
              {/* Drag Pill & Header */}
              <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800/80">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-3" />
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Platform Features
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        Quick access to all practice & learning modules
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Grid of Features */}
              <div className="overflow-y-auto px-4 py-4 space-y-2 max-h-[calc(85vh-100px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {moreFeatureItems.map(item => {
                    const ItemIcon = item.icon
                    const isCurrent = location.pathname.startsWith(item.to)
                    return (
                      <button
                        key={item.to}
                        onClick={() => {
                          setDrawerOpen(false)
                          navigate(item.to)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all duration-200',
                          isCurrent
                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800'
                            : 'bg-gray-50/60 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('p-2.5 rounded-xl shrink-0', item.color)}>
                            <ItemIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 text-[9px] font-bold rounded-md border shrink-0',
                                    item.badgeColor
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Bottom Nav Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
        aria-label="Mobile navigation"
      >
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-700/30 shadow-[0_-4px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-4px_30px_rgb(0,0,0,0.3)]" />

        <div className="relative flex items-center justify-around gap-0.5 px-1 py-1 h-[68px] overflow-hidden">
          {authPrimaryNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all duration-300 min-w-0 flex-1 max-w-[68px] relative group',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
                )
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-bg"
                      className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-2xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <motion.div
                    whileTap={{ scale: 0.75 }}
                    transition={{ duration: 0.1 }}
                    className="relative z-10 p-1"
                  >
                    <Icon
                      className={cn(
                        'w-[22px] h-[22px] transition-all duration-300',
                        isActive && 'scale-110'
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      aria-hidden="true"
                    />
                  </motion.div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold tracking-tight transition-all duration-300 relative z-10 whitespace-nowrap overflow-hidden text-ellipsis',
                      isActive ? 'font-bold opacity-100' : 'opacity-70'
                    )}
                  >
                    {label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-dot"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* More Launcher Button */}
          <button
            onClick={() => setDrawerOpen(prev => !prev)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all duration-300 min-w-0 flex-1 max-w-[68px] relative group',
              isMoreItemActive || drawerOpen
                ? 'text-primary-600 dark:text-primary-400 font-bold'
                : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
            )}
            aria-label="More features"
            aria-expanded={drawerOpen}
          >
            {(isMoreItemActive || drawerOpen) && (
              <motion.div
                layoutId="mobile-nav-more-bg"
                className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-2xl"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            <motion.div
              whileTap={{ scale: 0.75 }}
              transition={{ duration: 0.1 }}
              className="relative z-10 p-1"
            >
              <Sparkles
                className={cn(
                  'w-[22px] h-[22px] transition-all duration-300',
                  (isMoreItemActive || drawerOpen) && 'scale-110'
                )}
                strokeWidth={isMoreItemActive || drawerOpen ? 2.5 : 1.8}
                aria-hidden="true"
              />
            </motion.div>

            <span
              className={cn(
                'text-[10px] font-semibold tracking-tight transition-all duration-300 relative z-10 whitespace-nowrap overflow-hidden text-ellipsis',
                isMoreItemActive || drawerOpen ? 'font-bold opacity-100' : 'opacity-70'
              )}
            >
              More
            </span>

            {isMoreItemActive && (
              <motion.div
                layoutId="mobile-nav-dot"
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        </div>
      </nav>
    </>
  )
}
