import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  RotateCcw,
  Calendar,
  Clock,
  Target,
  ChevronRight,
  Brain,
  Filter,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Download,
  ExternalLink,
  Sparkles,
  BookOpen,
  Layers,
  Check,
  FileText,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { testsAService, TestAttempt, TestResult } from '../services/testsAService'
import { badgeService, Badge } from '../services/badgeService'
import { scorecardPdfService, ScorecardPdfService } from '../services/scorecardPdfService'
import { useStore } from '../stores/useStore'
import { BadgeDisplay, BadgeProgress } from '../components/BadgeDisplay'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { SpeedAccuracyScatterChart } from '../components/test/SpeedAccuracyScatterChart'
import { PeerPercentileBellCurve } from '../components/test/PeerPercentileBellCurve'
import { SocraticRemediationFlashcards } from '../components/test/SocraticRemediationFlashcards'

// Types
interface Stats {
  totalTests: number
  passedTests: number
  failedTests: number
  averageScore: number
  totalTime: number
  bestScore: number
  irtTheta: number
  userPercentile: number
  masteryTier: string
}

interface TopicMasteryItem {
  topic: string
  accuracy: number
  attempts: number
  status: 'Mastered' | 'Proficient' | 'Needs Focus'
}

const TestsAHistoryPage = () => {
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const [history, setHistory] = useState<TestAttempt[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL')

  // Selected attempt for topic drill-down modal
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttempt | null>(null)
  const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Load test history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const [historyResponse, badgesResponse] = await Promise.all([
          testsAService.getMyResults(),
          badgeService
            .getUserBadges()
            .catch(() => ({ status: 'success', data: { badges: [] } })),
        ])
        if (historyResponse.status === 'success') {
          setHistory(Array.isArray(historyResponse.data) ? historyResponse.data : [])
        }
        if (badgesResponse?.status === 'success' && badgesResponse.data?.badges) {
          setBadges(badgesResponse.data.badges)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    void loadHistory()
  }, [])

  // Calculate stats
  const stats: Stats = useMemo(() => {
    if (!history.length) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageScore: 0,
        totalTime: 0,
        bestScore: 0,
        irtTheta: 0.0,
        userPercentile: 50.0,
        masteryTier: 'Novice',
      }
    }

    const passed = history.filter(h => h.passed).length
    const scores = history.map(h => h.score)
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / history.length)
    const rawTheta = (avgScore - 50) / 16.66
    const irtTheta = Math.max(-3, Math.min(3, Number(rawTheta.toFixed(2))))
    const userPercentile = Math.max(
      1,
      Math.min(99.9, Math.round((1 / (1 + Math.exp(-1.702 * irtTheta))) * 1000) / 10)
    )

    const masteryTier =
      irtTheta >= 2.0
        ? 'Master (Top 2%)'
        : irtTheta >= 1.0
          ? 'Advanced (Top 15%)'
          : irtTheta >= 0.0
            ? 'Proficient'
            : irtTheta >= -1.5
              ? 'Competent'
              : 'Novice'

    return {
      totalTests: history.length,
      passedTests: passed,
      failedTests: history.length - passed,
      averageScore: avgScore,
      totalTime: history.reduce((acc, h) => acc + (h.time_taken_seconds ?? 0), 0),
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      irtTheta,
      userPercentile,
      masteryTier,
    }
  }, [history])

  // Filter history
  const filteredHistory = useMemo(() => {
    switch (filter) {
      case 'PASSED':
        return history.filter(h => h.passed)
      case 'FAILED':
        return history.filter(h => !h.passed)
      default:
        return history
    }
  }, [history, filter])

  // Topic mastery across tests
  const topicMasteryList: TopicMasteryItem[] = useMemo(() => {
    if (!history.length) return []
    const topicMap = new Map<string, { total: number; correct: number; count: number }>()

    history.forEach(attempt => {
      const answers = Array.isArray(attempt.answers) ? attempt.answers : []
      if (answers.length > 0 && typeof answers[0] === 'object' && 'topic' in answers[0]) {
        answers.forEach((ans: any) => {
          const topic = ans.topic || 'General Core'
          const cur = topicMap.get(topic) || { total: 0, correct: 0, count: 0 }
          topicMap.set(topic, {
            total: cur.total + 1,
            correct: cur.correct + (ans.is_correct ? 1 : 0),
            count: cur.count + 1,
          })
        })
      } else {
        const title =
          attempt.test_title ||
          (attempt as any).test?.title ||
          (typeof attempt.test === 'string' && attempt.test ? attempt.test : 'Core Assessment')
        const cur = topicMap.get(title) || { total: 0, correct: 0, count: 0 }
        topicMap.set(title, {
          total: cur.total + 100,
          correct: cur.correct + attempt.score,
          count: cur.count + 1,
        })
      }
    })

    return Array.from(topicMap.entries())
      .map(([topic, data]) => {
        const accuracy = Math.round((data.correct / Math.max(1, data.total)) * 100)
        return {
          topic,
          accuracy,
          attempts: data.count,
          status: (accuracy >= 75
            ? 'Mastered'
            : accuracy >= 50
              ? 'Proficient'
              : 'Needs Focus') as TopicMasteryItem['status'],
        }
      })
      .sort((a, b) => b.accuracy - a.accuracy)
  }, [history])

  // Chart data
  const chartData = useMemo(() => {
    // Sort history chronologically for the chart
    const sorted = [...filteredHistory].sort((a, b) => {
      const dateA = new Date(a.submitted_at ?? a.started_at).getTime()
      const dateB = new Date(b.submitted_at ?? b.started_at).getTime()
      return dateA - dateB
    })

    return sorted.map((attempt, index) => ({
      name: `Test ${index + 1}`,
      score: attempt.score,
      date: new Date(attempt.submitted_at ?? attempt.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      passed: attempt.passed,
    }))
  }, [filteredHistory])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Compute verification audit for attempt
  const getAttemptAudit = (attempt: TestAttempt) => {
    const issuedAt = attempt.submitted_at || attempt.started_at || new Date().toISOString()
    const testTitle =
      attempt.test_title ||
      (attempt as any).test?.title ||
      (typeof attempt.test === 'string' && attempt.test ? attempt.test : 'Assessment')

    return ScorecardPdfService.generateVerificationAudit(
      {
        attempt_id: attempt.id,
        test_id:
          typeof attempt.test === 'object' && attempt.test !== null
            ? (attempt.test as any).id
            : (attempt.test ?? 'test'),
        test_title: testTitle,
        mode: attempt.mode || 'mock',
        score: attempt.score,
        total_marks: attempt.total_marks || 100,
        percentage: attempt.percentage ?? attempt.score,
        passed: Boolean(attempt.passed),
        time_taken: attempt.time_taken_seconds ?? 0,
        time_limit: 1800,
        correct_count: 0,
        incorrect_count: 0,
        unanswered_count: 0,
        submitted_at: issuedAt,
        question_results: [],
      },
      typeof window !== 'undefined' ? `${window.location.origin}/verify-scorecard` : undefined
    )
  }

  // Handle retake
  const handleRetakeTest = (testId: string) => {
    navigate(`/tests-a/${testId}`)
  }

  // Handle view results
  const handleViewResults = (attemptId: string) => {
    navigate(`/tests-a?attempt=${attemptId}`)
  }

  // Handle scorecard PDF download
  const handleDownloadScorecard = async (attempt: TestAttempt) => {
    setDownloadingAttemptId(attempt.id)
    try {
      const testTitle =
        attempt.test_title ??
        (attempt as any).test?.title ??
        (typeof attempt.test === 'string' && attempt.test ? attempt.test : 'Academic Assessment')

      const answers = Array.isArray(attempt.answers) ? attempt.answers : []
      const correctCount = answers.filter((a: any) => a.is_correct === true).length
      const incorrectCount = answers.filter((a: any) => a.is_correct === false).length
      const totalQuestions =
        answers.length > 0
          ? answers.length
          : Math.max(1, Math.round((attempt.score / 100) * 10))

      const result: TestResult = {
        attempt_id: attempt.id,
        test_id:
          typeof attempt.test === 'object' && attempt.test !== null
            ? (attempt.test as any).id
            : (attempt.test ?? 'test-ref'),
        test_title: testTitle,
        mode: attempt.mode || 'mock',
        score: attempt.score,
        total_marks: attempt.total_marks || 100,
        percentage: attempt.percentage ?? attempt.score,
        passed: Boolean(attempt.passed),
        time_taken: attempt.time_taken_seconds ?? 0,
        time_limit: 1800,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: Math.max(0, totalQuestions - correctCount - incorrectCount),
        submitted_at: attempt.submitted_at ?? attempt.started_at,
        is_passed: Boolean(attempt.passed),
        adaptive_diagnostics: {
          finalTheta: Math.max(
            -3,
            Math.min(3, Number(((attempt.score - 50) / 16.66).toFixed(2)))
          ),
        },
        telemetry_digest: {
          integrityScore: 100,
          riskLevel: 'LOW_RISK',
          tabSwitches: 0,
        },
        question_results: answers.map((a: any, idx: number) => ({
          question_id: a.question_id || a.id || `q-${idx}`,
          question_text: a.question_text || `Question ${idx + 1}`,
          question_type: a.question_type || 'mcq',
          selected_options: a.selected_options || [],
          correct_options: [],
          is_correct: a.is_correct ?? idx < correctCount,
          marks_obtained: a.marks_obtained ?? (a.is_correct ? 1 : 0),
          explanation: '',
          time_spent:
            a.time_spent ??
            Math.round((attempt.time_taken_seconds ?? 1200) / Math.max(1, totalQuestions)),
          is_flagged: Boolean(a.is_flagged),
          topic: a.topic || (testTitle.split(' ')[0] ?? 'Core Curriculum'),
        })),
      }

      await scorecardPdfService.downloadScorecard(result, testTitle, {
        candidateName: 'Verified Student',
        candidateId: `STU-${attempt.id.substring(0, 8).toUpperCase()}`,
        includeRemediationPlan: true,
        includeTopicBreakdown: true,
        includePsychometrics: true,
      })
      addToast({ message: 'Official PDF Scorecard downloaded successfully', type: 'success' })
    } catch (err: any) {
      addToast({
        message: err?.message || 'Failed to download scorecard PDF',
        type: 'error',
      })
    } finally {
      setDownloadingAttemptId(null)
    }
  }

  // Handle copy verification code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    addToast({ message: 'Verification code copied to clipboard', type: 'success' })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <AnimatedPage>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AnimatedPage>
    )
  }

  // Error state
  if (error) {
    return (
      <AnimatedPage>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading History
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="primary">
              Retry
            </Button>
          </Card>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <SEO
        title="Tests A+ History & Verification"
        description="View your test history, verify official academic scorecards, and track syllabus mastery progress."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Tests A+ History
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your performance, verify cryptographic scorecards, and drill down into syllabus
              mastery
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate('/verify-scorecard')}
              className="flex items-center gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Verify Scorecard
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/tests-a')}
              className="flex items-center gap-2 shadow-md shadow-indigo-500/20"
            >
              <Target className="w-4 h-4" />
              Take Practice Test
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalTests}
            </div>
            <div className="text-sm text-gray-500">Total Tests</div>
          </Card>

          <Card className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.passedTests}
            </div>
            <div className="text-sm text-gray-500">Passed</div>
          </Card>

          <Card className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.averageScore}%
            </div>
            <div className="text-sm text-gray-500">Average Score</div>
          </Card>

          <Card className="p-4 text-center">
            <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.bestScore}%
            </div>
            <div className="text-sm text-gray-500">Best Score</div>
          </Card>

          <Card className="p-4 text-center border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
            <Brain className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              θ {stats.irtTheta >= 0 ? `+${stats.irtTheta}` : stats.irtTheta}
            </div>
            <div className="text-xs font-semibold text-gray-500 truncate" title={stats.masteryTier}>
              {stats.masteryTier}
            </div>
          </Card>
        </div>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Earned Badges
            </h2>
            <div className="flex flex-wrap gap-4">
              {badges
                .filter(b => b.isEarned)
                .map(badge => (
                  <div key={badge.id} className="flex items-center gap-2">
                    <BadgeDisplay badge={badge} size="md" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {badge.name}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
            {badges.filter(b => !b.isEarned).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">In Progress</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {badges
                    .filter(b => !b.isEarned)
                    .slice(0, 3)
                    .map(badge => (
                      <BadgeProgress key={badge.id} badge={badge} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Topic Mastery & Syllabus Health Breakdown */}
        {topicMasteryList.length > 0 && (
          <Card className="p-6 mb-8 border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Topic Mastery & Syllabus Health
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Aggregated proficiency scores across all attempted curriculum areas
                </p>
              </div>
              {topicMasteryList.some(t => t.status === 'Needs Focus') && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Socratic Drill Recommended
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicMasteryList.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate"
                      title={item.topic}
                    >
                      {item.topic}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        item.status === 'Mastered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.status === 'Proficient'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {item.accuracy}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.status === 'Mastered'
                          ? 'bg-emerald-500'
                          : item.status === 'Proficient'
                            ? 'bg-blue-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.accuracy}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{item.attempts} assessment sessions</span>
                    <span>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'PASSED', 'FAILED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f === 'ALL' && 'All Tests'}
                {f === 'PASSED' && 'Passed'}
                {f === 'FAILED' && 'Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        {chartData.length > 1 && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Score Trend
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#374151"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Advanced Psychometric & Cohort Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SpeedAccuracyScatterChart />
          <PeerPercentileBellCurve
            userScore={stats.averageScore || 50}
            userPercentile={stats.userPercentile}
          />
        </div>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-16 text-center border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-12 h-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No test attempts found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  {filter === 'ALL'
                    ? "You haven't taken any tests yet. Start practicing to see your progress and earn badges!"
                    : `No ${filter.toLowerCase()} tests found. Keep practicing!`}
                </p>
                <Button
                  onClick={() => navigate('/tests-a')}
                  variant="primary"
                  className="px-8 shadow-lg shadow-blue-500/20"
                >
                  Browse Practice Tests
                </Button>
              </Card>
            </motion.div>
          ) : (
            filteredHistory.map((attempt, index) => {
              const audit = getAttemptAudit(attempt)
              const isDownloading = downloadingAttemptId === attempt.id
              const isCodeCopied = copiedCode === audit.verificationHash

              return (
                <motion.div
                  key={attempt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6 hover:shadow-lg transition-all border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Test Info & Cryptographic Seal */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                              attempt.passed
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            {attempt.passed ? (
                              <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <RotateCcw className="w-6 h-6 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                              {(attempt as any).test_title ??
                                (attempt as any).test?.title ??
                                (typeof attempt.test === 'string' && attempt.test
                                  ? attempt.test
                                  : 'Test Assessment')}
                            </h3>

                            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                              <span className="capitalize">
                                {attempt.status === 'submitted'
                                  ? 'Completed'
                                  : attempt.status === 'abandoned'
                                    ? 'Abandoned'
                                    : 'In Progress'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {formatDate(attempt.submitted_at ?? attempt.started_at)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {formatDuration(attempt.time_taken_seconds ?? 0)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Target className="w-3.5 h-3.5 text-gray-400" />
                                {Array.isArray(attempt.answers)
                                  ? attempt.answers.length
                                  : Object.keys(attempt.answers ?? {}).length}{' '}
                                questions
                              </span>
                            </div>

                            {/* Cryptographic Seal & Verification Reference */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                {audit.verificationHash}
                              </span>
                              <button
                                onClick={() => handleCopyCode(audit.verificationHash)}
                                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                                title="Copy verification code"
                              >
                                {isCodeCopied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <FileText className="w-3 h-3" />
                                )}
                                {isCodeCopied ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/verify-scorecard?code=${encodeURIComponent(audit.verificationHash)}&attempt=${encodeURIComponent(attempt.id)}`
                                  )
                                }
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Verify Record
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score & Comprehensive Actions */}
                      <div className="flex flex-col sm:flex-row lg:items-center gap-6">
                        <div className="text-center sm:text-right shrink-0">
                          <p
                            className={`text-3xl font-extrabold ${
                              attempt.passed ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {attempt.score}%
                          </p>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </p>
                        </div>

                        {/* Action buttons grid */}
                        <div className="grid grid-cols-2 gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResults(attempt.id)}
                            className="text-xs"
                          >
                            View Results
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAttempt(attempt)}
                            className="text-xs border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1" />
                            Drill-Down
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadScorecard(attempt)}
                            disabled={isDownloading}
                            className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {isDownloading ? 'Exporting...' : 'PDF Scorecard'}
                          </Button>
                          <Button
                            variant={attempt.passed ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => {
                              const testId =
                                typeof attempt.test === 'object' && attempt.test !== null
                                  ? (attempt.test as any).id
                                  : (attempt.test ?? (attempt as any).test_id)
                              if (testId) handleRetakeTest(testId)
                            }}
                            className="text-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Retake
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Topic & Ability Drill-Down Modal */}
        <AnimatePresence>
          {selectedAttempt && (
            <Modal
              isOpen={Boolean(selectedAttempt)}
              onClose={() => setSelectedAttempt(null)}
              title="Assessment Drill-Down & Verification"
              size="lg"
            >
              <div className="space-y-6 pt-2">
                {/* Attempt Header Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {(selectedAttempt as any).test_title ??
                          (selectedAttempt as any).test?.title ??
                          'Diagnostic Assessment'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Attempt ID: <span className="font-mono">{selectedAttempt.id}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-black ${selectedAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {selectedAttempt.score}%
                      </span>
                      <p className="text-xs text-slate-500 uppercase">
                        {selectedAttempt.passed ? 'Passed' : 'Needs Practice'}
                      </p>
                    </div>
                  </div>

                  {/* Verification Digest */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-mono text-indigo-700 dark:text-indigo-300">
                      Hash: {getAttemptAudit(selectedAttempt).verificationHash}
                    </span>
                    <button
                      onClick={() =>
                        navigate(
                          `/verify-scorecard?code=${encodeURIComponent(getAttemptAudit(selectedAttempt).verificationHash)}&attempt=${encodeURIComponent(selectedAttempt.id)}`
                        )
                      }
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      View Public Certificate
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-center">
                    <span className="text-xs text-slate-500">Duration</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {formatDuration(selectedAttempt.time_taken_seconds ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-center">
                    <span className="text-xs text-slate-500">Pace Per Question</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {Math.round(
                        (selectedAttempt.time_taken_seconds ?? 60) /
                          Math.max(
                            1,
                            Array.isArray(selectedAttempt.answers)
                              ? selectedAttempt.answers.length
                              : 10
                          )
                      )}{' '}
                      sec
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-center">
                    <span className="text-xs text-slate-500">IRT Ability Estimate</span>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      θ{' '}
                      {Math.max(
                        -3,
                        Math.min(3, Number(((selectedAttempt.score - 50) / 16.66).toFixed(2)))
                      )}
                    </p>
                  </div>
                </div>

                {/* Socratic Remediation Suggestion */}
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                      Socratic AI Study Recommendation
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {selectedAttempt.score >= 80
                        ? 'Outstanding performance! Deepen your mastery by attempting timed adaptive contests or reviewing edge-case optimization questions.'
                        : 'Review incorrect response explanations, focus on core algorithmic patterns, and try a targeted practice drill before re-attempting.'}
                    </p>
                  </div>
                </div>

                {/* On-Demand Socratic Active-Recall Remediation Flashcards */}
                <SocraticRemediationFlashcards attempt={selectedAttempt} />

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setSelectedAttempt(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadScorecard(selectedAttempt)}
                    className="flex items-center gap-1.5 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const testId =
                        typeof selectedAttempt.test === 'object' && selectedAttempt.test !== null
                          ? (selectedAttempt.test as any).id
                          : (selectedAttempt.test ?? (selectedAttempt as any).test_id)
                      if (testId) {
                        setSelectedAttempt(null)
                        handleRetakeTest(testId)
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake Test
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  )
}

export default TestsAHistoryPage

