import { useState, useCallback, memo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  Trophy,
  Target,
  Sparkles,
  AlertCircle,
  Flame,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'

import { SEO } from '../components/SEO'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { AITestGeneratorModal } from '../components/AITestGeneratorModal'
import AILearningEngine from '../components/AILearningEngine'
import type { TestQuestion } from '../services/testsAService'
import { dashboardService, type NextBestAction } from '../services/dashboardService'
import { NextBestActionCard } from '../components/dashboard/NextBestActionCard'
import { DashboardPomodoroWidget } from '../components/dashboard/DashboardPomodoroWidget'
import { ContestCountdownWidget } from '../components/dashboard/ContestCountdownWidget'
import { DashboardScratchpadWidget } from '../components/dashboard/DashboardScratchpadWidget'
import { WeeklyStudyAreaChart } from '../components/dashboard/WeeklyStudyAreaChart'
import { StreakMultiplierBadge } from '../components/dashboard/StreakMultiplierBadge'
import { TopicMasteryRadar } from '../components/dashboard/TopicMasteryRadar'
import { SpeedTrendWidget } from '../components/dashboard/SpeedTrendWidget'

interface DashboardStats {
  testsAttempted: number
  testsCompleted: number
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
  const location = useLocation()
  const auth = useStore(state => state.auth)
  const progress = useStore(state => state.progress)
  const addToast = useStore(state => state.addToast)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  useEffect(() => {
    if (location.state && (location.state as { paymentSuccess?: boolean }).paymentSuccess) {
      addToast({
        message: '🎉 Payment confirmed! Your subscription has been activated.',
        type: 'success',
      })
      window.history.replaceState({}, document.title)
    }
  }, [location.state, addToast])

  const startTestAttempt = useStore(state => state.startTestAttempt)
  const setTestQuestions = useStore(state => state.setTestQuestions)

  const handleTestGenerated = useCallback(
    (testData: {
      questions: TestQuestion[]
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

  const {
    data: dashboardData,
    isLoading,
    error: dashboardError,
  } = useQuery<DashboardStats | null>({
    queryKey: ['dashboard-stats', auth.user?.id ?? auth.user?.username ?? 'guest'],
    queryFn: async ({ signal }) => {
      if (!auth.isAuthenticated) return null
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
          (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
        )
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: t.test?.title ?? 'Practice Assessment',
          score: t.score ?? 0,
          passed: Boolean(t.passed),
        }))

      return {
        testsAttempted: testResults.length,
        testsCompleted: completedTests.length,
        testsPassed: passedTests.length,
        totalXp: (profile?.xp as number) ?? progress.xp ?? 0,
        currentStreak: (profile?.streak as number) ?? progress.streak ?? 0,
        level: (profile?.level as number) ?? progress.level ?? 1,
        recentTests: recentTestsList,
      }
    },
    staleTime: 30 * 1000,
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard-analytics-telemetry', auth.user?.id ?? auth.user?.username ?? 'guest'],
    queryFn: () => dashboardService.getDashboardAnalytics(),
    enabled: auth.isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <DashboardSkeleton />

  const stats = dashboardData ?? {
    testsAttempted: 0,
    testsCompleted: 0,
    testsPassed: 0,
    totalXp: progress.xp ?? auth.user?.xp ?? 0,
    currentStreak: progress.streak ?? auth.user?.streak ?? 0,
    level: progress.level ?? auth.user?.level ?? 1,
    recentTests: [],
  }

  const passRate =
    stats.testsCompleted > 0
      ? Math.round((stats.testsPassed / stats.testsCompleted) * 100)
      : null

  // Recommend a weak topic only when enough real attempts exist to reduce noisy suggestions.
  const weakestTopic = Object.values(analyticsData?.topicMastery ?? {})
    .filter(topic => Number.isFinite(topic.accuracy) && topic.totalAttempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || b.totalAttempts - a.totalAttempts)[0]

  const hasPersonalizedAction = Boolean(weakestTopic)
  const nextAction: NextBestAction = weakestTopic
    ? {
        id: `review-${weakestTopic.topicName}`,
        title: `Recommended focus: ${weakestTopic.topicName}`,
        reason: `Your recent results show ${Math.round(weakestTopic.accuracy)}% accuracy across ${weakestTopic.totalAttempts} attempts. A focused practice session can help strengthen this topic.`,
        type: 'weak_topic',
        actionUrl: '/tests-a',
        actionLabel: 'Open practice hub',
        estimatedMinutes: 10,
        priority: weakestTopic.accuracy < 50 ? 'HIGH' : 'MEDIUM',
      }
    : {
        id: 'start-diagnostic',
        title: stats.testsCompleted > 0 ? 'Keep your learning momentum going' : 'Build your learning baseline',
        reason:
          stats.testsCompleted > 0
            ? 'A short practice session reinforces what you know and gives LearningHub fresh data to guide your next steps.'
            : 'Complete a short practice assessment to establish your baseline and unlock useful progress insights.',
        type: 'daily_goal',
        actionUrl: '/tests-a',
        actionLabel: stats.testsCompleted > 0 ? 'Start a practice session' : 'Take a diagnostic',
        estimatedMinutes: 10,
        priority: 'MEDIUM',
      }

  const currentLevel = stats.level
  const xpInCurrentLevel = stats.totalXp % 1000
  const xpForNextLevel = 1000
  const levelProgress = Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100))

  return (
    <AnimatedPage className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Command Dashboard - LearningHub"
        description="Monitor your learning trajectory, cognitive benchmarks, and daily focus sprint."
      />

      {/* Header & Streak Tier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome back, {auth.user?.username || 'Scholar'}
            </h1>
            <StreakMultiplierBadge
              streak={stats.currentStreak}
              longestStreak={analyticsData?.summary?.longestStreak}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every focused session counts. Choose one small action and build momentum toward your goal.
          </p>
        </div>

        <button
          onClick={() => setIsAIModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Generate Custom AI Test</span>
        </button>
      </div>

      {dashboardError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Some dashboard data couldn’t be refreshed. Saved XP and streak are shown where available.</span>
        </div>
      )}

      {/* Spotlight: AI Next Best Action */}
      <NextBestActionCard action={nextAction} personalized={hasPersonalizedAction} />

      {/* 4 Core Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats.testsAttempted}
            </div>
            <div className="text-xs font-bold text-gray-400">Assessments Taken</div>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {passRate === null ? '—' : `${passRate}%`}
            </div>
            <div className="text-xs font-bold text-gray-400">Pass Rate</div>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats.totalXp.toLocaleString()} XP
            </div>
            <div className="text-xs font-bold text-gray-400">Level {currentLevel} Scholar</div>
          </div>
        </Card>

        {/* Metric 4 */}
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {stats.currentStreak} Days
            </div>
            <div className="text-xs font-bold text-gray-400">Continuous Study Streak</div>
          </div>
        </Card>
      </div>

      {/* Bento Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Analytics & Recent Activity) - Span 2 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          {/* 7-Day Area Chart */}
          <WeeklyStudyAreaChart data={analyticsData?.accuracyTrend ?? []}
          />

          {/* Recent Tests Table */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                Recent Completed Assessments
              </h3>
              <button
                onClick={() => navigate('/tests-a-history')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Analytics History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {stats.recentTests.length > 0 ? (
                stats.recentTests.map(test => (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => navigate('/tests-a-history')}
                    aria-label={`Review ${test.title}`}
                    className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900/50 hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl text-xs font-black shrink-0 ${
                          test.passed
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {test.score}%
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {test.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {test.passed ? 'Passed' : 'Review recommended'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
                      Review <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 px-5 py-7 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Brain className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    No completed assessments yet
                  </h4>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Your first scorecard and learning insights will appear here after you finish a practice test.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/tests-a')}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Start your first practice test
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Topic Mastery Radar */}
          {analyticsData?.topicMastery && Object.keys(analyticsData.topicMastery).length > 0 && (
            <TopicMasteryRadar topicMastery={analyticsData.topicMastery} />
          )}

          {/* AI Learning Recommendations */}
          <AILearningEngine />
        </div>

        {/* Right Column: Productivity Tools & Countdowns - Span 1 */}
        <div className="space-y-6">
          {/* Pomodoro Focus Timer */}
          <DashboardPomodoroWidget />

          {/* Contest Countdown */}
          <ContestCountdownWidget />

          {/* Speed Trend */}
          {analyticsData?.speedTrend && analyticsData.speedTrend.length > 0 && (
            <SpeedTrendWidget data={analyticsData.speedTrend} />
          )}

          {/* Level Progress */}
          <Card className="p-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-900 dark:text-white">
                Tier Progress (Level {currentLevel})
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                {xpInCurrentLevel} / {xpForNextLevel} XP
              </span>
            </div>
            <ProgressBar progress={levelProgress} className="h-2" />
            <p className="text-[10px] text-gray-400">
              Earn {xpForNextLevel - xpInCurrentLevel} more XP to reach Level {currentLevel + 1} and
              keep building your learning momentum.
            </p>
          </Card>

          {/* Scratchpad */}
          <DashboardScratchpadWidget />
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
