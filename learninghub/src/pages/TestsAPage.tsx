import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
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
  Sparkles,
  BrainCircuit,
} from 'lucide-react'
import { testsAService, TestA, TestQuestion, TestResult } from '../services/testsAService'
import { useStore } from '../stores/useStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ProgressBar } from '../components/ui/ProgressBar'
import { AITestGeneratorModal } from '../components/AITestGeneratorModal'

interface TestCardProps {
  test: TestA
  onStart: () => void
}

interface QuestionCardProps {
  question: TestQuestion
  currentIndex: number
  totalQuestions: number
  selectedAnswer: string | string[] | null
  isFlagged: boolean
  onAnswer: (optionId: string) => void
  onConfidenceChange: (confidence: string) => void
  confidence: string | undefined
  onFlag: () => void
  onUnflag: () => void
}

interface ResultsViewProps {
  result: TestResult
  onRetry: () => void
  onBack: () => void
}

const TestCard = memo(({ test, onStart }: TestCardProps) => {
  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    mixed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    adaptive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  }

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 backdrop-blur-xl group">
        <div className="p-6 flex-1 flex flex-col relative z-10">
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
})

const QuestionCard = memo(
  ({
    question,
    currentIndex,
    totalQuestions,
    selectedAnswer,
    confidence,
    isFlagged,
    onAnswer,
    onConfidenceChange,
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

        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-8 shadow-md border border-gray-100 dark:border-gray-800 backdrop-blur-xl">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-8 leading-relaxed">
            {question.text}
          </h3>

          <div className="space-y-3">
            {question.question_type === 'subjective' || question.type === 'subjective' ? (
              <textarea
                value={selectedAnswer ?? ''}
                onChange={e => onAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                className="w-full min-h-[200px] p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y"
              />
            ) : (
              question.options.map(option => (
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
                      {selectedAnswer === option.id && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Confidence Meter */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How confident are you in this answer?
            </h4>
            <div className="flex gap-3">
              {[
                {
                  level: 'LOW',
                  label: 'Low',
                  color:
                    'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
                  activeColor:
                    'bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'MEDIUM',
                  label: 'Medium',
                  color:
                    'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
                  activeColor:
                    'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'HIGH',
                  label: 'High',
                  color:
                    'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
                  activeColor:
                    'bg-green-500 text-white dark:bg-green-600 dark:text-white ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
                },
              ].map(({ level, label, color, activeColor }) => (
                <button
                  key={level}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => onConfidenceChange(level as any)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    confidence === level ? activeColor : color
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

const ResultsView = memo(({ result, onRetry, onBack }: ResultsViewProps) => {
  const percentage = result.percentage ?? 0
  const isPassed = result.passed ?? false
  const correctCount = result.correct_count ?? 0
  const incorrectCount = result.incorrect_count ?? 0
  const timeTaken = result.time_taken ?? 0
  const isMock = result.is_mock ?? false

  // Calculate topic-wise breakdown
  const topicBreakdown = useMemo(() => {
    if (!result.question_results) return []

    const topics = new Map<string, { total: number; correct: number }>()

    result.question_results.forEach(q => {
      const topic = q.topic ?? 'General'
      const current = topics.get(topic) ?? { total: 0, correct: 0 }
      topics.set(topic, {
        total: current.total + 1,
        correct: current.correct + (q.is_correct ? 1 : 0),
      })
    })

    return Array.from(topics.entries())
      .map(([topic, data]) => ({
        topic,
        total: data.total,
        correct: data.correct,
        percentage: Math.round((data.correct / data.total) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage) // Sort by performance
  }, [result.question_results])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Mock Test Indicator */}
      {isMock && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              <strong>Mock Test:</strong> This test was generated using fallback questions because the AI service was unavailable. 
              Scores and analytics may not reflect actual performance.
            </span>
          </div>
        </div>
      )}

      {/* Top Results Card */}
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

      {/* Topic-wise Breakdown */}
      {topicBreakdown.length > 0 && (
        <Card className="p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Topic Performance
          </h3>
          <div className="space-y-4">
            {topicBreakdown.map(topic => (
              <div key={topic.topic} className="flex items-center gap-4">
                <div className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {topic.topic}
                </div>
                <div className="w-2/3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {topic.correct} / {topic.total} correct
                    </span>
                    <span>{topic.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        topic.percentage >= 80
                          ? 'bg-green-500'
                          : topic.percentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Review Section */}
      {result.question_results && result.question_results.length > 0 && (
        <Card className="p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Detailed Review</h3>
          <div className="space-y-8">
            {result.question_results.map((q, idx) => (
              <div
                key={q.question_id || idx}
                className="border-b border-gray-100 dark:border-gray-800 pb-8 last:border-0"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {idx + 1}
                    </span>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white flex-1">
                      {q.question_text}
                    </h4>
                  </div>
                  <Badge
                    className={
                      q.is_correct === null
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : q.is_correct
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }
                  >
                    {q.is_correct === null ? 'Grading...' : q.is_correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>

                <div className="pl-11 space-y-4">
                  {/* Options */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="mt-0.5">
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                          Your Answer:
                        </span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        {q.question_type === 'subjective'
                          ? (q.text_answer ?? 'No answer provided')
                          : q.selected_options?.[0]?.text || 'No answer'}
                      </div>
                    </div>

                    {!q.is_correct && q.question_type !== 'subjective' && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 flex items-start gap-3">
                        <div className="mt-0.5">
                          <span className="text-sm font-medium text-green-600 dark:text-green-500">
                            Correct Answer:
                          </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                          {q.correct_options?.[0]?.text || 'Not available'}
                        </div>
                      </div>
                    )}

                    {q.question_type === 'subjective' && q.ai_feedback && (
                      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/30 flex flex-col gap-2 mt-4">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                            AI Feedback (Score: {q.marks_obtained}/
                            {
                              q.marks_obtained
                                ? q.marks_obtained * 2
                                : 0 /* approximate total based on passing logic */
                            }
                            )
                          </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                          {q.ai_feedback}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confidence */}
                  {q.confidence && (
                    <div className="flex items-center gap-2 text-sm mt-4">
                      <span className="text-gray-500">Confidence level:</span>
                      <Badge
                        className={
                          q.confidence === 'HIGH'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : q.confidence === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }
                      >
                        {q.confidence}
                      </Badge>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm">
                      <span className="font-semibold block mb-1">Explanation:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  )
})

const TestsAPage = memo(() => {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const test = useStore(state => state.test)
  const startTest = useStore(state => state.startTest)
  const answerQuestion = useStore(state => state.answerQuestion)
  const setConfidence = useStore(state => state.setConfidence)
  const flagQuestion = useStore(state => state.flagQuestion)
  const unflagQuestion = useStore(state => state.unflagQuestion)
  const navigateToQuestion = useStore(state => state.navigateToQuestion)
  const setTestQuestions = useStore(state => state.setTestQuestions)
  const submitTest = useStore(state => state.submitTest)
  const resetTestState = useStore(state => state.resetTestState)
  const updateSubjectiveGrade = useStore(state => state.updateSubjectiveGrade)

  const [tests, setTests] = useState<TestA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ mode: '', difficulty: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAccess, setHasAccess] = useState(true)

  const submitAttempted = useRef(false)
  const addToast = useStore(state => state.addToast)

  const { on } = useWebSocket()

  // Listen for real-time grading updates from the backend
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = on('subjective_grade_completed', (data: any) => {
      // Only process if it matches the current active result
      if (test.results && test.results.attempt_id === data.testResultId) {
        updateSubjectiveGrade(data)
        addToast({
          message: 'AI grading completed for subjective answer!',
          type: 'success',
        })
      }
    })
    return unsubscribe
  }, [on, test.results, updateSubjectiveGrade, addToast])

  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  useEffect(() => {
    const loadAccessAndTests = async () => {
      try {
        setLoading(true)
        setHasAccess(true)
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

    if (!testId && !test.isActive) {
      void loadAccessAndTests()
    } else {
      setHasAccess(true)
    }
  }, [filter, testId, test.isActive])

  // Recover missing questions for active tests (e.g. after page reload)
  useEffect(() => {
    const recoverTestQuestions = async () => {
      if (test.isActive && test.testInfo?.testId && test.questions.length === 0) {
        setLoading(true)
        try {
          // startTest on the backend automatically resumes if IN_PROGRESS
          const response = await testsAService.startTest(test.testInfo.testId)
          if (response.status === 'success' && response.data.questions) {
            setTestQuestions(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              response.data.questions.map((q: any) => ({
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
                testId: test.testInfo.testId,
                testTitle: test.testInfo.testTitle,
                totalQuestions: test.testInfo.totalQuestions,
                timeLimit: response.data.time_limit ?? test.testInfo.timeLimit,
              },
              response.data.attempt_id ?? test.attempt?.attemptId ?? '',
              response.data.answers ?? {},
              response.data.time_remaining_seconds
            )
          } else {
            setError('Failed to recover test attempt.')
            resetTestState()
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to recover test')
          resetTestState()
        } finally {
          setLoading(false)
        }
      }
    }

    void recoverTestQuestions()
  }, [
    test.isActive,
    test.testInfo?.testId,
    test.testInfo?.testTitle,
    test.testInfo?.totalQuestions,
    test.testInfo?.timeLimit,
    test.attempt?.attemptId,
    test.questions.length,
    setTestQuestions,
    resetTestState,
  ])

  const handleStartTest = useCallback(
    async (testItem: TestA) => {
      if (!hasAccess) {
        addToast({
          message:
            'This is a premium feature. Please upgrade your subscription to unlock Tests A+.',
          type: 'error',
        })
        navigate('/pricing')
        return
      }

      try {
        setError(null)
        startTest(
          'tests-a',
          testItem.id,
          testItem.title,
          testItem.question_count,
          testItem.time_limit_minutes
        )

        const response = await testsAService.startTest(testItem.id)
        if (response.status === 'success') {
          const data = response.data
          setTestQuestions(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              testId: testItem.id,
              testTitle: testItem.title,
              totalQuestions: data.questions?.length ?? 0,
              timeLimit: data.time_limit ?? testItem.time_limit_minutes,
            },
            data.attempt_id ?? ''
          )
          navigate(`/tests-a/${testItem.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
        resetTestState()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startTest, setTestQuestions, navigate, resetTestState]
  )

  const handleTestGenerated = useCallback(
    (testData: {
      questions: any[]
      testId: string
      testTitle: string
      totalQuestions: number
      timeLimit: number
      attemptId: string
    }) => {
      startTest(
        'tests-a',
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
      setIsAIModalOpen(false)
      navigate(`/tests-a/${testData.testId}`)
    },
    [startTest, setTestQuestions, navigate]
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

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>()
  const isActiveRef = useRef(test.isActive)
  const isSubmittingRef = useRef(test.isSubmitting)

  isActiveRef.current = test.isActive
  isSubmittingRef.current = test.isSubmitting

  useEffect(() => {
    if (!test.isActive || test.isSubmitting) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
      return
    }

    if (timerRef.current) return

    timerRef.current = setInterval(() => {
      useStore.setState(state => {
        if (state.test.timeRemaining > 1) {
          return {
            test: { ...state.test, timeRemaining: state.test.timeRemaining - 1 },
          }
        }
        return { test: { ...state.test, timeRemaining: 0 } }
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [test.isActive, test.isSubmitting])

  // Periodic autosave every 30 seconds during active test
  useEffect(() => {
    if (!test.isActive || test.isSubmitting || !test.attempt?.attemptId) {
      return
    }

    const autosaveInterval = setInterval(async () => {
      try {
        const answers = test.answers || {}
        if (test.testInfo?.testId) {
          await testsAService.batchAutosave(
            test.testInfo.testId,
            answers,
            test.attempt?.attemptId || undefined
          )
          useStore.setState(state => ({
            test: { ...state.test, lastAutosavedAt: new Date().toISOString() },
          }))
        }
      } catch (err) {
        console.warn('[TestsAPage] Autosave failed:', err)
      }
    }, 30000)

    return () => clearInterval(autosaveInterval)
  }, [
    test.isActive,
    test.isSubmitting,
    test.attempt?.attemptId,
    test.testInfo?.testId,
    test.answers,
  ])

  useEffect(() => {
    if (
      test.timeRemaining === 0 &&
      test.isActive &&
      !test.isSubmitting &&
      !submitAttempted.current
    ) {
      submitAttempted.current = true
      void handleSubmit()
    }
  }, [test.timeRemaining, test.isActive, test.isSubmitting, handleSubmit])

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

  if (error && !test.isActive && tests.length === 0) {
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

  if (test.isActive && test.questions.length > 0) {
    const currentQuestion = test.questions[test.currentQuestionIndex]
    const selectedAnswer = test.answers[currentQuestion?.id] ?? null
    const isFlagged = test.flaggedQuestions.includes(currentQuestion?.id)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SEO title={`Tests A+ - ${test.testInfo?.testTitle ?? 'Test'}`} />

        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {test.testInfo?.testTitle}
              </h1>
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    test.timeRemaining < 300
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span className="font-mono font-medium">
                    {Math.floor(test.timeRemaining / 60)}:
                    {String(test.timeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
                {test.lastAutosavedAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Saved {new Date(test.lastAutosavedAt).toLocaleTimeString()}
                  </div>
                )}
                <Button onClick={handleSubmit} variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar
                progress={((test.currentQuestionIndex + 1) / test.questions.length) * 100}
                className="h-2"
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-nowrap gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2 md:flex-wrap md:overflow-x-visible">
            {test.questions.map((q, index) => {
              const isAnswered = test.answers[q.id] !== undefined
              const isCurrentFlagged = test.flaggedQuestions.includes(q.id)
              return (
                <button
                  key={q.id}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                    index === test.currentQuestionIndex
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
              key={test.currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionCard
                question={currentQuestion}
                currentIndex={test.currentQuestionIndex}
                totalQuestions={test.questions.length}
                selectedAnswer={selectedAnswer}
                confidence={test.confidences[currentQuestion.id]}
                isFlagged={isFlagged}
                onAnswer={optionId => answerQuestion(currentQuestion.id, optionId)}
                onConfidenceChange={level => setConfidence(currentQuestion.id, level)}
                onFlag={() => flagQuestion(currentQuestion.id)}
                onUnflag={() => unflagQuestion(currentQuestion.id)}
              />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8">
            <Button
              onClick={() => navigateToQuestion(test.currentQuestionIndex - 1)}
              disabled={test.currentQuestionIndex === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Question
            </Button>
            <Button
              onClick={() => navigateToQuestion(test.currentQuestionIndex + 1)}
              disabled={test.currentQuestionIndex === test.questions.length - 1}
              variant="outline"
              className="flex items-center gap-2"
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (test.results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <SEO title="Tests A+ - Results" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ResultsView
            result={test.results}
            onRetry={() => {
              resetTestState()
              submitAttempted.current = false
              if (test.testInfo) {
                const testItem = tests.find(t => t.id === test.testInfo?.testId)
                if (testItem) void handleStartTest(testItem)
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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tests A+</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Practice with our comprehensive test collection and track your progress
            </p>
          </div>
          <Button
            onClick={() => setIsAIModalOpen(true)}
            variant="primary"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25"
          >
            <Sparkles className="w-5 h-5" />
            AI Custom Mock
          </Button>
        </div>

        {hasAccess === false && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 dark:border-primary-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary-500 fill-current" /> Unlock Tests A+ Elite
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You need a premium subscription to start taking mock tests and access deep
                analytics.
              </p>
            </div>
            <Button
              onClick={() => navigate('/pricing')}
              className="shrink-0 shadow-lg shadow-primary-500/20"
            >
              View Plans
            </Button>
          </motion.div>
        )}

        {error && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

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
              aria-label="Filter by mode"
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
              aria-label="Filter by difficulty"
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

      <AITestGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onTestGenerated={handleTestGenerated}
        hasAccess={hasAccess}
      />
    </div>
  )
})

export default TestsAPage
