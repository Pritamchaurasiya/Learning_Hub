import { useState, useEffect } from 'react'
import { Users, BookOpen, FileQuestion, Award, TrendingUp, UserCheck } from 'lucide-react'
import { adminService, Analytics } from '../services/adminService'
import AnimatedPage from '../components/AnimatedPage'

// AdminDashboard.tsx - Fixed analytics data mapping

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      setLoading(true)
      const response = await adminService.getAnalytics()
      // Backend returns { status, data: { total_users, active_users_24h, ... } }
      const respData = (response.data ?? response) as Record<string, unknown>
      setAnalytics(respData as Analytics)
    } catch (err) {
      setError('Failed to load analytics')
      if (import.meta.env.DEV) {
        console.error('[AdminDashboard]', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const safeNum = (val: unknown, fallback = 0): number => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseInt(val, 10) || fallback
    return fallback
  }

  const stats = analytics
    ? [
        {
          label: 'Total Users',
          value: safeNum(analytics.total_users ?? analytics.totalUsers),
          icon: Users,
          color: 'bg-blue-500',
        },
        {
          label: 'Active (24h)',
          value: safeNum(analytics.active_users_24h ?? analytics.activeUsers),
          icon: UserCheck,
          color: 'bg-green-500',
        },
        {
          label: 'Courses',
          value: safeNum(analytics.total_courses ?? analytics.totalCourses),
          icon: BookOpen,
          color: 'bg-purple-500',
        },
        {
          label: 'Enrollments',
          value: safeNum(analytics.total_enrollments ?? analytics.enrollments),
          icon: Award,
          color: 'bg-orange-500',
        },
        {
          label: 'Recent Completions',
          value: safeNum(analytics.recent_completions ?? analytics.completions),
          icon: TrendingUp,
          color: 'bg-pink-500',
        },
        {
          label: 'Test Submissions (24h)',
          value: safeNum(analytics.test_submissions_24h),
          icon: FileQuestion,
          color: 'bg-teal-500',
        },
      ]
    : []

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Platform overview and management</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stats.map(stat => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center">
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/admin/users"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Users className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="font-medium text-gray-900">Manage Users</span>
                  </a>
                  <a
                    href="/admin/courses"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-green-600 mr-3" />
                    <span className="font-medium text-gray-900">Manage Courses</span>
                  </a>
                  <a
                    href="/admin/analytics"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    <TrendingUp className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="font-medium text-gray-900">View Analytics</span>
                  </a>
                </div>
              </div>

              {/* Admin Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Admin Access</h3>
                <p className="text-blue-700">
                  You have full admin privileges. Use the quick actions above to manage users,
                  courses, and view detailed analytics. All actions are logged for security.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  )
}
