import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { testsAService, TestAttempt } from '../services/testsAService'
import { badgeService, Badge } from '../services/badgeService'
import { BadgeDisplay, BadgeProgress } from '../components/BadgeDisplay'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'

// Types
interface Stats {
  totalTests: number
  passedTests: number
  failedTests: number
  averageScore: number
  totalTime: number
  bestScore: number
}

const TestsAHistoryPage = () => {
  const navigate = useNavigate()
  const [history, setHistory] = useState<TestAttempt[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL')

  // Load test history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const [historyResponse, badgesResponse] = await Promise.all([
          testsAService.getMyResults(),
          badgeService.getUserBadges(),
        ])
        if (historyResponse.status === 'success') {
          setHistory(Array.isArray(historyResponse.data) ? historyResponse.data : [])
        }
        if (badgesResponse.status === 'success') {
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
      }
    }

    const passed = history.filter(h => h.passed).length
    const scores = history.map(h => h.score)

    return {
      totalTests: history.length,
      passedTests: passed,
      failedTests: history.length - passed,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / history.length),
      totalTime: history.reduce((acc, h) => acc + (h.time_taken_seconds ?? 0), 0),
      bestScore: Math.max(...scores),
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

  // Handle retake
  const handleRetakeTest = (testId: string) => {
    navigate(`/tests-a/${testId}`)
  }

  // Handle view results
  const handleViewResults = (attemptId: string) => {
    // Navigate to tests-a page which will show results if attempt is loaded
    navigate(`/tests-a?attempt=${attemptId}`)
  }

  // Loading state
  if (loading) {
    return (
      <AnimatedPage>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          {/* List Skeleton */}
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
      <SEO title="Tests A+ History" description="View your test history and track your progress" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tests A+ History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and review past test attempts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {(['ALL', 'PASSED', 'FAILED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
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

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card className="p-12 text-center">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No test attempts yet</h3>
              <p className="text-gray-500 mb-4">Start taking tests to see your history here</p>
              <Button onClick={() => navigate('/tests-a')}>Browse Tests</Button>
            </Card>
          ) : (
            filteredHistory.map((attempt, index) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Test Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
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
                        <div>
                          <h3 className="font-semibold text-lg">
                            {(attempt as TestAttempt & { test?: { title?: string } }).test?.title ??
                              'Test'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {attempt.status === 'submitted'
                              ? 'Completed'
                              : attempt.status === 'abandoned'
                                ? 'Abandoned'
                                : 'In Progress'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(attempt.submitted_at ?? attempt.started_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(attempt.time_taken_seconds ?? 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {Array.isArray(attempt.answers)
                                ? attempt.answers.length
                                : Object.keys(attempt.answers ?? {}).length}{' '}
                              questions
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p
                          className={`text-3xl font-bold ${
                            attempt.passed ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {attempt.score}%
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResults(attempt.id)}
                        >
                          View Results
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button
                          variant={attempt.passed ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleRetakeTest(attempt.test)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Retake
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AnimatedPage>
  )
}

export default TestsAHistoryPage
