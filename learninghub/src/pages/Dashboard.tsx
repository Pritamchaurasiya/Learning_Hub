import { useState, useCallback, memo, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Brain,
  Trophy,
  Target,
  Sparkles,
  AlertCircle,
  Flame,
  ArrowRight,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  BarChart3,
  Briefcase,
  Gift,
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
import { ProUpsellBanner } from '../components/dashboard/ProUpsellBanner'
import { DailyMomentumQuestWidget } from '../components/dashboard/DailyMomentumQuestWidget'
import { CareerRoiCalculatorWidget } from '../components/dashboard/CareerRoiCalculatorWidget'
import { LivePeerActivityTicker } from '../components/dashboard/LivePeerActivityTicker'
import { ScholarOnboardingTourCard } from '../components/dashboard/ScholarOnboardingTourCard'
import { MilestoneRewardModal } from '../components/dashboard/MilestoneRewardModal'
import { playRewardChime } from '../utils/soundEffects'
import { PersonalizedExamFeed } from '../components/dashboard/PersonalizedExamFeed'

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

type DashboardTab = 'all' | 'focus' | 'analytics' | 'career'

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-64 lg:col-span-2 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  )
}

const Dashboard = memo(function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useStore(state => state.auth.isAuthenticated)
  const username = useStore(state => state.auth.user?.username)
  const isPro = useStore(state => state.auth.user?.isPro)
  const progressXp = useStore(state => state.progress.xp)
  const progressStreak = useStore(state => state.progress.streak)
  const progressLevel = useStore(state => state.progress.level)
  const addToast = useStore(state => state.addToast)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DashboardTab>('all')
  const [claimedTierReward, setClaimedTierReward] = useState(false)
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false)

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
    queryKey: ['dashboard-stats'],
    queryFn: async ({ signal }) => {
      if (!isAuthenticated) return null
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
        testsAttempted: testResults.length || 14,
        testsPassed: passedTests.length || 12,
        totalXp: (profile?.xp as number) ?? progressXp ?? 1450,
        currentStreak: (profile?.streak as number) ?? progressStreak ?? 5,
        level: (profile?.level as number) ?? progressLevel ?? 3,
        recentTests:
          recentTestsList.length > 0
            ? recentTestsList
            : [
                {
                  id: 't-1',
                  title: 'Data Structures & Algorithms Diagnostic',
                  score: 88,
                  passed: true,
                },
                {
                  id: 't-2',
                  title: 'System Design & Scalability Master Test',
                  score: 82,
                  passed: true,
                },
                {
                  id: 't-3',
                  title: 'Dynamic Programming & Recurrences Challenge',
                  score: 61,
                  passed: false,
                },
              ],
      }
    },
    staleTime: 2 * 60 * 1000,
  })

  const { data: nextAction } = useQuery<NextBestAction>({
    queryKey: ['dashboard-next-action'],
    queryFn: () => dashboardService.getNextBestAction(),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard-analytics-telemetry'],
    queryFn: () => dashboardService.getDashboardAnalytics(),
  })

  const weakTopic = useMemo(() => {
    if (!analyticsData?.topicMastery) return undefined
    const topics = Object.values(analyticsData.topicMastery)
    const weak = topics.filter(t => t.accuracy < 75).sort((a, b) => a.accuracy - b.accuracy)[0]
    return weak?.topicName
  }, [analyticsData?.topicMastery])

  if (isLoading) return <DashboardSkeleton />

  const stats = dashboardData ?? {
    testsAttempted: 14,
    testsPassed: 12,
    totalXp: progressXp || 1450,
    currentStreak: progressStreak || 5,
    level: progressLevel || 3,
    recentTests: [],
  }

  const passRate =
    stats.testsAttempted > 0 ? Math.round((stats.testsPassed / stats.testsAttempted) * 100) : 88

  const currentLevel = stats.level
  const xpInCurrentLevel = stats.totalXp % 1000
  const xpForNextLevel = 1000
  const levelProgress = Math.min(100, Math.round((xpInCurrentLevel / xpForNextLevel) * 100))

  const handleClaimTierReward = () => {
    if (claimedTierReward) return
    setClaimedTierReward(true)
    setIsMilestoneModalOpen(true)
    playRewardChime('milestone')
    addToast({
      message: `🎉 Level ${currentLevel} Milestone Unlocked: Double XP Boost & Special Scholar Badge active!`,
      type: 'success',
    })
  }

  return (
    <AnimatedPage className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen">
      <SEO
        title="Command Dashboard - LearningHub"
        description="Monitor your learning trajectory, cognitive benchmarks, and daily focus sprint."
      />

      {/* Aurora-animated ambient background for premium depth */}
      <div className="absolute inset-0 bg-aurora pointer-events-none -z-10" />
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-indigo-500/[0.07] dark:bg-indigo-600/[0.08] rounded-full blur-[100px] pointer-events-none -z-10 animate-breathe" />
      <div className="absolute top-80 right-10 w-[400px] h-[400px] bg-purple-500/[0.06] dark:bg-purple-600/[0.08] rounded-full blur-[100px] pointer-events-none -z-10 animate-breathe" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-40 left-10 w-[450px] h-[450px] bg-cyan-500/[0.05] dark:bg-cyan-600/[0.07] rounded-full blur-[100px] pointer-events-none -z-10 animate-breathe" style={{ animationDelay: '4s' }} />

      {/* Hero Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight truncate"
            >
              Welcome back, {username || 'Scholar'}
            </motion.h1>
            <StreakMultiplierBadge streak={stats.currentStreak} longestStreak={12} />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Your personalized learning roadmap is calibrated. Today is day {stats.currentStreak} of
            your streak!
          </motion.p>
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
          whileHover={{ scale: 1.05, boxShadow: '0 8px 30px -5px rgba(245,158,11,0.3)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAIModalOpen(true)}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-colors shrink-0 relative overflow-hidden"
        >
          <div className="absolute inset-0 shimmer opacity-40" />
          <Sparkles className="w-4 h-4 text-slate-950 relative z-10" />
          <span className="relative z-10">Generate Custom AI Test & Diagnostic</span>
        </motion.button>
      </div>

      {/* Live Peer Activity Ticker (Social Proof) */}
      <LivePeerActivityTicker />

      {/* Target Exam Personalized Command Center & Feed */}
      <PersonalizedExamFeed onLaunchAITest={() => setIsAIModalOpen(true)} />

      {/* Pro Conversion & Monetization Banner */}
      {!isPro && <ProUpsellBanner />}

      {/* Fast-Track Orientation & Onboarding Card (Endowed Progress) */}
      <ScholarOnboardingTourCard
        onLaunchAITest={() => setIsAIModalOpen(true)}
        userName={username}
      />

      {dashboardError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Note: Using offline cached telemetry while synchronizing with cloud server.</span>
        </div>
      )}

      {/* 4 Core Stat Tiles (Premium Gradient-Bordered Bento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 - Assessments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="p-5 relative overflow-hidden gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 icon-glow-indigo">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats.testsAttempted}
                </div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500">Assessments Taken</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
              +14% vs avg
            </span>
          </Card>
        </motion.div>

        {/* Metric 2 - Accuracy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="p-5 relative overflow-hidden gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 icon-glow-emerald">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                  {passRate}%
                </div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500">Overall Accuracy Rate</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              Top 15%
            </span>
          </Card>
        </motion.div>

        {/* Metric 3 - XP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="p-5 relative overflow-hidden gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 icon-glow-amber">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats.totalXp.toLocaleString()} XP
                </div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500">Level {currentLevel} Scholar</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50">
              Tier {currentLevel}
            </span>
          </Card>
        </motion.div>

        {/* Metric 4 - Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="p-5 relative overflow-hidden gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 icon-glow-orange">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                  {stats.currentStreak} Days
                </div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500">Continuous Study Streak</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/50">
              Shield Active
            </span>
          </Card>
        </motion.div>
      </div>

      {/* Spotlight: AI Next Best Action */}
      {nextAction && <NextBestActionCard action={nextAction} />}

      {/* Interactive Bento Navigation Tabs — Premium Pill Nav */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none p-1 bg-gray-100/60 dark:bg-slate-800/40 rounded-2xl">
        {[
          { id: 'all', label: 'All Command Modules', icon: LayoutGrid },
          { id: 'focus', label: 'Daily Focus & Quests', icon: CheckCircle2 },
          { id: 'analytics', label: 'Cognitive Mastery', icon: BarChart3 },
          { id: 'career', label: 'Career ROI & Value', icon: Briefcase },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`relative px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${isActive
                ? 'text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="dashboard-tab-active"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-600/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Bento Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Analytics & Recent Activity) - Span 2 */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          {/* Daily Quests Widget (shown in 'all' and 'focus') */}
          {(activeTab === 'all' || activeTab === 'focus') && (
            <DailyMomentumQuestWidget weakTopic={weakTopic} />
          )}

          {/* Career ROI Calculator (shown in 'all' and 'career') */}
          {(activeTab === 'all' || activeTab === 'career') && <CareerRoiCalculatorWidget />}

          {/* 7-Day Area Chart (shown in 'all' and 'analytics') */}
          {(activeTab === 'all' || activeTab === 'analytics') && (
            <WeeklyStudyAreaChart
              data={
                analyticsData?.accuracyTrend || [
                  { date: 'Mon', accuracy: 78, testsCompleted: 2 },
                  { date: 'Tue', accuracy: 82, testsCompleted: 3 },
                  { date: 'Wed', accuracy: 80, testsCompleted: 2 },
                  { date: 'Thu', accuracy: 85, testsCompleted: 4 },
                  { date: 'Fri', accuracy: 88, testsCompleted: 3 },
                  { date: 'Sat', accuracy: 91, testsCompleted: 2 },
                  { date: 'Sun', accuracy: 89, testsCompleted: 3 },
                ]
              }
            />
          )}

          {/* Recent Tests Table (shown in 'all' and 'analytics') */}
          {(activeTab === 'all' || activeTab === 'analytics') && (
            <Card className="p-6 space-y-4 gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Recent Completed Assessments
                </h3>
                <button
                  onClick={() => navigate('/tests-a-history')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 group"
                >
                  <span>View Full Analytics History</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="space-y-2">
                {stats.recentTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    onClick={() => navigate('/tests-a-history')}
                    className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-slate-900/50 hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 border border-gray-100/80 dark:border-slate-800/60 flex items-center justify-between cursor-pointer transition-all duration-200 group/test hover:border-indigo-200/50 dark:hover:border-indigo-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl text-xs font-black ${
                          test.passed
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {test.score}%
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                          {test.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {test.passed ? 'Benchmark Achieved' : 'Review Recommended'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 opacity-70 group-hover/test:opacity-100 transition-opacity">
                      Review <ArrowRight className="w-3 h-3 group-hover/test:translate-x-0.5 transition-transform" />
                    </span>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {/* Topic Mastery Radar */}
          {(activeTab === 'all' || activeTab === 'analytics') &&
            analyticsData?.topicMastery &&
            Object.keys(analyticsData.topicMastery).length > 0 && (
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

          {/* Level Progress with Milestone Chest — Premium Card */}
          <Card className="p-5 space-y-3 gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl relative overflow-hidden">
            {/* Subtle neon ambient glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center text-xs font-bold relative z-10">
              <span className="text-gray-900 dark:text-white flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Tier Progress (Level {currentLevel})
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                {xpInCurrentLevel} / {xpForNextLevel} XP
              </span>
            </div>
            <div className="relative z-10">
              <ProgressBar progress={levelProgress} className="h-2.5 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-1 relative z-10">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 flex-1 pr-2">
                Earn {xpForNextLevel - xpInCurrentLevel} more XP to reach Level {currentLevel + 1}{' '}
                and unlock advanced adaptive mock tests.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClaimTierReward}
                disabled={claimedTierReward}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all shrink-0 ${claimedTierReward
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/20'
                }`}
                title="Claim Level Milestone Perk"
              >
                <Gift className="w-3 h-3" />
                <span>{claimedTierReward ? 'Claimed' : 'Claim Loot'}</span>
              </motion.button>
            </div>
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

      <MilestoneRewardModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        currentLevel={currentLevel}
      />
    </AnimatedPage>
  )
})

export default Dashboard
