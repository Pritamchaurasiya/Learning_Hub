import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Code2, Brain, BarChart3, BookOpen, Library } from 'lucide-react'
import { cn } from '../utils/cn'
import { useStore } from '../stores/useStore'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Explore' },
  { to: '/library', icon: Library, label: 'Library', authOnly: true },
  { to: '/tests-a', icon: Brain, label: 'Tests', authOnly: true },
  { to: '/problems', icon: Code2, label: 'Practice', authOnly: true },
  { to: '/study-planner', icon: BookOpen, label: 'Plan', authOnly: true },
  { to: '/analytics', icon: BarChart3, label: 'Stats', authOnly: true },
]

export default function MobileNav() {
  const isAuthenticated = useStore(s => s.auth.isAuthenticated)

  const visibleItems = navItems.filter(item => {
    if (item.authOnly === true) return isAuthenticated
    return true
  })

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-700/30 shadow-[0_-4px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-4px_30px_rgb(0,0,0,0.3)]" />

      <div className="relative flex items-center justify-around gap-0.5 px-1 py-1 h-[68px]">
        {visibleItems.map(({ to, icon: Icon, label }) => (
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
                    'text-[10px] font-semibold tracking-tight transition-all duration-300 relative z-10',
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
      </div>
    </nav>
  )
}
