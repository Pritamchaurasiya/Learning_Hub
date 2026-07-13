import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import ProgressRing from '../components/ui/ProgressRing'
import { Skeleton } from '../components/ui/Skeleton'
import {
  Brain,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Timer,
  Info,
  Flag,
  Search,
  BookOpen,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { quizService, type Quiz, type QuizQuestion, type QuizResult } from '../services/quizService'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useDebounce } from '../hooks/useDebounce'

function QuizPage() {
  useDocumentTitle('Quiz Session')
  const navigate = useNavigate()
  const { quizId } = useParams<{ quizId: string }>()
  const addToast = useStore(state => state.addToast)

  // Local state for active quiz session
  const [quizInfo, setQuizInfo] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const hasSubmittedRef = useRef(false)

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch available quizzes (only active if no quizId is in URL)
  const { data: availableQuizzes = [], isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const res = await quizService.listQuizzes()
      return res.data || []
    },
    enabled: !quizId,
    staleTime: 5 * 60 * 1000,
  })

  // Global Quiz State (persists during active session)

  const flaggedQuestions = useStore(state => state.quiz.flaggedQuestions)
  const flagQuestion = useStore(state => state.flagQuestion)
  const unflagQuestion = useStore(state => state.unflagQuestion)
  const quiz = useStore(state => state.quiz)
  const answerQuestion = useStore(state => state.answerQuestion)
  const navigateToQuestion = useStore(state => state.navigateToQuestion)
  const updateQuizTimer = useStore(state => state.updateQuizTimer)
  const clearQuiz = useStore(state => state.clearQuiz)

  const { answers, timeRemaining, currentQuestionIndex } = quiz

  const loadActiveQuiz = useCallback(async () => {
    if (!quizId) return
    try {
      setIsLoadingSession(true)
      setSessionError(null)
      const res = await quizService.startAttempt(quizId)
      const sessionData = res.data
      const infoRes = await quizService.getQuiz(quizId)
      setQuizInfo(infoRes.data.quiz)
      setQuestions(sessionData.questions)
      setAttemptId(sessionData.attempt_id)

      if (quiz.timeRemaining === 0 && quiz.currentAttempt?.quizId !== quizId) {
        updateQuizTimer(infoRes.data.quiz.time_limit * 60)
      }
    } catch (err) {
      setSessionError(
        err instanceof Error ? err.message : 'System unavailable. Could not generate quiz session.'
      )
      if (import.meta.env.DEV) console.error('[QuizPage] Failed to load quiz:', err)
    } finally {
      setIsLoadingSession(false)
    }
  }, [quizId, quiz.timeRemaining, quiz.currentAttempt?.quizId, updateQuizTimer])

  useEffect(() => {
    if (quizId) void loadActiveQuiz()
  }, [quizId, loadActiveQuiz])

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!quizInfo || !attemptId || !quizId) throw new Error('Missing session info')
      const timeTaken = Math.max(0, (quizInfo.time_limit ?? 0) * 60 - timeRemaining)
      return quizService.submitQuiz(quizId, attemptId, answers as Record<string, string>, timeTaken)
    },
    onSuccess: response => {
      setResult(response.data)
      addToast({ message: 'Session evaluation complete.', type: 'success' })
    },
    onError: err => {
      setSessionError(err instanceof Error ? err.message : 'Failed to submit session.')
      hasSubmittedRef.current = false
      if (import.meta.env.DEV) console.error('[QuizPage] Submission failed:', err)
    },
  })

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirmDialog(false)
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    submitMutation.mutate()
  }, [submitMutation])

  // Timer effect - stable interval using ref + getState()
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>()

  const timerCallback = useCallback(() => {
    useStore.setState(state => {
      if (state.quiz.timeRemaining > 0) {
        return { quiz: { ...state.quiz, timeRemaining: state.quiz.timeRemaining - 1 } }
      }
      return state
    })
  }, [])

  const isTimeUp = timeRemaining <= 0
  useEffect(() => {
    if (!quizInfo || result || isTimeUp) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
      return
    }

    timerRef.current = setInterval(timerCallback, 1000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [quizInfo, result, isTimeUp, timerCallback])

  useEffect(() => {
    if (
      timeRemaining === 0 &&
      quizInfo &&
      !result &&
      !submitMutation.isPending &&
      !hasSubmittedRef.current
    ) {
      hasSubmittedRef.current = true
      handleConfirmSubmit()
    }
  }, [timeRemaining, quizInfo, result, submitMutation.isPending, handleConfirmSubmit])

  // Auto-submit on timer hit zero
  useEffect(() => {
    if (
      timeRemaining === 0 &&
      quizInfo &&
      attemptId &&
      !result &&
      !submitMutation.isPending &&
      !hasSubmittedRef.current
    ) {
      hasSubmittedRef.current = true
      handleConfirmSubmit()
    }
  }, [timeRemaining, quizInfo, attemptId, result, submitMutation.isPending, handleConfirmSubmit])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleRetry = useCallback(() => {
    hasSubmittedRef.current = false
    navigateToQuestion(0)
    clearQuiz()
    setResult(null)
    if (quizId) void loadActiveQuiz()
  }, [quizId, loadActiveQuiz, navigateToQuestion, clearQuiz])

  const filteredQuizzes = useMemo(() => {
    return availableQuizzes.filter(q =>
      q.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [availableQuizzes, debouncedSearch])

  const quizProgress = useMemo(() => {
    if (questions.length === 0) return 0
    return ((currentQuestionIndex + 1) / questions.length) * 100
  }, [questions.length, currentQuestionIndex])

  // ================= VIEW: QUIZ LISTING ================= //
  if (!quizId) {
    return (
      <AnimatedPage className="max-w-7xl mx-auto px-4 pb-12 pt-4 space-y-10">
        <SEO title="Assessment Hub" />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white p-8 md:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Brain className="w-64 h-64 rotate-12 text-primary-500" />
          </div>

          <div className="relative z-10 space-y-6 flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest border border-primary-500/30">
              <Trophy className="w-4 h-4" /> Certification Track
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Knowledge Assessments
            </h1>
            <p className="text-gray-400 max-w-xl font-medium text-lg leading-relaxed">
              Validate your engineering expertise with our rigorous, timed examination modules.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-96 shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium outline-none backdrop-blur-md"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingQuizzes && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card
                key={i}
                className="p-8 rounded-[2.5rem] border-none shadow-md bg-white dark:bg-gray-900 h-64"
              >
                <div className="flex gap-4 mb-6">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <div className="flex justify-between mt-auto">
                  <Skeleton className="h-10 w-1/3 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingQuizzes && filteredQuizzes.length === 0 && (
          <Card className="p-20 text-center border-none shadow-inner rounded-[3rem] bg-gray-50 dark:bg-gray-900 max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">
              No Modules Located
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Recalibrate your search parameters.
            </p>
          </Card>
        )}

        {/* Quiz Grid */}
        {!isLoadingQuizzes && filteredQuizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card
                  data-testid="quiz-card"
                  className="p-8 h-full border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] relative overflow-hidden flex flex-col bg-white dark:bg-gray-900 group cursor-pointer"
                  onClick={() => navigate(`/quiz/${q.id}`)}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                    <Brain className="w-32 h-32" />
                  </div>

                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Brain className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="pt-1">
                      <div className="inline-block px-3 py-1 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500">
                        {q.course_title}
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-2">
                        {q.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 line-clamp-2 leading-relaxed flex-1">
                    {q.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-auto mb-6">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center text-center">
                      <Timer className="w-5 h-5 text-indigo-500 mb-2" />
                      <p className="font-black tabular-nums text-gray-900 dark:text-white">
                        {q.time_limit}m
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Duration
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center text-center">
                      <Trophy className="w-5 h-5 text-amber-500 mb-2" />
                      <p className="font-black tabular-nums text-gray-900 dark:text-white">
                        {q.passing_score}%
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Pass Req
                      </span>
                    </div>
                  </div>

                  <Button className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
                    Initialize Module
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatedPage>
    )
  }

  // ================= VIEW: ACTIVE SESSION LOADING ================= //
  if (isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-[2rem] flex items-center justify-center shadow-inner"
        >
          <Brain className="w-12 h-12 text-primary-500" />
        </motion.div>
        <p className="font-black text-primary-500 tracking-[0.2em] uppercase text-[10px] animate-pulse">
          Synchronizing Neural Matrix...
        </p>
      </div>
    )
  }

  // ================= VIEW: SESSION ERROR ================= //
  if (sessionError) {
    return (
      <AnimatedPage className="pt-20">
        <Card className="max-w-md mx-auto p-12 text-center border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-900">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black mb-3 tracking-tight text-gray-900 dark:text-white uppercase">
            Critical Error
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {sessionError}
          </p>
          <Button
            onClick={() => navigate('/quiz')}
            className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            Abort Sequence
          </Button>
        </Card>
      </AnimatedPage>
    )
  }

  if (!quizInfo || questions.length === 0) return null

  // ================= VIEW: SESSION RESULTS ================= //
  if (result) {
    return (
      <AnimatedPage className="max-w-4xl mx-auto px-4 pb-12 pt-4">
        <SEO title="Session Results" />
        <Card className="p-8 md:p-14 text-center mb-10 border-none shadow-2xl rounded-[3rem] relative overflow-hidden bg-white dark:bg-gray-900">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Trophy className="w-64 h-64" />
          </div>

          <div className="relative mb-12 flex flex-col items-center">
            <div className="relative drop-shadow-xl">
              <ProgressRing
                progress={result.percentage ?? result.score}
                size={200}
                strokeWidth={16}
                className={result.passed ? 'text-emerald-500' : 'text-amber-500'}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-5xl font-black tabular-nums tracking-tighter ${result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                >
                  {result.percentage ?? result.score}%
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">
                  Mastery
                </span>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className={`absolute -bottom-6 px-8 py-3 rounded-2xl shadow-xl border-2 flex items-center gap-3 backdrop-blur-md ${result.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-300' : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-300'}`}
            >
              <Trophy className="w-5 h-5 fill-current" />
              <span className="text-sm font-black uppercase tracking-widest">
                {result.passed ? 'Certification Achieved' : 'Recalibration Required'}
              </span>
            </motion.div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-gray-900 dark:text-white uppercase">
            Evaluation Complete
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-12 font-medium max-w-lg mx-auto text-lg">
            {result.passed
              ? 'Your neural patterns align with the highest engineering standards.'
              : 'Review the failing logic gates and re-attempt the module.'}
          </p>

          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-12">
            {[
              {
                label: 'Score',
                value: `${result.percentage ?? result.score}%`,
                color: 'text-primary-600 dark:text-primary-400',
                bg: 'bg-primary-50 dark:bg-primary-900/10',
              },
              {
                label: 'Accuracy',
                value: `${result.correct_answers}/${result.total_questions}`,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-900/10',
              },
              {
                label: 'Time',
                value: `${Math.floor(result.time_taken / 60)}m ${result.time_taken % 60}s`,
                color: 'text-indigo-600 dark:text-indigo-400',
                bg: 'bg-indigo-50 dark:bg-indigo-900/10',
              },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} p-6 md:p-8 rounded-[2rem]`}>
                <p
                  className={`text-2xl md:text-4xl font-black ${stat.color} mb-2 tracking-tighter tabular-nums`}
                >
                  {stat.value}
                </p>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 flex-col sm:flex-row justify-center max-w-2xl mx-auto">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Re-initialize
            </Button>
            <Button
              onClick={() => navigate('/quiz')}
              className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary-500/20"
            >
              Module Selection <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>

        {/* Detailed Review */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="w-12 h-12 bg-gray-900 dark:bg-white rounded-[1.25rem] flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Telemetry Log
            </h2>
          </div>

          {questions.map((q, index) => {
            const userAnswer = answers[q.id]
            const isCorrect = userAnswer === q.correct_answer
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`p-6 sm:p-8 rounded-[2.5rem] border-2 shadow-sm ${isCorrect ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-rose-100 dark:border-rose-900/30'} bg-white dark:bg-gray-900`}
                >
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}
                    >
                      {isCorrect ? (
                        <CheckCircle className="w-7 h-7" />
                      ) : (
                        <XCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-6">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg">
                            Node {index + 1}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isCorrect ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20'}`}
                          >
                            {isCorrect ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <p className="font-bold text-xl leading-snug tracking-tight text-gray-900 dark:text-white">
                          {q.question}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Selected Output
                          </p>
                          <p
                            className={`font-bold text-lg ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                          >
                            {userAnswer || 'TIMEOUT_EXCEPTION'}
                          </p>
                        </div>
                        {!isCorrect && (
                          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                              Expected Output
                            </p>
                            <p className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
                              {q.correct_answer}
                            </p>
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl text-sm font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3">
                          <Info className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </AnimatedPage>
    )
  }

  // ================= VIEW: ACTIVE SESSION ================= //
  // eslint-disable-next-line security/detect-object-injection
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const displayOptions =
    currentQuestion.options || (currentQuestion.type === 'true_false' ? ['True', 'False'] : [])

  return (
    <AnimatedPage className="max-w-4xl mx-auto px-4 pb-12 pt-4">
      <SEO title="Active Session" />

      {/* Session Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30 shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-gray-900 dark:text-white uppercase mb-1">
              {quizInfo.title}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest">
              Active Evaluation Module
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] border-2 transition-all shadow-md shrink-0 ${timeRemaining < 60 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white'}`}
        >
          <Timer className="w-6 h-6" />
          <span className="font-black text-3xl tabular-nums tracking-tighter leading-none">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="mb-10 px-2">
        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
              Sequence Progress
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {currentQuestionIndex + 1}{' '}
              <span className="text-gray-400 text-sm">/ {questions.length}</span>
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg border border-primary-100 dark:border-primary-900/50">
            {Math.round(quizProgress)}% COMPLETED
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${quizProgress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="absolute inset-0 shimmer opacity-30" />
          </motion.div>
        </div>
      </div>

      {/* Question Interaction Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 md:p-12 rounded-[3rem] border-none shadow-2xl relative overflow-hidden mb-8 bg-white dark:bg-gray-900">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <Sparkles className="w-48 h-48" />
            </div>

            {/* Navigator */}
            <div className="mb-10 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Node Matrix
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {Object.keys(answers).length} / {questions.length} SECURED
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined
                  const isFlagged = flaggedQuestions.includes(q.id)
                  const isCurrent = idx === currentQuestionIndex

                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateToQuestion(idx)}
                      className={`
                          relative w-10 h-10 rounded-xl text-sm font-black transition-all duration-200
                          ${
                            isCurrent
                              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110 z-10'
                              : isAnswered
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/50'
                                : 'bg-white border border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700 hover:border-primary-300'
                          }
                        `}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-10 space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  Reward: {currentQuestion.points} XP
                </span>
                <button
                  onClick={() =>
                    flaggedQuestions.includes(currentQuestion.id)
                      ? unflagQuestion(currentQuestion.id)
                      : flagQuestion(currentQuestion.id)
                  }
                  className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border
                      ${
                        flaggedQuestions.includes(currentQuestion.id)
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50'
                      }
                    `}
                >
                  <Flag
                    className={`w-4 h-4 ${flaggedQuestions.includes(currentQuestion.id) ? 'fill-current' : ''}`}
                  />
                  {flaggedQuestions.includes(currentQuestion.id) ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-gray-900 dark:text-white">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 relative z-10" role="radiogroup">
              {displayOptions.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option
                return (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => answerQuestion(currentQuestion.id, option)}
                    className={`group w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 shadow-lg shadow-primary-500/10'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-lg transition-all shrink-0 ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500 text-white shadow-inner'
                            : 'border-gray-200 dark:border-gray-700 text-gray-400 group-hover:border-primary-300 group-hover:text-primary-500 bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span
                        className={`font-bold text-lg tracking-tight leading-snug ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {option}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="shrink-0 ml-4"
                      >
                        <CheckCircle className="w-8 h-8 text-primary-500" />
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Control Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <button
          onClick={() => currentQuestionIndex > 0 && navigateToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-3 font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 transition-all py-4 px-6 rounded-xl hover:bg-white dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" /> Previous Node
        </button>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          {isLastQuestion ? (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              isLoading={submitMutation.isPending}
              className="w-full sm:w-64 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-500/30 border border-primary-400"
            >
              Terminate & Submit
            </Button>
          ) : (
            <Button
              onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
              className="w-full sm:w-64 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-900/10 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Advance Node <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Submission Modal */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Brain className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-2xl font-black mb-3 uppercase tracking-tight text-gray-900 dark:text-white">
                  Commit Session?
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-sm bg-gray-50 dark:bg-gray-800 py-3 rounded-xl">
                  {Object.keys(answers).length} / {questions.length} Nodes Secured
                </p>
                {flaggedQuestions.length > 0 && (
                  <p className="text-amber-600 text-[10px] uppercase tracking-widest mt-4 font-black flex items-center justify-center gap-2">
                    <Flag className="w-4 h-4" />
                    {flaggedQuestions.length} Flagged{' '}
                    {flaggedQuestions.length > 1 ? 'Nodes' : 'Node'}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleConfirmSubmit}
                  isLoading={submitMutation.isPending}
                  className="w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20"
                >
                  Confirm Execution
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                  className="w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] border-2"
                >
                  Return to Module
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}

export default memo(QuizPage)
