import { useState } from 'react'
import { PrefetchNavLink } from './PrefetchNavLink'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Bookmark,
  Award,
  Flame,
  X,
  Code2,
  Swords,
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
  ChevronDown,
  Zap,
  Video,
  Calendar,
  Download,
  CreditCard,

  BellRing,
  FileText,
  Briefcase,
  Users,
  CheckSquare,
  LifeBuoy,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { useBreakpoint } from '../hooks/useMediaQuery'
import BrandLogo from './BrandLogo'
import { calculateLevel, calculateXpForLevel } from '../utils/number'

interface NavSection {
  label: string
  items: { to: string; icon: typeof Home; label: string }[]
  defaultOpen?: boolean
}

export default function Sidebar() {
  const sidebarOpen = useStore(s => s.sidebarOpen)
  const setSidebarOpen = useStore(s => s.setSidebarOpen)
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const currentXp = useStore(s => s.progress.xp || 0)
  const streak = useStore(s => s.progress.streak || 0)
  const completedCoursesCount = useStore(s => s.progress.completedCourses?.length || 0)
  const userRole = useStore(s => (s.auth.user?.role ?? '').toUpperCase())
  const username = useStore(s => s.auth.user?.username ?? 'Learner')
  const isDesktop = useBreakpoint('lg') // Synced with lg (>=1024px) for desktop docked sidebar

  // Collapsible sections state - default secondary sections to collapsed to avoid overwhelming 20+ item clutter
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Practice: true,
    Community: false,
    'Study Tools & Mentorship': false,
    Account: false,
  })

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isAdmin = ['ADMIN', 'SUPERADMIN', 'MODERATOR', 'INSTRUCTOR'].includes(userRole)

  const mainNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Explore' },
    { to: '/updates', icon: BellRing, label: 'Student Updates' },
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
        { to: '/arena', icon: Swords, label: '1v1 Arena Duel' },
        { to: '/interview', icon: Bot, label: 'Technical Mock Interview' },
        { to: '/resume', icon: FileText, label: 'Verifiable Career Resume' },
        { to: '/career', icon: Briefcase, label: 'Recruiter Simulation & Jobs' },
        { to: '/tests-a', icon: Brain, label: 'Tests A+' },
        { to: '/revision', icon: Zap, label: 'Spaced Revision' },
        { to: '/tests-a-history', icon: History, label: 'Test History' },
        { to: '/contest', icon: Trophy, label: 'Contests' },
        { to: '/leaderboard', icon: BarChart3, label: 'Leaderboard' },
      ],
    },
    {
      label: 'Community',
      defaultOpen: false,
      items: [
        { to: '/discussions', icon: MessageSquare, label: 'Discussions' },
        { to: '/live-class', icon: Video, label: 'Live Classes' },
        { to: '/study-groups', icon: Users, label: 'Study Groups' },
        { to: '/peer-review', icon: CheckSquare, label: 'Peer Reviews' },
      ],
    },
    {
      label: 'Study Tools & Mentorship',
      defaultOpen: false,
      items: [
        { to: '/ai-tutor', icon: Bot, label: 'Interactive Mentor' },
        { to: '/mentorship', icon: Users, label: '1-on-1 Mentors' },
        { to: '/notes', icon: FileText, label: 'Notes Studio' },
        { to: '/study-planner', icon: Calendar, label: 'Study Planner' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/downloads', icon: Download, label: 'Offline Downloads' },
        { to: '/support', icon: LifeBuoy, label: 'Help & Support' },
        { to: '/institutions', icon: Briefcase, label: 'Institution Hub' },
        { to: '/pricing', icon: CreditCard, label: 'Plans & Pricing' },
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

  const currentLevel = calculateLevel(currentXp)
  const currentLevelBaseXp = calculateXpForLevel(currentLevel)
  const nextLevelBaseXp = calculateXpForLevel(currentLevel + 1)
  const xpNeededForLevel = Math.max(1, nextLevelBaseXp - currentLevelBaseXp)
  const xpInLevel = Math.max(0, currentXp - currentLevelBaseXp)
  const xpProgress = Math.min(100, Math.round((xpInLevel / xpNeededForLevel) * 100))

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
        className="fixed lg:static inset-y-0 left-0 z-[70] w-72 sidebar-glass flex flex-col overflow-hidden lg:shadow-none lg:translate-x-0"
        aria-label="Main navigation"
        role="navigation"
        drag={isDesktop ? false : 'x'}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
          if (info.offset.x < -50 || info.velocity.x < -500) {
            setSidebarOpen(false)
          }
        }}
      >
        {/* Sidebar header — premium glass with subtle gradient line */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/30 dark:border-white/[0.06] shrink-0 relative">
          {/* Subtle gradient accent line at bottom of header */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary-400/30 dark:via-primary-500/20 to-transparent" />
          <PrefetchNavLink
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg group"
          >
            <BrandLogo size="sm" variant="full" subtitle="Pro Platform" animated />
          </PrefetchNavLink>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Streak indicator */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 text-white shadow-lg shadow-orange-500/25 dark:shadow-orange-500/15 overflow-hidden relative group cursor-default"
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer opacity-60" />
            {/* Hover glow expansion */}
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/15 transition-all duration-500" />
            <div className="flex items-center gap-3 relative z-10">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20"
              >
                <Flame className="w-5 h-5" />
              </motion.div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm leading-tight tracking-tight">{streak} Day Streak!</span>
                <span className="text-[10px] text-white/80 font-medium">You&apos;re on fire — keep going!</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {/* Main nav items */}
          <div className="mb-4">
            {mainNavItems.map(({ to, icon: Icon, label }) => (
              <PrefetchNavLink
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
                    {/* Active route indicator with glow */}
                    {isActive && (
                      <motion.div
                        layoutId={`sidebar-main-bg-${to}`}
                        className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50/50 dark:from-primary-900/25 dark:to-purple-900/15 border border-primary-200/60 dark:border-primary-700/30 rounded-xl shadow-sm shadow-primary-500/5 dark:shadow-primary-500/10"
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
              </PrefetchNavLink>
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
                          <PrefetchNavLink
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
                                    layoutId={`sidebar-section-bg-${section.label}-${label}`}
                                    className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50/50 dark:from-primary-900/25 dark:to-purple-900/15 border border-primary-200/60 dark:border-primary-700/30 rounded-xl shadow-sm shadow-primary-500/5 dark:shadow-primary-500/10"
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
                          </PrefetchNavLink>
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
                <PrefetchNavLink
                  to="/search"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                  onClick={closeMobileSidebar}
                >
                  Course Catalog
                </PrefetchNavLink>
              </p>
            </div>
          </div>
        </nav>

        {/* Bottom profile card — premium glass with gradient border */}
        <div className="p-4 border-t border-gray-200/30 dark:border-white/[0.06] shrink-0 relative">
          {/* Subtle aurora gradient behind profile section */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-50/30 via-transparent to-transparent dark:from-primary-950/20 pointer-events-none" />
          {/* Gradient accent line at top */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary-400/25 dark:via-primary-500/15 to-transparent" />

          {/* Mini profile */}
          <PrefetchNavLink
            to="/profile"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 mb-3 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.04] transition-all duration-200 group relative z-10"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-shadow">
                {(username[0] ?? 'L').toUpperCase()}
              </div>
              {/* Online indicator with pulse */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                {username}
              </p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Level {currentLevel}
              </p>
            </div>
          </PrefetchNavLink>

          {/* XP Progress bar with glow */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                {currentXp} XP
              </span>
              <span>
                {xpInLevel}/{xpNeededForLevel} to Lv.{currentLevel + 1}
              </span>
            </div>
            <div className="h-2 bg-gray-200/80 dark:bg-gray-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)]"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
              <span>{completedCoursesCount} Completed</span>
              <span>{streak > 0 ? `🔥 ${streak}d` : 'No streak'}</span>
            </div>

            {/* Theme Selector Pill (Light / Dark / System) */}
            <div className="pt-2.5 mt-2.5 border-t border-gray-200/40 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Theme
              </span>
              <div className="flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTheme({ mode: 'light' })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    theme.mode === 'light'
                      ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title="Light Theme"
                  aria-label="Set light theme"
                >
                  <Sun className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme({ mode: 'dark' })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    theme.mode === 'dark'
                      ? 'bg-slate-800 text-indigo-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title="Dark Theme"
                  aria-label="Set dark theme"
                >
                  <Moon className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme({ mode: 'system' })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    theme.mode === 'system'
                      ? 'bg-white dark:bg-slate-800 text-cyan-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title="System Theme"
                  aria-label="Set system theme"
                >
                  <Monitor className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
