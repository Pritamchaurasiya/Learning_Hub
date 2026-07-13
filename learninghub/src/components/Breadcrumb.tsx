import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

const routeLabels = new Map<string, string>([
  ['/', 'Home'],
  ['/dashboard', 'Dashboard'],
  ['/course', 'Courses'],
  ['/search', 'Search'],
  ['/bookmarks', 'Bookmarks'],
  ['/achievements', 'Achievements'],
  ['/problems', 'Problems'],
  ['/quiz', 'Quiz'],
  ['/quiz-history', 'Quiz History'],
  ['/tests-a', 'Tests A+'],
  ['/tests-a-history', 'Test History'],
  ['/contest', 'Contests'],
  ['/leaderboard', 'Leaderboard'],
  ['/profile', 'Profile'],
  ['/settings', 'Settings'],
  ['/library', 'Library'],
  ['/analytics', 'Analytics'],
  ['/notifications', 'Notifications'],
  ['/admin', 'Admin Panel'],
  ['/monitoring', 'System Health'],
  ['/downloads', 'Downloads'],
  ['/certificates', 'Certificates'],
  ['/discussions', 'Discussions'],
  ['/mentorship', 'Mentorship'],
  ['/ai-tutor', 'AI Tutor'],
  ['/cart', 'Cart'],
  ['/learning-path', 'Learning Path'],
  ['/live-class', 'Live Class'],
  ['/study-planner', 'Study Planner'],
  ['/offline', 'Offline'],
  ['/lesson-player', 'Lesson Player'],
])

const topLevelRoutes = [
  '/',
  '/dashboard',
  '/search',
  '/bookmarks',
  '/achievements',
  '/problems',
  '/quiz',
  '/quiz-history',
  '/tests-a',
  '/tests-a-history',
  '/contest',
  '/leaderboard',
  '/profile',
  '/settings',
  '/library',
  '/analytics',
  '/notifications',
  '/downloads',
  '/certificates',
  '/discussions',
  '/mentorship',
  '/ai-tutor',
  '/cart',
  '/learning-path',
  '/live-class',
  '/study-planner',
  '/offline',
]

function parseBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]

  if (topLevelRoutes.includes(pathname)) {
    return items
  }

  const segments = pathname.split('/').filter(Boolean)

  for (let i = 0; i < segments.length; i++) {
    const path = `/${segments.slice(0, i + 1).join('/')}`

    const label = routeLabels.get(path)
    if (label) {
      items.push({ label, href: path })
    } else if (path.startsWith('/course/')) {
      const courseId = segments[i]
      const courseLabel = courseId
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      items.push({ label: courseLabel, href: path })
    } else if (path.startsWith('/problem/')) {
      const slug = segments[i]
      const problemLabel = slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      items.push({ label: problemLabel, href: path })
    }
  }

  return items
}

export default function Breadcrumb() {
  const location = useLocation()
  const items = parseBreadcrumbs(location.pathname)

  if (items.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm px-4 md:px-6 py-3 bg-white/50 dark:bg-gray-900/50 border-b border-gray-200/60 dark:border-gray-700/40 overflow-x-auto no-scrollbar"
    >
      <ol className="flex items-center whitespace-nowrap gap-1.5 list-none">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={item.href ?? index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                >
                  {index === 0 ? <Home className="w-4 h-4" /> : item.label}
                </Link>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 shrink-0">{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
