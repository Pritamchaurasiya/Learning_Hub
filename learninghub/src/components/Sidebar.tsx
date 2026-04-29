import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  BookOpen,
  Search,
  Bookmark,
  Award,
  ChevronDown,
  Flame,
  X,
  Code2,
  Brain,
  Trophy,
  Library,
  BarChart3,
  MessageSquare,
  Users,
  Video,
  Bot,
  Calendar,
  Download,
  FileBadge,
  Bell,
  Settings,
  User,
  Shield,
  Gauge
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { phases } from '../data/courses'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, progress, auth } = useStore()
  const location = useLocation()
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['phase-1'])

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev =>
      prev.includes(phaseId)
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    )
  }

  const isPhaseActive = (phaseId: string) => {
    return phases.find(p => p.id === phaseId)?.courses.some(
      c => location.pathname === `/course/${c.id}`
    )
  }

  const mainNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/library', icon: Library, label: 'Library' },
    ...(auth.user?.role === 'admin' ? [
      { to: '/admin', icon: Shield, label: 'Admin Panel' },
      { to: '/monitoring', icon: Gauge, label: 'System Health' }
    ] : []),
  ]

  const practiceNavItems = [
    { to: '/problems', icon: Code2, label: 'DSA Practice' },
    { to: '/quiz', icon: Brain, label: 'Quiz' },
    { to: '/contest', icon: Trophy, label: 'Contests' },
    { to: '/leaderboard', icon: BarChart3, label: 'Leaderboard' },
  ]

  const communityNavItems = [
    { to: '/discussions', icon: MessageSquare, label: 'Discussions' },
    { to: '/mentorship', icon: Users, label: 'Mentorship' },
    { to: '/live-class', icon: Video, label: 'Live Classes' },
  ]

  const aiNavItems = [
    { to: '/ai-tutor', icon: Bot, label: 'AI Tutor' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/study-planner', icon: Calendar, label: 'Study Planner' },
  ]

  const accountNavItems = [
    { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { to: '/achievements', icon: Award, label: 'Achievements' },
    { to: '/certificates', icon: FileBadge, label: 'Certificates' },
    { to: '/downloads', icon: Download, label: 'Downloads' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' }
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
        animate={sidebarOpen || window.innerWidth >= 1024 ? "open" : "closed"}
        variants={sidebarVariants}
        className="fixed lg:static inset-y-0 left-0 z-[70] w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/40 flex flex-col overflow-hidden shadow-2xl lg:shadow-none"
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/60 dark:border-gray-700/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20">L</div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">LearningHub</h2>
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
                <span className="font-bold text-sm leading-tight">{progress.streak} Day Streak!</span>
                <span className="text-[10px] text-white/80">You're doing great!</span>
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
                  ${isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                    : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
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
            { label: 'Account', items: accountNavItems }
          ].map((section) => (
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
                    ${isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                      : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
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

            {phases.map(phase => {
              const isExpanded = expandedPhases.includes(phase.id)
              const isActive = isPhaseActive(phase.id)
              const completedCount = phase.courses.filter(c =>
                progress.completedCourses.includes(c.id)
              ).length
              const progressPercent = (completedCount / phase.courses.length) * 100

              return (
                <div key={phase.id} className="mb-2">
                  <button
                    onClick={() => togglePhase(phase.id)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 rounded-xl
                      transition-all duration-300
                      ${isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm shadow-black/5" style={{ backgroundColor: phase.color }} />
                      <span className="font-bold text-sm">{phase.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                        {completedCount}/{phase.courses.length}
                      </span>
                      <motion.div 
                        animate={{ rotate: isExpanded ? 0 : -90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div className="mx-4 mb-2 mt-1 px-0.5">
                    <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: phase.color }}
                      />
                    </div>
                  </div>

                  {/* Course list */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="ml-3 overflow-hidden space-y-0.5"
                      >
                        {phase.courses.map(course => {
                          const isCompleted = progress.completedCourses.includes(course.id)
                          return (
                            <NavLink
                              key={course.id}
                              to={`/course/${course.id}`}
                              className={({ isActive }) => `
                                flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm
                                transition-all duration-300
                                ${isActive
                                  ? 'bg-primary-50/50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 font-bold'
                                  : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 text-gray-500 dark:text-gray-400'}
                              `}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isCompleted ? 'text-green-500' : ''}`} />
                              <span className="truncate">{course.title}</span>
                              {isCompleted && (
                                <motion.span 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto text-green-500 shrink-0"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </motion.span>
                              )}
                            </NavLink>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </nav>

        {/* Bottom stats */}
        <div className="p-5 border-t border-gray-200/60 dark:border-gray-700/40 shrink-0 bg-gray-50/50 dark:bg-gray-800/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            <span>Progress</span>
            <span>{Math.round((progress.completedCourses.length / 50) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(progress.completedCourses.length / 50) * 100}%` }}
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
