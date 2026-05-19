import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Code2, Brain, Bookmark } from 'lucide-react'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/problems', icon: Code2, label: 'Practice' },
  { to: '/quiz', icon: Brain, label: 'Quiz' },
  { to: '/bookmarks', icon: Bookmark, label: 'Saved' },
]

export default function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-t border-gray-200/60 dark:border-gray-700/40 safe-area-pb shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1.5 h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-1 py-1 rounded-2xl transition-all duration-300 min-w-[64px] relative group',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )
            }
            aria-label={label}
            role="link"
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className={cn(
                    'p-1.5 rounded-xl transition-colors duration-300',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-800/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform duration-300',
                      isActive && 'scale-110'
                    )}
                    aria-hidden="true"
                  />
                </motion.div>
                <span
                  className={cn(
                    'text-[10px] font-bold tracking-tight transition-all duration-300',
                    isActive ? 'opacity-100 translate-y-0' : 'opacity-80 group-hover:opacity-100'
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
