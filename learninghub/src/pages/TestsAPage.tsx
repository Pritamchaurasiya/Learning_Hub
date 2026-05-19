import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Timer,
  BookOpen,
  Target,
  RotateCcw,
  Filter,
  Search,
  BarChart3,
  Star,
} from 'lucide-react'
import { testsAService, TestA, TestQuestion, TestResult } from '../services/testsAService'
import { useStore } from '../stores/useStore'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ProgressBar } from '../components/ui/ProgressBar'

interface TestCardProps {
  test: TestA
  onStart: () => void
}

interface QuestionCardProps {
  question: TestQuestion
  currentIndex: number
  totalQuestions: number
  selectedAnswer: string | null
  isFlagged: boolean
  onAnswer: (optionId: string) => void
  onFlag: () => void
  onUnflag: () => void
}

interface ResultsViewProps {
  result: TestResult
  onRetry: () => void
  onBack: () => void
}

const TestCard = ({ test, onStart }: TestCardProps) => {
  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    mixed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    adaptive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  }

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <Badge className={difficultyColors[test.difficulty] ?? difficultyColors.mixed}>
              {test.difficulty}
            </Badge>
            <div className="flex items-center text-gray-500 text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {test.time_limit_minutes} min
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{test.title}</h3>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
            {test.description}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span className="flex items-center">
              <BookOpen className="w-4 h-4 mr-1" />
              {test.question_count} questions
            </span>
            <span className="flex items-center">
              <Target className="w-4 h-4 mr-1" />
              Pass: {test.passing_score}%
            </span>
          </div>

          <Button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2"
            variant="primary"
          >
            <Play className="w-4 h-4" />
            Start Test
          </Button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Mode</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {test.mode}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

