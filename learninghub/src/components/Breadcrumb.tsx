import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { getCourseById } from '../data/courses'

interface BreadcrumbItem {
  label: string
  href?: string
}

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/course': 'Courses',
  '/search': 'Search',
  '/bookmarks': 'Bookmarks',
  '/achievements': 'Achievements',
  '/problems': 'Problems',
  '/quiz': 'Quiz',
  '/contest': 'Contests',
  '/profile': 'Profile',
  '/settings': 'Settings',
}

function parseBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }]
  
  if (pathname === '/' || pathname === '/search' || pathname === '/bookmarks' || pathname === '/achievements' || pathname === '/problems' || pathname === '/quiz' || pathname === '/contest' || pathname === '/profile' || pathname === '/settings') {
    return items
  }
  
  const segments = pathname.split('/').filter(Boolean)
  
  for (let i = 0; i < segments.length; i++) {
    const path = '/' + segments.slice(0, i + 1).join('/')
    
    if (routeLabels[path]) {
      items.push({ label: routeLabels[path], href: path })
    } else if (path.startsWith('/course/')) {
      const courseId = segments[i]
      const course = getCourseById(courseId)
      items.push({ label: course?.title || 'Course', href: path })
    } else if (path.startsWith('/problem/')) {
      // For problems, we might not have local data, so we'll capitalize the slug
      const slug = segments[i]
      const label = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      items.push({ label, href: path })
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
            <li key={item.href || index} className="flex items-center gap-1.5">
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