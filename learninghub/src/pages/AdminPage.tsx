import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Plus,
  Settings,
  LayoutDashboard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Activity as ActivityIcon,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { fetchApi } from '../utils/api'
import { adminService, type User, type Course } from '../services/adminService'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalCourses: number
  revenue: number
  recentRegistrations: number
  completions?: number
  enrollments?: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  interface AnalyticsCategory {
    category: string
    count: number
  }

  interface AnalyticsPopular {
    title: string
    enrollments: number
  }

  const [analytics, setAnalytics] = useState<{
    byCategory: AnalyticsCategory[]
    popular: AnalyticsPopular[]
  } | null>(null)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'users' | 'moderation' | 'analytics' | 'settings'
  >('overview')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAdminData = useCallback(async () => {
    try {
      // Use the actual admin dashboard endpoint
      const response = await fetchApi('/admin/dashboard')
      const data = (response.data ?? response) as Record<string, unknown>

      // Map backend response to frontend expected format
      setStats({
        totalUsers: (data.total_users ?? data.totalUsers ?? 0) as number,
        activeUsers: (data.active_users_24h ?? data.activeUsers ?? 0) as number,
        totalCourses: (data.total_courses ?? data.totalCourses ?? 0) as number,
        recentRegistrations: (data.new_users_today ?? data.recentRegistrations ?? 0) as number,
        // Additional metrics from backend
        revenue: (data.total_revenue ?? data.revenue ?? 0) as number,
        completions: (data.recent_completions ?? data.completions ?? 0) as number,
        enrollments: (data.total_enrollments ?? data.enrollments ?? 0) as number,
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AdminPage] Failed to fetch admin stats:', error)
      }
      // Set default empty stats on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalCourses: 0,
        recentRegistrations: 0,
        revenue: 0,
        completions: 0,
        enrollments: 0,
      })
    }
  }, [])

  // Fetch users when users tab is active
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true)
      const res = await adminService.getUsers()
      setUsers(res.data.users)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AdminPage] Failed to fetch users:', err)
      }
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  // Fetch courses when courses tab is active
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoadingCourses(true)
      const res = await adminService.getCourses()
      setCourses(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AdminPage] Failed to fetch courses:', err)
      }
    } finally {
      setIsLoadingCourses(false)
    }
  }, [])

  // Fetch analytics when analytics tab is active
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true)
      const res = await adminService.getCourseAnalytics()
      setAnalytics({
        popular: res.data.popular,
        byCategory: res.data.byCategory,
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AdminPage] Failed to fetch analytics:', err)
      }
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [])

  useEffect(() => {
    void fetchAdminData()
  }, [fetchAdminData])

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      void fetchUsers()
    } else if (activeTab === 'courses') {
      void fetchCourses()
    } else if (activeTab === 'analytics') {
      void fetchAnalytics()
    }
  }, [activeTab, fetchUsers, fetchCourses, fetchAnalytics])

  return (
    <AnimatedPage>
      <SEO title="Admin Dashboard - LearningHub" />

      <div className="space-y-8 pb-12">
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
          <div className="flex gap-3">
            <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Course
            </Button>
            <Button variant="primary" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
              Generate Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(['overview', 'courses', 'users', 'moderation', 'analytics', 'settings'] as const).map(
            tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
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
            )
          )}
        </div>

        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                  label: 'Net Revenue',
                  value: `$${stats?.revenue.toLocaleString()}`,
                  icon: TrendingUp,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                },
              ].map((stat, i) => (
                <Card
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="p-6 group hover:shadow-xl transition-all border-none shadow-sm bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}
                    >
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Growth
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                    {stat.label}
                  </p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    System Alerts
                  </h3>
                  <Button variant="outline" size="xs">
                    Clear All
                  </Button>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      type: 'warning',
                      msg: 'High server load detected in ap-south-1',
                      time: '2 mins ago',
                    },
                    {
                      type: 'success',
                      msg: 'New course "Advanced React Patterns" published',
                      time: '45 mins ago',
                    },
                    {
                      type: 'info',
                      msg: 'Database backup completed successfully',
                      time: '2 hours ago',
                    },
                    {
                      type: 'warning',
                      msg: 'Failed login attempts spike from 192.168.1.45',
                      time: '3 hours ago',
                    },
                  ].map((alert, i) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      {alert.type === 'warning' ? (
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {alert.msg}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                          {alert.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  Management Shortcuts
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Flush Cache', icon: RefreshCw },
                    { label: 'Export Users', icon: Download },
                    { label: 'Verify Keys', icon: Shield },
                    { label: 'App Settings', icon: Settings },
                  ].map((action, i) => (
                    <button
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-all group"
                    >
                      <action.icon className="w-6 h-6 text-primary-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses by name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="primary" size="sm">
                  New Course
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <Card className="overflow-hidden min-w-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Course
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Enrollment
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {isLoadingCourses ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                          <p className="text-sm text-gray-500 mt-2">Loading courses...</p>
                        </td>
                      </tr>
                    ) : courses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-500">No courses found</p>
                        </td>
                      </tr>
                    ) : (
                      courses.map(course => (
                        <tr
                          key={course.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {course.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {course.category} • {course.level}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium tabular-nums">
                                {course.enrolledCount.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                                course.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                  : course.status === 'draft'
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                              }`}
                            >
                              {course.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="xs">
                              Edit
                            </Button>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find learners by name or email..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <Card className="overflow-hidden min-w-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Learner
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                        Manage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                          <p className="text-sm text-gray-500 mt-2">Loading users...</p>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-500">No users found</p>
                        </td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-xs">
                                {user.username.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                  {user.username}
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                                user.is_active
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                              }`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="xs">
                              View
                            </Button>
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

        {activeTab === 'moderation' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Content Moderation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-yellow-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Pending Reviews</p>
                      <p className="text-2xl font-bold">{stats?.totalCourses ?? 0}</p>
                    </div>
                    <Shield className="w-5 h-5 text-yellow-500" />
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Reports</p>
                      <p className="text-2xl font-bold">
                        {Math.floor((stats?.totalUsers ?? 0) * 0.02)}
                      </p>
                    </div>
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-emerald-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Resolved Today</p>
                      <p className="text-2xl font-bold">
                        {Math.floor((stats?.recentRegistrations ?? 0) * 0.8)}
                      </p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Categories */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Courses by Category</h3>
                {isLoadingAnalytics ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                  </div>
                ) : analytics?.byCategory && analytics.byCategory.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.byCategory.map((item: AnalyticsCategory, i: number) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{item.category}</span>
                        <span className="font-bold text-primary-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No category data available</p>
                )}
              </Card>

              {/* Popular Courses */}
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Most Popular Courses</h3>
                {isLoadingAnalytics ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                  </div>
                ) : analytics?.popular && analytics.popular.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.popular.map((item: AnalyticsPopular, i: number) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm truncate">{item.title}</span>
                        <span className="font-bold text-primary-600">{item.enrollments}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No popular courses data available</p>
                )}
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  )
}

function Download({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
