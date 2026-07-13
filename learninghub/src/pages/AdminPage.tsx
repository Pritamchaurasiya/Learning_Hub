import { useState, useMemo } from 'react'
import {
  Users,
  BookOpen,
  BarChart3,
  Shield,
  TrendingUp,
  Search,
  Activity as ActivityIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { fetchApi } from '../utils/api'
import { adminService, Course } from '../services/adminService'
import { Skeleton } from '../components/ui/Skeleton'
import AdminABTestingPage from './AdminABTestingPage'
import AdminSecurityPage from './AdminSecurityPage'
import AdminAILabPage from './AdminAILabPage'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalCourses: number
  totalTests: number
  recentRegistrations: number
  completions: number
  enrollments: number
  passed: number
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'users' | 'analytics' | 'experiments' | 'security' | 'ai-lab'
  >('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Overview Stats Query
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await fetchApi('/admin/dashboard')
      const data = (response.data ?? response) as Record<string, unknown>
      return {
        totalUsers: (data.total_users ?? data.users ?? 0) as number,
        activeUsers: (data.active_users_24h ?? data.activeUsers ?? 0) as number,
        totalCourses: (data.total_courses ?? data.courses ?? 0) as number,
        totalTests: (data.test_submissions_24h ?? data.tests ?? 0) as number,
        recentRegistrations: (data.new_users_today ?? data.recentRegistrations ?? 0) as number,
        completions: (data.recent_completions ?? data.completions ?? 0) as number,
        enrollments: (data.total_enrollments ?? data.enrollments ?? 0) as number,
        passed: (data.passed ?? 0) as number,
      } as AdminStats
    },
    staleTime: 60 * 1000,
  })

  // Users Query
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.getUsers().then(res => res.data.users),
    enabled: activeTab === 'users' || activeTab === 'overview', // Preload
    staleTime: 60 * 1000,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = usersData ?? []

  // Courses Query
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => adminService.getCourses().then(res => res.data),
    enabled: activeTab === 'courses' || activeTab === 'overview', // Preload
    staleTime: 60 * 1000,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const courses = coursesData ?? []

  // Analytics Query
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['admin', 'courseAnalytics'],
    queryFn: () => adminService.getCourseAnalytics().then(res => res.data),
    enabled: activeTab === 'analytics' || activeTab === 'overview', // Preload
    staleTime: 60 * 1000,
  })

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return courses
    return courses.filter((course: Course) =>
      [course.id, course.title, course.category, course.level ?? ''].some(
        value => typeof value === 'string' && value.toLowerCase().includes(query)
      )
    )
  }, [courses, searchQuery])

  const filteredUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase()
    if (!query) return users
    return users.filter(user =>
      [user.username, user.email].some(
        value => typeof value === 'string' && value.toLowerCase().includes(query)
      )
    )
  }, [userSearchQuery, users])

  return (
    <AnimatedPage>
      <SEO title="Admin Dashboard - LearningHub" />

      <div className="space-y-8 pb-12 pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-600" />
              Admin Command Center
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage users, content, and system configuration
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto hide-scrollbar">
          {(
            [
              'overview',
              'courses',
              'users',
              'analytics',
              'experiments',
              'security',
              'ai-lab',
            ] as const
          ).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="admin-tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Total Learners',
                    value: stats?.totalUsers,
                    icon: Users,
                    color: 'text-blue-500',
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                  },
                  {
                    label: 'Active Today',
                    value: stats?.activeUsers,
                    icon: ActivityIcon,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                  },
                  {
                    label: 'Course Catalog',
                    value: stats?.totalCourses,
                    icon: BookOpen,
                    color: 'text-purple-500',
                    bg: 'bg-purple-50 dark:bg-purple-900/20',
                  },
                  {
                    label: 'Tests Passed',
                    value: stats?.passed ?? 0,
                    icon: TrendingUp,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50 dark:bg-amber-900/20',
                  },
                ].map((stat, i) => (
                  <Card
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="p-6 group hover:shadow-xl transition-all border-none shadow-sm bg-white dark:bg-gray-900 h-full flex flex-col justify-center relative overflow-hidden"
                  >
                    {isLoadingStats ? (
                      <div className="space-y-4">
                        <Skeleton className="w-12 h-12 rounded-2xl" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                          <stat.icon className="w-20 h-20" />
                        </div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div
                            className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}
                          >
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums relative z-10">
                          {stat.value ?? 0}
                        </h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 relative z-10">
                          {stat.label}
                        </p>
                      </>
                    )}
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Platform Activity */}
                <Card className="p-6 border-none shadow-lg">
                  <h3 className="font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight text-gray-800 dark:text-gray-100">
                    <ActivityIcon className="w-5 h-5 text-primary-500" />
                    Platform Activity
                  </h3>
                  {isLoadingStats ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'New users today', value: stats?.recentRegistrations ?? 0 },
                        { label: 'Recent completions', value: stats?.completions ?? 0 },
                        { label: 'Tracked enrollments', value: stats?.enrollments ?? 0 },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {item.label}
                          </span>
                          <span className="text-2xl font-black tabular-nums text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-4 py-1 rounded-lg">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Management Workspaces */}
                <Card className="p-6 border-none shadow-lg">
                  <h3 className="font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight text-gray-800 dark:text-gray-100">
                    <BarChart3 className="w-5 h-5 text-primary-500" />
                    Management Routing
                  </h3>
                  <div className="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
                    {[
                      {
                        label: 'Manage Courses',
                        icon: BookOpen,
                        tab: 'courses' as const,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20',
                        border: 'border-emerald-100 dark:border-emerald-900/30',
                      },
                      {
                        label: 'Manage Users',
                        icon: Users,
                        tab: 'users' as const,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20',
                        border: 'border-blue-100 dark:border-blue-900/30',
                      },
                      {
                        label: 'Deep Analytics',
                        icon: TrendingUp,
                        tab: 'analytics' as const,
                        color: 'text-purple-500',
                        bg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/10 dark:hover:bg-purple-900/20',
                        border: 'border-purple-100 dark:border-purple-900/30',
                      },
                      {
                        label: 'System Health',
                        icon: ActivityIcon,
                        tab: 'overview' as const,
                        color: 'text-amber-500',
                        bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20',
                        border: 'border-amber-100 dark:border-amber-900/30',
                      },
                      {
                        label: 'Platform Security',
                        icon: Shield,
                        tab: 'security' as const,
                        color: 'text-rose-500',
                        bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/10 dark:hover:bg-rose-900/20',
                        border: 'border-rose-100 dark:border-rose-900/30',
                      },
                    ].map(action => (
                      <button
                        key={action.label}
                        onClick={() => setActiveTab(action.tab)}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl ${action.bg} border ${action.border} transition-all group active:scale-95`}
                      >
                        <action.icon
                          className={`w-8 h-8 ${action.color} mb-3 group-hover:scale-125 transition-transform duration-300`}
                        />
                        <span
                          className={`text-xs font-black uppercase tracking-widest ${action.color}`}
                        >
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border-none shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses by name or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-none shadow-lg">
                <Card className="overflow-hidden min-w-[800px] border-none rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Course Title
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Enrollment
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                          System ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 bg-white dark:bg-gray-900">
                      {isLoadingCourses ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={i}>
                            <td className="px-6 py-5">
                              <Skeleton className="h-10 w-48" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-6 w-16" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-6 w-20" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-4 w-32 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : filteredCourses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                            <p className="text-lg font-bold text-gray-500">
                              No courses found matching criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredCourses.map(course => (
                          <tr
                            key={course.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                          >
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white truncate max-w-xs">
                                  {course.title}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                                  {course.category} • {course.difficulty ?? course.level ?? 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 w-max px-3 py-1 rounded-lg">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="font-black tabular-nums text-blue-700 dark:text-blue-400">
                                  {(
                                    course.enrollment_count ??
                                    course.enrolledCount ??
                                    0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                  course.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : course.status === 'draft'
                                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                              >
                                {course.status ?? (course.published ? 'published' : 'draft')}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right text-[10px] font-medium font-mono text-gray-400 tracking-wider">
                              {course.id}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border-none shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Find learners by name or email..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-none shadow-lg">
                <Card className="overflow-hidden min-w-[800px] border-none rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Learner Profile
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Onboarded
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                          Access Role
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 bg-white dark:bg-gray-900">
                      {isLoadingUsers ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={i}>
                            <td className="px-6 py-5">
                              <Skeleton className="h-10 w-48" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-6 w-16" />
                            </td>
                            <td className="px-6 py-5">
                              <Skeleton className="h-6 w-20 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                            <p className="text-lg font-bold text-gray-500">
                              No users found matching criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(user => (
                          <tr
                            key={user.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white truncate max-w-xs">
                                    {user.username}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate max-w-xs">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm font-bold text-gray-500 dark:text-gray-400">
                              {new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                  user.is_active
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span
                                className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                  user.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Course Categories */}
                <Card className="p-8 border-none shadow-lg">
                  <h3 className="font-black text-xl mb-6 uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Courses by Category
                  </h3>
                  {isLoadingAnalytics ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : analytics?.byCategory && analytics.byCategory.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.byCategory.map((item, i) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={i}
                          className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <span className="text-sm font-bold capitalize text-gray-700 dark:text-gray-300">
                            {item.category}
                          </span>
                          <span className="font-black tabular-nums bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-1 rounded-lg">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400 font-bold">
                      No category distribution available
                    </div>
                  )}
                </Card>

                {/* Popular Courses */}
                <Card className="p-8 border-none shadow-lg">
                  <h3 className="font-black text-xl mb-6 uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Top Performing Courses
                  </h3>
                  {isLoadingAnalytics ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : analytics?.popular && analytics.popular.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.popular.map((item, i) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={i}
                          className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-xs font-black text-gray-400 w-4">{i + 1}.</span>
                            <span className="text-sm font-bold truncate text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1 rounded-lg">
                            <Users className="w-3 h-3" />
                            <span className="font-black tabular-nums text-xs">
                              {item.enrollments}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400 font-bold">
                      No trending courses available
                    </div>
                  )}
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'experiments' && (
            <motion.div
              key="experiments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminABTestingPage />
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminSecurityPage />
            </motion.div>
          )}

          {activeTab === 'ai-lab' && (
            <motion.div
              key="ai-lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminAILabPage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  )
}
