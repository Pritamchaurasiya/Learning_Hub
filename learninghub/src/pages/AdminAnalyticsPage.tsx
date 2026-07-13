import { useQuery } from '@tanstack/react-query'
import { adminService } from '../services/adminService'
import { fetchApi } from '../utils/api'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { TrendingUp, Users, BookOpen, Activity } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Skeleton } from '../components/ui/Skeleton'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <Activity className="w-8 h-8 text-rose-500 mb-2 opacity-50" />
          <p className="text-sm font-medium">Chart data unavailable</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AdminAnalyticsPage() {
  const { data: userAnalytics, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'analytics', 'users'],
    queryFn: async () => {
      const res = await adminService.getUserAnalytics()
      return res.data
    },
  })

  const { data: courseAnalytics, isLoading: loadingCourses } = useQuery({
    queryKey: ['admin', 'analytics', 'courses'],
    queryFn: async () => {
      const res = await adminService.getCourseAnalytics()
      return res.data
    },
  })

  const { data: dauData, isLoading: loadingDau } = useQuery({
    queryKey: ['admin', 'analytics', 'dau'],
    queryFn: async () => {
      const res = await fetchApi('/admin/analytics/dau?days=30')
      return res.data?.data ?? []
    },
  })

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-purple-100 text-purple-600 rounded-xl dark:bg-purple-900/30 dark:text-purple-400">
                <TrendingUp className="w-8 h-8" />
              </span>
              Detailed Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
              Deep insights into platform growth, user engagement, and course performance
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User Growth Line Chart */}
            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                User Registration Growth
              </h3>
              <div className="h-80">
                {loadingUsers ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : userAnalytics?.growth && userAnalytics.growth.length > 0 ? (
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={userAnalytics.growth}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={str => {
                            const date = new Date(str)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                          stroke="#9ca3af"
                          fontSize={12}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          labelFormatter={str => new Date(str).toLocaleDateString()}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="New Users"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                    No growth data available yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Daily Active Users (DAU) Area Chart */}
            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Daily Active Users (30 Days)
              </h3>
              <div className="h-80">
                {loadingDau ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : dauData && dauData.length > 0 ? (
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dauData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={str => {
                            const date = new Date(str)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                          stroke="#9ca3af"
                          fontSize={12}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          labelFormatter={str => new Date(str).toLocaleDateString()}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="activeUsers"
                          name="Active Users"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          dot={{ r: 3, strokeWidth: 2 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                    No DAU data available.
                  </div>
                )}
              </div>
            </Card>

            {/* Role Distribution Pie Chart */}
            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                User Role Distribution
              </h3>
              <div className="h-80">
                {loadingUsers ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : userAnalytics?.byRole && userAnalytics.byRole.length > 0 ? (
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userAnalytics.byRole}
                          cx="50%"
                          cy="45%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="role"
                        >
                          {userAnalytics.byRole.map((_entry, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                    No role data available.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Courses Bar Chart */}
            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-500" />
                Top Enrolled Courses
              </h3>
              <div className="h-80">
                {loadingCourses ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : courseAnalytics?.popular && courseAnalytics.popular.length > 0 ? (
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={courseAnalytics.popular}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={true}
                          vertical={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis
                          dataKey="title"
                          type="category"
                          stroke="#9ca3af"
                          fontSize={12}
                          width={100}
                          tickFormatter={str =>
                            str.substring(0, 15) + (str.length > 15 ? '...' : '')
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar
                          dataKey="enrollments"
                          fill="#10b981"
                          radius={[0, 4, 4, 0]}
                          name="Enrollments"
                        >
                          {courseAnalytics.popular.map((_entry, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                    No course data available.
                  </div>
                )}
              </div>
            </Card>

            {/* Courses by Category Pie Chart */}
            <Card className="p-6 border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Course Category Breakdown
              </h3>
              <div className="h-80">
                {loadingCourses ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : courseAnalytics?.byCategory && courseAnalytics.byCategory.length > 0 ? (
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={courseAnalytics.byCategory}
                          cx="50%"
                          cy="45%"
                          outerRadius={110}
                          dataKey="count"
                          nameKey="category"
                          label={({ name, percent }) =>
                            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {courseAnalytics.byCategory.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[(index + 3) % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                    No category data available.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
