import { useState, useEffect } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  Brain,
  Trophy,
  Clock,
  RotateCcw,
  ChevronRight,
  Calendar,
  Target,
  TrendingUp,
  Search,
  Award,
  AlertCircle,
} from 'lucide-react'
import { quizService, type QuizAttempt } from '../services/quizService'

interface QuizHistoryItem extends QuizAttempt {
  quiz_title: string
  course_title: string
  total_questions: number
}

export default function QuizHistoryPage() {
  useDocumentTitle('Quiz History')
  const navigate = useNavigate()

  const [history, setHistory] = useState<QuizHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate statistics
  const stats = {
    totalAttempts: history.length,
    passedCount: history.filter(h => h.passed).length,
    failedCount: history.filter(h => !h.passed).length,
    averageScore:
      history.length > 0
        ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / history.length)
        : 0,
    bestScore: history.length > 0 ? Math.max(...history.map(h => h.score)) : 0,
  }

  // Filter history
  const filteredHistory = history.filter(item => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'passed' && item.passed) ||
      (filter === 'failed' && !item.passed)

    const matchesSearch =
      searchQuery === '' ||
      item.quiz_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.course_title.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const loadQuizHistory = async (signal?: AbortSignal) => {
    const controller = new AbortController()
    const activeSignal = signal ?? controller.signal
    try {
      setIsLoading(true)
      setError(null)

      const res = await quizService.getAttempts(undefined, activeSignal)
      if (activeSignal.aborted) return
      const attempts = res.data ?? []

      if (attempts.length === 0) {
        setHistory([])
      } else {
        const historyItems: QuizHistoryItem[] = attempts.map(attempt => ({
          ...attempt,
          quiz_title: 'Unknown Quiz',
          course_title: 'Unknown Course',
          total_questions: attempt.answers?.length ?? 0,
        }))
        setHistory(historyItems)
      }
    } catch (err) {
      if (activeSignal.aborted) return
      setError('Failed to load quiz history')
      if (import.meta.env.DEV) {
        console.error('[QuizHistoryPage] loadQuizHistory error:', err)
      }
    } finally {
      if (!activeSignal.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadQuizHistory(controller.signal)
    return () => controller.abort()
  }, [])

  const handleRetakeQuiz = (quizId: string) => {
    navigate(`/quiz/${quizId}`)
  }

  const handleViewResults = (attemptId: string) => {
    navigate(`/quiz/results/${attemptId}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDuration = (startDate: string, endDate: string | null) => {
    if (!endDate) return 'In Progress'
    const duration = new Date(endDate).getTime() - new Date(startDate).getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full"
          />
          <p className="mt-4 text-gray-500">Loading quiz history...</p>
        </div>
      </AnimatedPage>
    )
  }

  if (error) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => loadQuizHistory()}>Try Again</Button>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="max-w-6xl mx-auto px-4 py-8">
      <SEO title="Quiz History" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quiz History</h1>
        <p className="text-gray-500">Track your progress and review past attempts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500">Total Attempts</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalAttempts}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500">Passed</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.passedCount}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500">Average Score</span>
          </div>
          <p className="text-2xl font-bold">{stats.averageScore}%</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500">Best Score</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.bestScore}%</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'passed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('passed')}
            >
              Passed
            </Button>
            <Button
              variant={filter === 'failed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('failed')}
            >
              Failed
            </Button>
          </div>
        </div>
      </Card>

      {/* Quiz History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <Card className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quiz attempts yet</h3>
            <p className="text-gray-500 mb-4">Start taking quizzes to see your history here</p>
            <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
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
                  {/* Quiz Info */}
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
                        <h3 className="font-semibold text-lg">{attempt.quiz_title}</h3>
                        <p className="text-sm text-gray-500">{attempt.course_title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(attempt.completed_at ?? attempt.started_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(attempt.started_at, attempt.completed_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {attempt.total_questions} questions
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
                        onClick={() => handleRetakeQuiz(attempt.test_id)}
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
    </AnimatedPage>
  )
}
