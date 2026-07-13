import {
  Users,
  BookOpen,
  FileQuestion,
  Award,
  TrendingUp,
  UserCheck,
  RefreshCw,
} from 'lucide-react'
import { adminService, Analytics } from '../services/adminService'
import AnimatedPage from '../components/AnimatedPage'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Link } from 'react-router-dom'

// AdminDashboard.tsx - Refactored to use React Query

export function AdminDashboard() {
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const response = await adminService.getAnalytics()
      return (response.data ?? response) as Analytics
    },
    staleTime: 60 * 1000, // 1 minute for admin dashboard
  })

  const safeNum = (val: unknown, fallback = 0): number => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseInt(val, 10) || fallback
    return fallback
  }

  const stats = [
    {
      label: 'Total Users',
      value: safeNum(analytics?.total_users ?? analytics?.totalUsers),
      icon: Users,
      color: 'bg-blue-500',
      iconColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Active (24h)',
      value: safeNum(analytics?.active_users_24h ?? analytics?.activeUsers),
      icon: UserCheck,
      color: 'bg-green-500',
      iconColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      label: 'Courses',
      value: safeNum(analytics?.total_courses ?? analytics?.totalCourses),
      icon: BookOpen,
      color: 'bg-purple-500',
      iconColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
    {
      label: 'Enrollments',
      value: safeNum(analytics?.total_enrollments ?? analytics?.enrollments),
      icon: Award,
      color: 'bg-orange-500',
      iconColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      label: 'Recent Completions',
      value: safeNum(analytics?.recent_completions ?? analytics?.completions),
      icon: TrendingUp,
      color: 'bg-pink-500',
      iconColor: 'text-pink-600',
      bgLight: 'bg-pink-50',
    },
    {
      label: 'Test Submissions (24h)',
      value: safeNum(analytics?.test_submissions_24h),
      icon: FileQuestion,
      color: 'bg-teal-500',
      iconColor: 'text-teal-600',
      bgLight: 'bg-teal-50',
    },
  ]

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <span className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                <Users className="w-8 h-8" />
              </span>
              Admin Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              Platform overview and management console
            </p>
          </div>

          {isError && (
            <Card className="bg-red-50 border-none shadow-sm text-red-700 p-6 rounded-2xl mb-8 flex items-center justify-between">
              <div>
                <h3 className="font-bold mb-1 text-red-900">Connection Interrupted</h3>
                <p className="text-sm">
                  Failed to retrieve real-time analytics. Please check backend connection.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-900 px-4 py-2 rounded-xl transition-colors font-bold text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Card key={i} className="p-6 border-none shadow-sm rounded-2xl">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </Card>
                ))
              : stats.map(stat => (
                  <Card
                    key={stat.label}
                    className="p-6 border-none shadow-sm hover:shadow-xl transition-all rounded-2xl overflow-hidden relative group cursor-default bg-white"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <stat.icon className="w-20 h-20" />
                    </div>
                    <div className="flex items-center relative z-10">
                      <div className={`${stat.bgLight} ${stat.iconColor} p-3 rounded-xl`}>
                        <stat.icon className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-black text-gray-900 tabular-nums">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
          </div>

          {/* Quick Actions */}
          <Card className="p-8 border-none shadow-sm rounded-2xl mb-8 bg-white">
            <h2 className="text-xl font-black text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/admin/users"
                className="flex items-center p-5 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              >
                <div className="bg-white p-2 rounded-lg shadow-sm group-hover:shadow text-blue-600 mr-4 transition-all">
                  <Users className="h-6 w-6" />
                </div>
                <span className="font-bold text-gray-900">Manage Users</span>
              </Link>
              <Link
                to="/admin/courses"
                className="flex items-center p-5 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-colors group"
              >
                <div className="bg-white p-2 rounded-lg shadow-sm group-hover:shadow text-green-600 mr-4 transition-all">
                  <BookOpen className="h-6 w-6" />
                </div>
                <span className="font-bold text-gray-900">Manage Courses</span>
              </Link>
              <Link
                to="/admin/analytics"
                className="flex items-center p-5 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-colors group"
              >
                <div className="bg-white p-2 rounded-lg shadow-sm group-hover:shadow text-purple-600 mr-4 transition-all">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <span className="font-bold text-gray-900">View Analytics</span>
              </Link>
            </div>
          </Card>

          {/* Admin Info */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Admin Access Active
            </h3>
            <p className="text-blue-100 font-medium max-w-2xl leading-relaxed">
              You have full administrative privileges. Use the quick actions above to manage users,
              courses, and view detailed platform analytics. All critical actions are securely
              logged for audit purposes.
            </p>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
