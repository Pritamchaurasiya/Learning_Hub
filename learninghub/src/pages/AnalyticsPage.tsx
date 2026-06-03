import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  BookOpen,
  Target,
  BarChart3,
  Activity,
  Zap,
  ChevronRight,
  Flame,
  LayoutDashboard,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Skeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import WidgetBoundary from '../components/ui/WidgetBoundary'
import { analyticsService } from '../services/analyticsService'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: string | number
  trend?: string
  color: string
  delay?: number
}

function StatCard({ icon: Icon, label, value, trend, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="p-6 border-none shadow-sm hover:shadow-xl transition-all group relative overflow-hidden bg-white dark:bg-gray-900 h-full flex flex-col justify-center">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon className="w-20 h-20" />
        </div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0"
            style={{ backgroundColor: `${color}10` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 shrink-0" />
              {trend}
            </div>
          )}
        </div>
        <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter relative z-10 truncate">
          {value}
        </h3>
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 relative z-10 truncate">
          {label}
        </p>
      </Card>
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const daysMap = { week: 7, month: 30, year: 365 }
  const daysParam = daysMap[timeRange]

  // Use parallel queries for resilient data fetching
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsService.getDashboardStats().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['analytics', 'activity', daysParam],
    queryFn: () => analyticsService.getLearningActivity(daysParam).then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: skillsData, isLoading: isLoadingSkills } = useQuery({
    queryKey: ['analytics', 'skills'],
    queryFn: () => analyticsService.getSkillProgress().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['analytics', 'courses'],
    queryFn: () => analyticsService.getCourseAnalytics().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: testAnalyticsData, isLoading: isLoadingTestStats } = useQuery({
    queryKey: ['analytics', 'tests'],
    queryFn: () => analyticsService.getTestAnalytics().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  const dayCount = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365

  const chartDays = useMemo(() => {
    const count = Math.min(dayCount, 7)
    return Array(count)
      .fill(0)
      .map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (count - 1 - i))
        return d.toLocaleDateString('en-US', { weekday: 'short' })
      })
  }, [dayCount])

  const weeklyProgress = useMemo(() => {
    const count = Math.min(dayCount, 7)
    const result = Array(count).fill(0)
    const today = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const activityArray = Array.isArray(activityData) ? activityData : []
      const found = activityArray.find(a => a.date && a.date.startsWith(dateStr))
      result[count - 1 - i] = found ? Math.round((found.time_spent / 60) * 10) / 10 : 0
    }
    return result
  }, [activityData, dayCount, timeRange])

  const maxWeeklyHours = useMemo(() => Math.max(...weeklyProgress, 1), [weeklyProgress])

  return (
    <AnimatedPage className="space-y-10 pb-12 pt-4">
      <SEO title="Learning Analytics - LearningHub" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary-600" />
            Learning Analytics
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Deep insights into your cognitive growth and mastery
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                timeRange === range
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-lg'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : statsData ? (
          <>
            <StatCard
              icon={Clock}
              label="Total Focus"
              value={`${Math.round(statsData.total_learning_time / 60)}h`}
              color="#3b82f6"
              delay={0.1}
            />
            <StatCard
              icon={BookOpen}
              label="Course Mastery"
              value={statsData.completed_courses ?? 0}
              color="#10b981"
              delay={0.2}
            />
            <StatCard
              icon={Zap}
              label="Learning Level"
              value={statsData.level ?? 1}
              color="#f59e0b"
              delay={0.3}
            />
            <StatCard
              icon={Flame}
              label="Logic Streak"
              value={`${statsData.current_streak ?? 0}d`}
              color="#ef4444"
              delay={0.4}
            />
          </>
        ) : (
          <div className="col-span-4 p-8 text-center text-gray-500 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
            <p>Could not load primary statistics.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Visualization */}
        <WidgetBoundary widgetName="Weekly Visualization">
          <Card className="lg:col-span-2 p-8 border-none shadow-xl bg-white dark:bg-gray-900/50 backdrop-blur-xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BarChart3 className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  Focus Distribution
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                  Average:{' '}
                  {Math.round(
                    (weeklyProgress.reduce((a, b) => a + b, 0) /
                      Math.max(weeklyProgress.length, 1)) *
                      10
                  ) / 10}
                  h / Day
                </p>
              </div>
            </div>
            {isLoadingActivity ? (
              <Skeleton className="w-full h-64 rounded-2xl" />
            ) : (
              <div className="flex items-end justify-between gap-4 h-64 relative z-10">
                {weeklyProgress.map((hours, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="relative w-full flex flex-col justify-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(hours / maxWeeklyHours) * 100}%` }}
                        className="w-full bg-gradient-to-t from-primary-600 to-indigo-500 rounded-2xl relative transition-all group-hover:scale-x-105 min-h-[4px]"
                      >
                        <div className="absolute inset-0 shimmer opacity-20" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          {hours}h
                        </div>
                      </motion.div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      {chartDays[index]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </WidgetBoundary>

        {/* Skills Progress */}
        <WidgetBoundary widgetName="Skills Progress">
          <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 h-full">
            <h3 className="text-lg font-black tracking-tight mb-8 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Learning Proficiency
            </h3>
            {isLoadingSkills ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : skillsData && Array.isArray(skillsData) && skillsData.length > 0 ? (
              <div className="space-y-6">
                {skillsData.slice(0, 5).map((skill, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        {skill.skill_name}
                      </span>
                      <span className="text-xs font-black tabular-nums text-primary-500">
                        {skill.proficiency_percent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.proficiency_percent}%` }}
                        className="h-full bg-primary-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 mt-4">
                <Target className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-500">No skills assessed yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Complete tests and lessons to start tracking your Learning Proficiency
                </p>
              </div>
            )}
          </Card>
        </WidgetBoundary>
      </div>

      {/* Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <WidgetBoundary widgetName="Activity Stream">
          <Card className="p-8 border-none shadow-xl">
            <h3 className="text-lg font-black tracking-tight mb-8 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Recent Activity Stream
            </h3>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : activityData && Array.isArray(activityData) && activityData.length > 0 ? (
              <div className="space-y-4">
                {activityData
                  .slice(-4)
                  .reverse()
                  .map((day, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex flex-col items-center justify-center shadow-sm shrink-0">
                        <span className="text-[10px] font-black uppercase text-primary-500 leading-none">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-xs font-bold leading-none mt-1">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {day.lessons_completed} Lessons Finalized
                          </p>
                          <span className="text-[10px] font-black text-emerald-500 whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                            +{day.xp_earned} XP
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {Math.round((day.time_spent / 60) * 10) / 10}h Cognitive Session
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 mt-3 shrink-0" />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-500">No recent activity detected.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start learning to populate your stream.
                </p>
              </div>
            )}
          </Card>
        </WidgetBoundary>

        {/* Course Performance Section */}
        <WidgetBoundary widgetName="Course Performance">
          <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-lg h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">Course Performance</h3>
                <p className="text-sm text-gray-500">
                  Track your progress across all enrolled courses
                </p>
              </div>
            </div>
            {isLoadingCourses ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : coursesData && Array.isArray(coursesData) && coursesData.length > 0 ? (
              <div className="space-y-4">
                {coursesData.slice(0, 3).map(course => (
                  <div
                    key={course.course_id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm truncate">{course.course_title}</h4>
                        <span className="text-xs font-bold text-primary-600 shrink-0">
                          {course.progress_percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${course.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                        <span className="truncate">{course.time_spent} minutes recorded</span>
                        <span className="shrink-0">
                          Active:{' '}
                          {new Date(course.last_accessed).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 mt-4">
                <BookOpen className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-500">No active courses</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Enroll in a course to track your learning progress and performance
                </p>
              </div>
            )}
          </Card>
        </WidgetBoundary>

        {/* Test Performance Analytics */}
        <WidgetBoundary widgetName="Test Statistics">
          <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">Test Performance</h3>
                <p className="text-sm text-gray-500">Track stored Tests A+ results</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                  Avg: {isLoadingTestStats ? '...' : (testAnalyticsData?.average_score ?? 0)}%
                </span>
              </div>
            </div>

            {isLoadingTestStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-emerald-900 dark:text-emerald-300">Passed</span>
                  </div>
                  <p className="text-3xl font-black text-emerald-600 relative z-10 tabular-nums">
                    {testAnalyticsData?.passed_tests ?? 0}
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium relative z-10 mt-1">
                    Completed attempts
                  </p>
                  <CheckCircle className="w-20 h-20 text-emerald-500 absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-900 dark:text-blue-300">Tests Taken</span>
                  </div>
                  <p className="text-3xl font-black text-blue-600 relative z-10 tabular-nums">
                    {testAnalyticsData?.total_tests ?? 0}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium relative z-10 mt-1">
                    Latest stored attempts
                  </p>
                  <Target className="w-20 h-20 text-blue-500 absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-purple-900 dark:text-purple-300">
                      Pass Rate
                    </span>
                  </div>
                  <p className="text-3xl font-black text-purple-600 relative z-10 tabular-nums">
                    {testAnalyticsData?.pass_rate ?? 0}%
                  </p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium relative z-10 mt-1">
                    Across completed tests
                  </p>
                  <TrendingUp className="w-20 h-20 text-purple-500 absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            )}
          </Card>
        </WidgetBoundary>
      </div>
    </AnimatedPage>
  )
}
