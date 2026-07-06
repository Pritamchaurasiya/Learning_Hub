import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, Trophy, TrendingUp, Award, Target, Zap, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { HeroSection } from '../components/landing/HeroSection'
import { ExamCoverage } from '../components/landing/ExamCoverage'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { HowItWorks } from '../components/landing/HowItWorks'
import { BenefitsSection } from '../components/landing/BenefitsSection'
import { TrustMetrics } from '../components/landing/TrustMetrics'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'

interface HomePageProps {
  isDashboard?: boolean
}

interface DashboardStats {
  enrolledCourses: number
  completedCourses: number
  testsAttempted: number
  testsPassed: number
  totalXp: number
  currentStreak: number
  level: number
  recentActivity: Array<{ type: string; title: string; date: string }>
  enrolledCoursesList: Array<{
    id: string
    title: string
    progress: number
    thumbnail: string | null
  }>
}

export default function HomePage({ isDashboard = false }: HomePageProps) {
  const navigate = useNavigate()
  const auth = useStore(state => state.auth)
  const progress = useStore(state => state.progress)
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(isDashboard)

  const { data: recommendations } = useQuery({
    queryKey: ['dashboard-recommendations'],
    queryFn: async () => {
      const res = await fetchApi('/recommendations?limit=3')
      return res.data
    },
    enabled: isDashboard && auth.isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      if (!isDashboard || !auth.isAuthenticated) return
      try {
        setLoading(true)
        const [profileRes, testsRes] = await Promise.all([
          fetchApi('/auth/me', { signal }),
          fetchApi('/tests/attempts', { signal }),
        ])

        const profile =
          (profileRes?.data?.user as Record<string, unknown> | undefined) ??
          (profileRes?.user as Record<string, unknown> | undefined) ??
          profileRes
        const testsData =
          (testsRes?.data?.data as Record<string, unknown> | undefined) ??
          testsRes?.data ??
          testsRes
        const testResults = (Array.isArray(testsData?.results) ? testsData.results : []) as Array<
          Record<string, unknown>
        >

        const completedTests = testResults.filter(
          (t: Record<string, unknown>) => t.status === 'COMPLETED'
        )
        const passedTests = completedTests.filter((t: Record<string, unknown>) => t.passed)

        const userProgress = (Array.isArray(profile?.progress) ? profile.progress : []) as Array<
          Record<string, unknown>
        >
        const enrolledCoursesProgress = userProgress.filter(
          (p: Record<string, unknown>) => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED'
        )
        const completedCoursesProgress = userProgress.filter(
          (p: Record<string, unknown>) => p.status === 'COMPLETED'
        )

        if (signal?.aborted) return

        setDashboardData({
          enrolledCourses: enrolledCoursesProgress.length,
          completedCourses: completedCoursesProgress.length,
          testsAttempted: completedTests.length,
          testsPassed: passedTests.length,
          totalXp: (profile?.xp as number) ?? 0,
          currentStreak: (profile?.streak as number) ?? 0,
          level: (profile?.level as number) ?? 1,
          recentActivity: [],
          enrolledCoursesList: enrolledCoursesProgress
            .slice(0, 5)
            .map((p: Record<string, unknown>) => ({
              id: p.courseId as string,
              title: ((p.course as Record<string, unknown>)?.title as string) ?? 'Course',
              progress: (p.progress as number) ?? 0,
              thumbnail: ((p.course as Record<string, unknown>)?.thumbnail as string) ?? null,
            })),
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (import.meta.env.DEV) {
          console.error('Dashboard load error:', err)
        }
        if (signal?.aborted) return
        setDashboardData({
          enrolledCourses: 0,
          completedCourses: 0,
          testsAttempted: 0,
          testsPassed: 0,
          totalXp: progress.xp ?? 0,
          currentStreak: progress.streak ?? 0,
          level: progress.level ?? 1,
          recentActivity: [],
          enrolledCoursesList: [],
        })
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [isDashboard, auth.isAuthenticated, progress.xp, progress.streak, progress.level]
  )

  useEffect(() => {
    const abortController = new AbortController()
    loadDashboard(abortController.signal).catch(() => {})
    return () => abortController.abort()
  }, [loadDashboard])

  const handleStartFree = () => {
    navigate('/auth?mode=signup')
  }

  const handleViewDemo = () => {
    navigate('/search')
  }

  const handleSelectExam = (examId: string) => {
    navigate(`/search?q=${encodeURIComponent(examId)}`)
  }

  if (isDashboard && auth.isAuthenticated) {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      )
    }

    const stats = dashboardData
    const xpForNextLevel = (stats?.level ?? 1) * 100
    const xpProgress = (((stats?.totalXp ?? 0) % xpForNextLevel) / xpForNextLevel) * 100

    return (
      <AnimatedPage className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <SEO title="Dashboard - LearningHub" />

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {auth.user?.username ?? 'Learner'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here&apos;s your learning progress at a glance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.enrolledCourses ?? 0}
                </p>
                <p className="text-sm text-gray-500">Enrolled Courses</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Brain className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.testsAttempted ?? 0}
                </p>
                <p className="text-sm text-gray-500">Tests Attempted</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalXp ?? 0}
                </p>
                <p className="text-sm text-gray-500">Total XP</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.currentStreak ?? 0}
                </p>
                <p className="text-sm text-gray-500">Day Streak</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Level Progress
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Level {stats?.level ?? 1}</span>
                <span className="text-sm text-gray-500">
                  {stats?.totalXp ?? 0} / {xpForNextLevel} XP
                </span>
              </div>
              <ProgressBar progress={xpProgress} className="h-3" />
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                My Courses
              </h2>
              {stats?.enrolledCoursesList && stats.enrolledCoursesList.length > 0 ? (
                <div className="space-y-4">
                  {stats.enrolledCoursesList.map(course => (
                    <button
                      key={course.id}
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {course.title}
                        </p>
                        <div className="mt-2">
                          <ProgressBar progress={course.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{course.progress}% complete</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No courses enrolled yet</p>
                  <button
                    onClick={() => navigate('/search')}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Browse Courses
                  </button>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Exam Readiness
                </h2>
              </div>
              {stats && stats.testsAttempted > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {Math.round((stats.testsPassed / stats.testsAttempted) * 100)}%
                    </span>
                    <span className="text-sm text-gray-500 mb-1">Pass Rate</span>
                  </div>
                  <ProgressBar
                    progress={(stats.testsPassed / stats.testsAttempted) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Based on {stats.testsAttempted} recent test attempts
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">Take tests to calculate readiness</p>
                  <button
                    onClick={() => navigate('/tests-a')}
                    className="text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline"
                  >
                    Start a Test
                  </button>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/tests-a')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Brain className="w-5 h-5" />
                  <span className="font-medium">Start a Test</span>
                </button>
                <button
                  onClick={() => navigate('/problems')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Practice DSA</span>
                </button>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                >
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">View Leaderboard</span>
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">View Analytics</span>
                </button>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-gray-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight">
                    AI Recommendations
                  </h2>
                </div>

                {recommendations && recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((rec: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            {rec.topicName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/20">
                            {rec.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-300 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-xl p-6 text-center border border-white/10">
                    <p className="text-sm text-indigo-200">
                      Keep learning! Your AI-curated recommendations will appear here as you
                      progress.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary-600 to-purple-600 text-white shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-1">Keep Learning!</h3>
              <p className="text-sm text-white/80">
                Complete more courses and tests to earn badges and climb the leaderboard.
              </p>
            </Card>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="LearningHub - Master Your Exam with India's Best Practice Platform"
        description="Practice chapter-wise previous year questions for JEE, NEET, BITSAT & more. Get detailed solutions, smart analytics, and ace your competitive exam."
        keywords="JEE Main, JEE Advanced, NEET, BITSAT, previous year questions, competitive exam preparation, online practice"
      />

      <HeroSection onStartFree={handleStartFree} onViewDemo={handleViewDemo} />
      <ExamCoverage onSelectExam={handleSelectExam} />
      <FeaturesGrid />
      <HowItWorks />
      <BenefitsSection />
      <TrustMetrics />
      <FAQSection />
      <CTASection onGetStarted={handleStartFree} />
    </div>
  )
}
