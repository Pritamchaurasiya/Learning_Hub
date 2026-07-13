import { useEffect, useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Trophy, Target, Zap, Sparkles, AlertCircle, Flame } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { SEO } from '../components/SEO'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { AITestGeneratorModal } from '../components/AITestGeneratorModal'

interface DashboardStats {
  testsAttempted: number
  testsPassed: number
  totalXp: number
  currentStreak: number
  level: number
  recentTests: Array<{ id: string; title: string; score: number; passed: boolean }>
}

interface TestAttemptRecord {
  id: string
  status?: string
  completedAt?: string
  score?: number
  passed?: boolean
  test?: { title?: string }
}

function DashboardSkeleton() {
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

const Dashboard = memo(function Dashboard() {
  const navigate = useNavigate()
  const auth = useStore(state => state.auth)
  const progress = useStore(state => state.progress)
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const startTestAttempt = useStore(state => state.startTestAttempt)
  const setTestQuestions = useStore(state => state.setTestQuestions)

  const handleTestGenerated = useCallback(
    (testData: {
      questions: any[]
      testId: string
      testTitle: string
      totalQuestions: number
      timeLimit: number
      attemptId: string
    }) => {
      startTestAttempt(
        testData.testId,
        testData.testTitle,
        testData.totalQuestions,
        testData.timeLimit
      )
      setTestQuestions(
        testData.questions,
        {
          testId: testData.testId,
          testTitle: testData.testTitle,
          totalQuestions: testData.totalQuestions,
          timeLimit: testData.timeLimit,
        },
        testData.attemptId
      )
      navigate(`/tests-a/${testData.testId}`)
    },
    [startTestAttempt, setTestQuestions, navigate]
  )

  const { data: recommendations } = useQuery({
    queryKey: ['dashboard-recommendations'],
    queryFn: async () => {
      const res = await fetchApi('/recommendations?limit=3')
      return res.data
    },
    enabled: auth.isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      if (!auth.isAuthenticated) return
      try {
        setLoading(true)
        const [profileRes, testsRes] = await Promise.all([
          fetchApi('/auth/me', { signal }),
          fetchApi('/tests/attempts', { signal }),
        ])

        const profile = (profileRes?.data?.user ?? profileRes?.user ?? profileRes) as
          Record<string, unknown> | undefined
        const testsData = (testsRes?.data?.data ?? testsRes?.data ?? testsRes) as
          Record<string, unknown> | undefined
        const testResults = (
          Array.isArray(testsData?.results) ? testsData.results : []
        ) as TestAttemptRecord[]

        const completedTests = testResults.filter(t => t.status === 'COMPLETED')
        const passedTests = completedTests.filter(t => t.passed)

        const recentTestsList = completedTests
          .sort(
            (a, b) =>
              new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
          )
          .slice(0, 5)
          .map(t => ({
            id: t.id,
            title: t.test?.title ?? 'Practice Test',
            score: t.score ?? 0,
            passed: t.passed ?? false,
          }))

        if (signal?.aborted) return

        setDashboardData({
          testsAttempted: completedTests.length,
          testsPassed: passedTests.length,
          totalXp: (profile?.xp as number) ?? 0,
          currentStreak: (profile?.streak as number) ?? 0,
          level: (profile?.level as number) ?? 1,
          recentTests: recentTestsList,
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (signal?.aborted) return
        if (import.meta.env.DEV) console.error('Dashboard load error:', err)
        setDashboardError('Could not load latest dashboard data. Showing cached data.')
        setDashboardData({
          testsAttempted: 0,
          testsPassed: 0,
          totalXp: progress.xp ?? 0,
          currentStreak: progress.streak ?? 0,
          level: progress.level ?? 1,
          recentTests: [],
        })
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [auth.isAuthenticated, progress.xp, progress.streak, progress.level]
  )

  useEffect(() => {
    const abortController = new AbortController()
    loadDashboard(abortController.signal).catch(() => {})
    return () => abortController.abort()
  }, [loadDashboard])

  if (loading) return <DashboardSkeleton />

  const stats = dashboardData
  const xpForNextLevel = (stats?.level ?? 1) * 100
  const xpProgress = (((stats?.totalXp ?? 0) % xpForNextLevel) / xpForNextLevel) * 100
  const passRate =
    stats && stats.testsAttempted > 0
      ? Math.round((stats.testsPassed / stats.testsAttempted) * 100)
      : 0

  return (
    <AnimatedPage className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO title="Dashboard - LearningHub" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {auth.user?.username ?? 'Learner'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here&apos;s your learning progress at a glance.
          </p>
        </div>
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Generate AI Test
        </button>
      </div>

      {dashboardError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {dashboardError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 hover:border-blue-500/50 hover:shadow-xl transition-all cursor-pointer backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125 group-hover:rotate-12">
            <Brain className="w-24 h-24 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.testsAttempted ?? 0}
              </p>
              <p className="text-sm text-gray-500 font-medium">Tests Attempted</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 group relative overflow-hidden bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10 border border-green-100/50 dark:border-green-800/30 hover:border-green-500/50 hover:shadow-xl transition-all cursor-pointer backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125 group-hover:-rotate-12">
            <Target className="w-24 h-24 text-green-600 dark:text-green-400" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.testsPassed ?? 0}
              </p>
              <p className="text-sm text-gray-500 font-medium">Tests Passed</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 group relative overflow-hidden bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-900/10 border border-orange-100/50 dark:border-orange-800/30 hover:border-orange-500/50 hover:shadow-xl transition-all cursor-pointer backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125 group-hover:rotate-12">
            <Trophy className="w-24 h-24 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalXp ?? 0}
              </p>
              <p className="text-sm text-gray-500 font-medium">Total XP</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 group relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 border border-purple-100/50 dark:border-purple-800/30 hover:border-purple-500/50 hover:shadow-xl transition-all cursor-pointer backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125 group-hover:-rotate-12">
            <Flame className="w-24 h-24 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.currentStreak ?? 0}
              </p>
              <p className="text-sm text-gray-500 font-medium">Day Streak</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 glass-strong">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Level Progress
            </h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Level {stats?.level ?? 1}</span>
              <span className="text-sm text-gray-500 font-medium">
                {stats?.totalXp ?? 0} / {xpForNextLevel} XP
              </span>
            </div>
            <ProgressBar progress={xpProgress} className="h-3 rounded-full" />
          </Card>

          <Card className="p-6 glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tests</h2>
              <button
                onClick={() => navigate('/tests-a-history')}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                View All
              </button>
            </div>
            {stats?.recentTests && stats.recentTests.length > 0 ? (
              <div className="space-y-4">
                {stats.recentTests.map(test => (
                  <button
                    key={test.id}
                    onClick={() => navigate('/tests-a-history')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors text-left group"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${test.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}
                    >
                      {test.passed ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        <Target className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {test.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Score: <span className="font-semibold">{test.score}%</span> -{' '}
                        {test.passed ? 'Passed' : 'Needs Practice'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">
                  No tests attempted yet
                </p>
                <button onClick={() => setIsAIModalOpen(true)} className="btn-primary">
                  Start Practicing Now
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 glass">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Exam Readiness
              </h2>
            </div>
            {stats && stats.testsAttempted > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    {passRate}%
                  </span>
                  <span className="text-sm text-gray-500 mb-1 font-medium">Global Pass Rate</span>
                </div>
                <ProgressBar progress={passRate} className="h-2" />
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Based on your {stats.testsAttempted} recent test attempts
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-4">Take tests to calculate readiness</p>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white shadow-xl relative overflow-hidden group border-0">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
              <Sparkles className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md">
                  <Brain className="w-5 h-5 text-indigo-300" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight text-indigo-50">
                  AI Recommendations
                </h2>
              </div>
              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map(
                    (rec: { topicName: string; priority: string; reason: string }, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white/10 border border-white/10 rounded-xl p-4 hover:bg-white/20 transition-all backdrop-blur-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black uppercase tracking-widest text-indigo-200 truncate pr-2">
                            {rec.topicName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30 whitespace-nowrap">
                            {rec.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs font-medium text-indigo-100/80 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-6 text-center border border-white/10 backdrop-blur-sm">
                  <p className="text-sm text-indigo-200 font-medium">
                    Keep learning! Your AI-curated recommendations will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AITestGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onTestGenerated={handleTestGenerated}
      />
    </AnimatedPage>
  )
})

export default Dashboard
