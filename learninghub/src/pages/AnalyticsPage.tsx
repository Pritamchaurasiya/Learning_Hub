import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  BookOpen,
  Trophy,
  Target,
  BarChart3,
  Activity,
  Zap,
  ChevronRight,
  Flame,
  LayoutDashboard,
  AlertCircle,
  RefreshCw,
  Download,
  CheckCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import WidgetBoundary from '../components/ui/WidgetBoundary'
import {
  analyticsService,
  type DashboardStats,
  type LearningActivity,
  type SkillProgress,
} from '../services/analyticsService'

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
      <Card className="p-6 border-none shadow-sm hover:shadow-xl transition-all group relative overflow-hidden bg-white dark:bg-gray-900">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon className="w-20 h-20" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner`}
            style={{ backgroundColor: `${color}10` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </div>
          )}
        </div>
        <h3 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
          {value}
        </h3>
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
          {label}
        </p>
      </Card>
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<LearningActivity[]>([])
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const daysMap = { week: 7, month: 30, year: 365 }
      // eslint-disable-next-line security/detect-object-injection
      const daysParam = daysMap[timeRange]

      const [statsRes, activityRes, skillsRes] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getLearningActivity(daysParam),
        analyticsService.getSkillProgress(),
      ])

      setStats(statsRes.data)
      setActivity(activityRes.data)
      setSkills(skillsRes.data)
    } catch (err) {
      setError('Neural metrics sync failed. Reconnect to resume tracking.')
      if (import.meta.env.DEV) {
        console.error('[AnalyticsPage] Error:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  const chartDays = useMemo(() => {
    return Array(7)
      .fill(0)
      .map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d.toLocaleDateString('en-US', { weekday: 'short' })
      })
  }, [])

  const weeklyProgress = useMemo(() => {
    const result = Array(7).fill(0)
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      const found = activity.find(a => a.date && a.date.startsWith(dateStr))
      result[6 - i] = found ? Math.round((found.time_spent / 60) * 10) / 10 : 0
    }
    return result
  }, [activity])

  const maxWeeklyHours = useMemo(() => Math.max(...weeklyProgress, 1), [weeklyProgress])

  if (isLoading) {
    return (
      <AnimatedPage className="space-y-10 pb-12 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-12 w-64 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
          <div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[300px] w-full rounded-2xl" />
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
      </AnimatedPage>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Analytics Unavailable</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="space-y-10 pb-12">
      <SEO title="Neural Analytics - LearningHub" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary-600" />
            Neural Analytics
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Total Focus"
          value={`${stats ? Math.round(stats.total_learning_time / 60) : 0}h`}
          trend="+12%"
          color="#3b82f6"
          delay={0.1}
        />
        <StatCard
          icon={BookOpen}
          label="Course Mastery"
          value={stats?.completed_courses ?? 0}
          color="#10b981"
          delay={0.2}
        />
        <StatCard
          icon={Zap}
          label="Neural Level"
          value={stats?.level ?? 1}
          color="#f59e0b"
          delay={0.3}
        />
        <StatCard
          icon={Flame}
          label="Logic Streak"
          value={`${stats?.current_streak ?? 0}d`}
          color="#ef4444"
          delay={0.4}
        />
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
                  Average: {Math.round((weeklyProgress.reduce((a, b) => a + b, 0) / 7) * 10) / 10}h
                  / Day
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 h-64 relative z-10">
              {weeklyProgress.map((hours, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(hours / maxWeeklyHours) * 100}%` }}
                      className="w-full bg-gradient-to-t from-primary-600 to-indigo-500 rounded-2xl relative transition-all group-hover:scale-x-105"
                    >
                      <div className="absolute inset-0 shimmer opacity-20" />
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {hours}h
                      </div>
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    {/* eslint-disable-next-line security/detect-object-injection */}
                    {chartDays[index]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </WidgetBoundary>

        {/* Skills Progress */}
        <WidgetBoundary widgetName="Skills Progress">
          <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 h-full">
            <h3 className="text-lg font-black tracking-tight mb-8 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Neural Proficiency
            </h3>
            <div className="space-y-6">
              {skills.slice(0, 5).map((skill, i) => (
                // eslint-disable-next-line react/no-array-index-key
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
            <Button
              variant="outline"
              className="w-full mt-10 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2"
            >
              Detailed Skill Tree
            </Button>
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
            <div className="space-y-6">
              {activity.slice(0, 4).map((day, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black uppercase text-primary-500">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-bold">{new Date(day.date).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {day.lessons_completed} Lessons Finalized
                      </p>
                      <span className="text-[10px] font-black text-emerald-500">
                        +{day.xp_earned} XP
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((day.time_spent / 60) * 10) / 10}h Cognitive Session
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 mt-3" />
                </div>
              ))}
            </div>
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
              <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Export Report
              </Button>
            </div>
            <div className="space-y-4">
              {[
                {
                  name: 'System Design Mastery',
                  progress: 85,
                  completed: 17,
                  total: 20,
                  lastAccessed: '2 hours ago',
                },
                {
                  name: 'Data Structures Deep Dive',
                  progress: 62,
                  completed: 12,
                  total: 20,
                  lastAccessed: '1 day ago',
                },
                {
                  name: 'Advanced Algorithms',
                  progress: 45,
                  completed: 9,
                  total: 20,
                  lastAccessed: '3 days ago',
                },
              ].map((course, idx) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm">{course.name}</h4>
                      <span className="text-xs font-bold text-primary-600">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>
                        {course.completed} of {course.total} lessons completed
                      </span>
                      <span>Last accessed: {course.lastAccessed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </WidgetBoundary>

        {/* Quiz Performance Analytics */}
        <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold">Quiz Performance</h3>
              <p className="text-sm text-gray-500">Track your quiz scores and improvement trends</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                Avg: 82%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-bold">Best Score</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">95%</p>
              <p className="text-xs text-gray-500">System Design Basics</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-bold">Quizzes Taken</span>
              </div>
              <p className="text-2xl font-black text-blue-600">24</p>
              <p className="text-xs text-gray-500">This {timeRange}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-bold">Improvement</span>
              </div>
              <p className="text-2xl font-black text-purple-600">+12%</p>
              <p className="text-xs text-gray-500">vs last {timeRange}</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 border-none shadow-xl bg-primary-600 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest">
              Growth Recommendation
            </span>
            <h3 className="text-2xl font-black mt-6 mb-4 leading-tight">
              Master System Design to Reach Level {(stats?.level ?? 0) + 1}
            </h3>
            <p className="text-primary-100/80 mb-10 leading-relaxed font-medium">
              Based on your 85% proficiency in Backend Architecture, we recommend the Advanced
              Scalability Lab to accelerate your neural growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1 bg-white text-primary-600 border-none font-black shadow-lg">
                Start Recommendation
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/40 text-white font-black hover:bg-white/10"
              >
                Compare Peers
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  )
}