const QuestionCard = ({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  isFlagged,
  onAnswer,
  onFlag,
  onUnflag,
}: QuestionCardProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <button
            onClick={isFlagged ? onUnflag : onFlag}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
              isFlagged
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Flag className="w-4 h-4" />
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% Complete
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{question.text}</h3>

        <div className="space-y-3">
          {question.options.map(option => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onAnswer(option.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedAnswer === option.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedAnswer === option.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selectedAnswer === option.id && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ResultsView = ({ result, onRetry, onBack }: ResultsViewProps) => {
  const percentage = result.percentage ?? 0
  const isPassed = result.passed ?? false
  const correctCount = result.correct_count ?? 0
  const incorrectCount = result.incorrect_count ?? 0
  const timeTaken = result.time_taken ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="text-center p-8">
        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 440} 440`}
              className={isPassed ? 'text-green-500' : 'text-red-500'}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(percentage)}%
            </span>
            <span className={`text-sm font-medium ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
              {isPassed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{correctCount}</div>
            <div className="text-sm text-gray-500">Correct</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{incorrectCount}</div>
            <div className="text-sm text-gray-500">Wrong</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <Timer className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.floor(timeTaken / 60)}:{String(timeTaken % 60).padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-500">Time Taken</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(result.score ?? 0)}
            </div>
            <div className="text-sm text-gray-500">Score</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onRetry}
            variant="primary"
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Test
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Back to Tests
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

const TestsAPage = () => {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const {
    testsA,
    startTestAttempt,
    answerQuestion,
    flagQuestion,
    unflagQuestion,
    navigateToQuestion,
    setTestQuestions,
    submitTest,
    resetTestState,
  } = useStore()

  const [tests, setTests] = useState<TestA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ mode: '', difficulty: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitAttempted = useRef(false)

  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoading(true)
        const response = await testsAService.getTests(filter)
        if (response.status === 'success') {
          setTests(response.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tests')
      } finally {
        setLoading(false)
      }
    }

    if (!testId && !testsA.isActive) {
      void loadTests()
    }
  }, [filter, testId, testsA.isActive])

  const handleStartTest = useCallback(
    async (test: TestA) => {
      try {
        setError(null)
        startTestAttempt(test.id, test.title, test.question_count, test.time_limit_minutes)

        const response = await testsAService.startTest(test.id)
        if (response.status === 'success') {
          const data = response.data
          setTestQuestions(
            (data.questions ?? []).map((q: any) => ({
              id: q.id,
              text: q.text ?? '',
              question_type: q.type ?? 'mcq',
              difficulty: q.difficulty ?? 0.5,
              bloom_level: q.bloom_level ?? 'understand',
              options: q.options ?? [],
              order: q.order ?? 0,
              marks: q.points ?? 1,
            })),
            {
              testId: test.id,
              testTitle: test.title,
              totalQuestions: data.questions?.length ?? 0,
              timeLimit: data.time_limit ?? test.time_limit_minutes,
            },
            data.attempt_id
          )
          navigate(`/tests-a/${test.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
        resetTestState()
      }
    },
    [startTestAttempt, setTestQuestions, navigate, resetTestState]
  )

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || submitAttempted.current) return
    submitAttempted.current = true
    setIsSubmitting(true)

    try {
      const result = await submitTest()
      if (!result.success) {
        setError('Failed to submit test. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test')
    } finally {
      setIsSubmitting(false)
    }
  }, [submitTest, isSubmitting])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined

    if (testsA.isActive && testsA.timeRemaining > 0 && !testsA.isSubmitting) {
      interval = setInterval(() => {
        useStore.setState(state => {
          const newTime = state.testsA.timeRemaining - 1
          if (newTime <= 0) {
            clearInterval(interval!)
            return { testsA: { ...state.testsA, timeRemaining: 0 } }
          }
          return { testsA: { ...state.testsA, timeRemaining: newTime } }
        })
      }, 1000)
    }

    if (
      testsA.isActive &&
      testsA.timeRemaining === 0 &&
      !testsA.isSubmitting &&
      !submitAttempted.current
    ) {
      submitAttempted.current = true
      void handleSubmit()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [testsA.isActive, testsA.timeRemaining, testsA.isSubmitting, handleSubmit])

  const filteredTests = useMemo(
    () =>
      tests.filter(
        test =>
          (filter.mode === '' || test.mode === filter.mode) &&
          (filter.difficulty === '' || test.difficulty === filter.difficulty) &&
          (searchQuery === '' ||
            test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            test.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [tests, searchQuery, filter]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !testsA.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Tests
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                window.location.reload()
              }}
              variant="primary"
            >
              Retry
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (testsA.isActive && testsA.questions.length > 0) {
    const currentQuestion = testsA.questions[testsA.currentQuestionIndex]
    const selectedAnswer = testsA.answers[currentQuestion?.id] ?? null
    const isFlagged = testsA.flaggedQuestions.includes(currentQuestion?.id)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SEO title={`Tests A+ - ${testsA.testInfo?.testTitle ?? 'Test'}`} />

        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {testsA.testInfo?.testTitle}
              </h1>
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    testsA.timeRemaining < 300
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span className="font-mono font-medium">
                    {Math.floor(testsA.timeRemaining / 60)}:
                    {String(testsA.timeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
                <Button onClick={handleSubmit} variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar
                progress={((testsA.currentQuestionIndex + 1) / testsA.questions.length) * 100}
                className="h-2"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2">
            {testsA.questions.map((q, index) => {
              const isAnswered = testsA.answers[q.id] !== undefined
              const isCurrentFlagged = testsA.flaggedQuestions.includes(q.id)
              return (
                <button
                  key={q.id}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                    index === testsA.currentQuestionIndex
                      ? 'bg-blue-500 text-white'
                      : isAnswered
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : isCurrentFlagged
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={testsA.currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionCard
                question={currentQuestion}
                currentIndex={testsA.currentQuestionIndex}
                totalQuestions={testsA.questions.length}
                selectedAnswer={selectedAnswer}
                isFlagged={isFlagged}
                onAnswer={optionId => answerQuestion(currentQuestion.id, optionId)}
                onFlag={() => flagQuestion(currentQuestion.id)}
                onUnflag={() => unflagQuestion(currentQuestion.id)}
              />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8">
            <Button
              onClick={() => navigateToQuestion(testsA.currentQuestionIndex - 1)}
              disabled={testsA.currentQuestionIndex === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              onClick={() => navigateToQuestion(testsA.currentQuestionIndex + 1)}
              disabled={testsA.currentQuestionIndex === testsA.questions.length - 1}
              variant="outline"
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (testsA.results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <SEO title="Tests A+ - Results" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ResultsView
            result={testsA.results}
            onRetry={() => {
              resetTestState()
              submitAttempted.current = false
              if (testsA.testInfo) {
                const test = tests.find(t => t.id === testsA.testInfo?.testId)
                if (test) void handleStartTest(test)
              }
            }}
            onBack={() => {
              resetTestState()
              submitAttempted.current = false
              navigate('/tests-a')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <SEO title="Tests A+" description="Take practice tests and improve your skills" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tests A+</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Practice with our comprehensive test collection and track your progress
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filter.mode}
              onChange={e => setFilter({ ...filter, mode: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Modes</option>
              <option value="practice">Practice</option>
              <option value="mock">Mock</option>
              <option value="timed_challenge">Timed Challenge</option>
            </select>

            <select
              value={filter.difficulty}
              onChange={e => setFilter({ ...filter, difficulty: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {filteredTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map(test => (
              <TestCard key={test.id} test={test} onStart={() => handleStartTest(test)} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tests found
            </h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TestsAPage
