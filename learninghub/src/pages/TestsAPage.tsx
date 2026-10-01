import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  Bookmark,
  WifiOff,
  DownloadCloud,
  Trophy,
  ShieldCheck,
  Activity,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  X,
  Plus,
  Layers,
  Lock,
} from 'lucide-react'
import { testsAService, TestA, TestQuestion, TestResult } from '../services/testsAService'
import {
  offlineAssessmentManager,
  CachedOfflineBundle,
} from '../services/offline/OfflineAssessmentManager'
import { useStore } from '../stores/useStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { AITestGeneratorModal } from '../components/AITestGeneratorModal'
import { ManualTestCreationModal } from '../components/ManualTestCreationModal'
import { IRTThetaGauge } from '../components/test/IRTThetaGauge'
import { SocraticReviewModal } from '../components/test/SocraticReviewModal'
import { MathRenderer } from '../components/MathRenderer'
import { playExamChime } from '../utils/soundEffects'

interface TestCardProps {
  test: TestA
  onStart: () => void
  isOfflineBundle?: boolean
  isDownloadingOffline?: boolean
  onDownloadOffline?: () => void
}

interface QuestionCardProps {
  question: TestQuestion
  currentIndex: number
  totalQuestions: number
  selectedAnswer: string | string[] | null
  isFlagged: boolean
  onAnswer: (optionId: string | string[]) => void
  onConfidenceChange: (confidence: string) => void
  confidence: string | undefined
  onFlag: () => void
  onUnflag: () => void
  assessmentMode?: string
  practiceChecked?: boolean
  onCheckPracticeAnswer?: () => void
  onDiagnoseMisconception?: () => void
  sectionTitle?: string
  isSectionLocked?: boolean
}

interface ResultsViewProps {
  result: TestResult
  onRetry: () => void
  onBack: () => void
  onRemediate?: (topics: string[]) => void
  adaptiveDiagnostics?: {
    abilityBand?: string
    confidenceInterval?: [number, number]
    stoppingReason?: string
  } | null
}

const TestCard = memo(
  ({ test, onStart, isOfflineBundle, isDownloadingOffline, onDownloadOffline }: TestCardProps) => {
    const difficultyColors: Record<string, string> = {
      easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      mixed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      adaptive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    }

    const aiModeInfo = useMemo(() => {
      const modeKey = (
        test.ai_mode || (test.is_ai_generated ? 'ai_optional' : 'no_ai')
      ).toLowerCase()
      switch (modeKey) {
        case 'no_ai':
          return {
            label: 'Native Bank',
            class:
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
          }
        case 'hybrid':
          return {
            label: 'Hybrid',
            class:
              'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50',
          }
        case 'ai_required':
          return {
            label: 'AI Required',
            class:
              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
          }
        default:
          return {
            label: 'AI Optional',
            class:
              'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
          }
      }
    }, [test.ai_mode, test.is_ai_generated])

    const isAdaptive = test.mode === 'adaptive' || test.difficulty === 'adaptive'
    const isContest = test.mode === 'contest'

    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 backdrop-blur-xl group">
          <div className="p-6 flex-1 flex flex-col relative z-10">
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge className={difficultyColors[test.difficulty] ?? difficultyColors.mixed}>
                  {test.difficulty}
                </Badge>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${aiModeInfo.class}`}
                >
                  {aiModeInfo.label}
                </span>
                {isAdaptive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-500" />
                    CAT
                  </span>
                )}
                {isContest && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    Contest
                  </span>
                )}
                {isOfflineBundle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Offline Ready
                  </span>
                )}
              </div>
              <div className="flex items-center text-gray-500 text-sm shrink-0">
                <Clock className="w-4 h-4 mr-1" />
                {test.time_limit_minutes} min
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {test.title}
            </h3>

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

            <div className="flex gap-2 items-center">
              <Button
                onClick={onStart}
                className="flex-1 flex items-center justify-center gap-2"
                variant="primary"
              >
                <Play className="w-4 h-4" />
                Start Test
              </Button>
              {onDownloadOffline && (
                <Button
                  onClick={onDownloadOffline}
                  variant="outline"
                  size="sm"
                  disabled={isDownloadingOffline || isOfflineBundle}
                  aria-label={
                    isOfflineBundle
                      ? `Offline bundle ready for ${test.title}`
                      : `Download offline bundle for ${test.title}`
                  }
                  title={
                    isOfflineBundle
                      ? 'Assessment cached in IndexedDB for offline taking'
                      : 'Download offline bundle with HMAC-SHA256 signature'
                  }
                  className={`px-3 py-2 border transition-all ${
                    isOfflineBundle
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {isDownloadingOffline ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : isOfflineBundle ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <DownloadCloud className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
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
)

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
    assessmentMode,
    practiceChecked,
    onCheckPracticeAnswer,
    onDiagnoseMisconception,
    sectionTitle,
    isSectionLocked,
  }: QuestionCardProps) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            {sectionTitle && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                {sectionTitle}
              </span>
            )}
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

        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-6 md:p-8 shadow-md border border-gray-100 dark:border-gray-800 backdrop-blur-xl">
          {isSectionLocked && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Section Finalized & Locked</span>
                Answers in this section are sealed and cannot be modified under examination rules.
              </div>
            </div>
          )}
          <MathRenderer
            text={question.text}
            className="text-xl font-medium text-gray-900 dark:text-white mb-8 leading-relaxed"
          />

          <div className="space-y-3">
            {question.question_type === 'subjective' || question.type === 'subjective' ? (
              <textarea
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={e => onAnswer(e.target.value)}
                disabled={isSectionLocked}
                placeholder={isSectionLocked ? 'Section is locked.' : 'Type your detailed answer here...'}
                className="w-full min-h-[200px] p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y disabled:opacity-60 disabled:cursor-not-allowed"
              />
            ) : (
              question.options.map(option => {
                const isMultiSelect =
                  question.question_type === 'multiple_select' || question.type === 'MSQ'
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(option.id)
                  : selectedAnswer === option.id

                const handleSelect = () => {
                  if (isSectionLocked) return
                  if (isMultiSelect) {
                    const current = Array.isArray(selectedAnswer)
                      ? [...selectedAnswer]
                      : selectedAnswer
                        ? [selectedAnswer]
                        : []
                    const next = current.includes(option.id)
                      ? current.filter(id => id !== option.id)
                      : [...current, option.id]
                    onAnswer(next)
                  } else {
                    onAnswer(option.id)
                  }
                }

                return (
                  <motion.button
                    key={option.id}
                    whileHover={isSectionLocked ? undefined : { scale: 1.01 }}
                    whileTap={isSectionLocked ? undefined : { scale: 0.99 }}
                    onClick={handleSelect}
                    disabled={isSectionLocked}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isSectionLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-${isMultiSelect ? 'md' : 'full'} border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <MathRenderer
                        text={option.text}
                        inline
                        className="text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>

          {/* Practice Mode Diagnostic & Socratic Scaffolding */}
          {assessmentMode === 'practice' && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Practice Mode: Test your intuition with instant feedback & Socratic AI</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onCheckPracticeAnswer && !practiceChecked && (
                  <Button
                    onClick={onCheckPracticeAnswer}
                    disabled={!selectedAnswer}
                    size="sm"
                    variant="primary"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Check Answer
                  </Button>
                )}
                {practiceChecked && onDiagnoseMisconception && (
                  <Button
                    onClick={onDiagnoseMisconception}
                    size="sm"
                    variant="outline"
                    className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1.5"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Socratic AI Hint</span>
                  </Button>
                )}
              </div>
            </div>
          )}

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
                  disabled={isSectionLocked}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => !isSectionLocked && onConfidenceChange(level as any)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    confidence === level ? activeColor : color
                  } ${isSectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
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

const ResultsView = memo(
  ({ result, onRetry, onBack, onRemediate, adaptiveDiagnostics }: ResultsViewProps) => {
    const percentage = result.percentage ?? 0
    const isPassed = result.passed ?? false
    const correctCount = result.correct_count ?? 0
    const incorrectCount = result.incorrect_count ?? 0
    const timeTaken = result.time_taken ?? 0
    const isMock = result.is_mock ?? false
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
    const [socraticQuestion, setSocraticQuestion] = useState<{
      questionText: string
      selectedOptionText: string
      correctOptionText: string
    } | null>(null)
    const addToast = useStore(state => state.addToast)

    const handleToggleBookmark = async (questionId: string) => {
      if (!questionId) return
      const isCurrentlyBookmarked = bookmarkedIds.has(questionId)
      setBookmarkedIds(prev => {
        const next = new Set(prev)
        if (isCurrentlyBookmarked) next.delete(questionId)
        else next.add(questionId)
        return next
      })

      try {
        if (isCurrentlyBookmarked) {
          await testsAService.removeBookmark(questionId)
        } else {
          await testsAService.bookmarkQuestion(questionId)
        }
        addToast({
          message: isCurrentlyBookmarked
            ? 'Question removed from revision bookmarks.'
            : '📌 Question bookmarked for revision!',
          type: 'success',
        })
      } catch {
        addToast({ message: 'Note saved locally for revision.', type: 'info' })
      }
    }

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

    const weakTopics = useMemo(() => {
      return topicBreakdown.filter(t => t.percentage < 60)
    }, [topicBreakdown])

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
                <strong>Mock Test:</strong> This test was generated using fallback questions because
                the AI service was unavailable. Scores and analytics may not reflect actual
                performance.
              </span>
            </div>
          </div>
        )}

        {/* Adaptive CAT Psychometric Profile */}
        {adaptiveDiagnostics && (
          <Card className="p-8 bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  CAT 2PL/3PL Psychometric Report
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">
                    IRT Calibrated
                  </Badge>
                </h3>
                <p className="text-xs text-slate-400">
                  {adaptiveDiagnostics.stoppingReason ||
                    'Converged under Bayesian EAP ability estimation.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Mastery Band
                </span>
                <span className="text-lg font-black text-cyan-400">
                  {adaptiveDiagnostics.abilityBand || 'Proficient'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  95% Confidence Interval
                </span>
                <span className="text-lg font-black font-mono text-purple-300">
                  {adaptiveDiagnostics.confidenceInterval
                    ? `[${adaptiveDiagnostics.confidenceInterval[0]}, ${adaptiveDiagnostics.confidenceInterval[1]}]`
                    : 'N/A'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Standard Error (SEM)
                </span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  &le; 0.30 (High Precision)
                </span>
              </div>
            </div>
          </Card>
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
              <span
                className={`text-sm font-medium ${isPassed ? 'text-green-600' : 'text-red-600'}`}
              >
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
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {incorrectCount}
              </div>
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
            {weakTopics.length > 0 && onRemediate && (
              <Button
                onClick={() => onRemediate(weakTopics.map(t => t.topic))}
                variant="secondary"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md font-medium"
              >
                <Target className="w-4 h-4" />
                Remediate Weak Topics ({weakTopics.length})
              </Button>
            )}
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
          <Card className="p-4 sm:p-6 md:p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Detailed Review
            </h3>
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
                      <MathRenderer
                        text={q.question_text}
                        className="text-lg font-medium text-gray-900 dark:text-white flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(q.question_id || `q-${idx}`)}
                        aria-label={
                          bookmarkedIds.has(q.question_id || `q-${idx}`)
                            ? `Remove bookmark for question ${idx + 1}`
                            : `Bookmark question ${idx + 1} for revision`
                        }
                        aria-pressed={bookmarkedIds.has(q.question_id || `q-${idx}`)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          bookmarkedIds.has(q.question_id || `q-${idx}`)
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={
                          bookmarkedIds.has(q.question_id || `q-${idx}`)
                            ? 'Remove bookmark'
                            : 'Bookmark question for revision'
                        }
                      >
                        <Bookmark className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <Badge
                        className={
                          q.is_correct === null
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : q.is_correct
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }
                      >
                        {q.is_correct === null
                          ? 'Grading...'
                          : q.is_correct
                            ? 'Correct'
                            : 'Incorrect'}
                      </Badge>
                    </div>
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
                          {q.question_type === 'subjective' ? (
                            <MathRenderer text={q.text_answer ?? 'No answer provided'} />
                          ) : (
                            <MathRenderer text={q.selected_options?.[0]?.text || 'No answer'} />
                          )}
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
                            <MathRenderer text={q.correct_options?.[0]?.text || 'Not available'} />
                          </div>
                        </div>
                      )}

                      {q.question_type === 'subjective' && q.ai_feedback && (
                        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/30 flex flex-col gap-2 mt-4">
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                              AI Feedback (Score: {q.marks_obtained ?? 0} /{' '}
                              {(q as { points?: number }).points ?? 10})
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

                    {/* Socratic AI Diagnostic Trigger */}
                    {q.is_correct === false && (
                      <button
                        type="button"
                        onClick={() =>
                          setSocraticQuestion({
                            questionText: q.question_text,
                            selectedOptionText:
                              q.selected_options?.[0]?.text || 'Your selected choice',
                            correctOptionText:
                              q.correct_options?.[0]?.text || 'Verified correct answer',
                          })
                        }
                        className="mt-3 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Diagnose Misconception with Socratic AI</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {socraticQuestion && (
          <SocraticReviewModal
            isOpen={Boolean(socraticQuestion)}
            onClose={() => setSocraticQuestion(null)}
            questionText={socraticQuestion.questionText}
            selectedOptionText={socraticQuestion.selectedOptionText}
            correctOptionText={socraticQuestion.correctOptionText}
          />
        )}
      </motion.div>
    )
  }
)

const TestsAPage = memo(() => {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const attemptQueryId = searchParams.get('attempt')
  const navigate = useNavigate()
  const test = useStore(state => state.test)
  const startTest = useStore(state => state.startTest)
  const answerQuestion = useStore(state => state.answerQuestion)
  const setConfidence = useStore(state => state.setConfidence)
  const flagQuestion = useStore(state => state.flagQuestion)
  const unflagQuestion = useStore(state => state.unflagQuestion)
  const navigateToQuestion = useStore(state => state.navigateToQuestion)
  const setActiveSection = useStore(state => state.setActiveSection)
  const setTestQuestions = useStore(state => state.setTestQuestions)
  const setTestResults = useStore(state => state.setTestResults)
  const submitTest = useStore(state => state.submitTest)
  const resetTestState = useStore(state => state.resetTestState)
  const updateSubjectiveGrade = useStore(state => state.updateSubjectiveGrade)
  const setAssessmentMode = useStore(state => state.setAssessmentMode)
  const setAdaptiveMetrics = useStore(state => state.setAdaptiveMetrics)
  const stepAdaptiveQuestion = useStore(state => state.stepAdaptiveQuestion)
  const recordProctorViolation = useStore(state => state.recordProctorViolation)
  const setPendingSyncCount = useStore(state => state.setPendingSyncCount)
  const lockSection = useStore(state => state.lockSection)

  const [tests, setTests] = useState<TestA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ mode: '', difficulty: '', aiMode: '' })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [hasAccess, setHasAccess] = useState(true)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)

  // 6-Mode Platform States
  const [offlineBundles, setOfflineBundles] = useState<CachedOfflineBundle[]>([])
  const [downloadingTestIds, setDownloadingTestIds] = useState<Set<string>>(new Set())
  const [localPendingSyncCount, setLocalPendingSyncCount] = useState(0)
  const [isSyncingQueue, setIsSyncingQueue] = useState(false)
  const [selectedModePill, setSelectedModePill] = useState('all')
  const [practiceChecked, setPracticeChecked] = useState<Record<string, boolean>>({})
  const [adaptiveStepLoading, setAdaptiveStepLoading] = useState(false)
  const [adaptiveDiagnostics, setAdaptiveDiagnostics] = useState<{
    abilityBand?: string
    confidenceInterval?: [number, number]
    stoppingReason?: string
  } | null>(null)
  const [socraticModalQuestion, setSocraticModalQuestion] = useState<{
    questionText: string
    selectedOptionText: string
    correctOptionText: string
  } | null>(null)

  const submitAttempted = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const targetEndTimeRef = useRef<number | null>(null)
  const prevAttemptIdRef = useRef<string | undefined>(undefined)
  const chime5mPlayedRef = useRef(false)
  const chime1mPlayedRef = useRef(false)
  const addToast = useStore(state => state.addToast)

  const activeSection = useMemo(() => {
    if (!test.sections || test.sections.length === 0) return null
    const currentQ = test.questions[test.currentQuestionIndex]
    const qSectionId = currentQ?.section_id || currentQ?.sectionId
    if (qSectionId) {
      return test.sections.find(s => s.id === qSectionId) || null
    }
    if (test.activeSectionId) {
      return test.sections.find(s => s.id === test.activeSectionId) || test.sections[0]
    }
    return test.sections[0]
  }, [test.sections, test.questions, test.currentQuestionIndex, test.activeSectionId])

  const isCurrentSectionLocked = useMemo(() => {
    if (!activeSection) return false
    return test.lockedSectionIds?.includes(activeSection.id) ?? false
  }, [activeSection, test.lockedSectionIds])

  // Load offline bundles & register sync queue listener
  useEffect(() => {
    let isMounted = true
    const initOffline = async () => {
      try {
        const bundles = await offlineAssessmentManager.listOfflineBundles()
        const count = await offlineAssessmentManager.getPendingSyncCount()
        if (isMounted) {
          setOfflineBundles(bundles)
          setLocalPendingSyncCount(count)
          setPendingSyncCount(count)
        }
      } catch (err) {
        console.warn('[TestsAPage] Failed to load offline bundles:', err)
      }
    }
    void initOffline()

    const unsub = offlineAssessmentManager.onPendingCountChange(count => {
      if (isMounted) {
        setLocalPendingSyncCount(count)
        setPendingSyncCount(count)
      }
    })
    return () => {
      isMounted = false
      unsub()
    }
  }, [setPendingSyncCount])

  // Proctoring: Detect tab switches during active exams and audit for contests
  useEffect(() => {
    if (!test.isActive || test.isSubmitting) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1
          recordProctorViolation()
          if (test.assessmentMode === 'contest' && test.testInfo?.testId) {
            void testsAService.logProctorEvent(test.testInfo.testId, 'TAB_SWITCH', {
              switchCount: next,
            })
          }
          addToast({
            message: `⚠️ Proctoring Notice: Window/tab switch detected (${next}). Logged to integrity audit trail.`,
            type: 'warning',
            duration: 4000,
          })
          return next
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [
    test.isActive,
    test.isSubmitting,
    test.assessmentMode,
    test.testInfo?.testId,
    recordProctorViolation,
    addToast,
  ])

  // Keyboard navigation shortcuts during active exam
  useEffect(() => {
    if (!test.isActive || test.questions.length === 0 || test.isSubmitting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      // Next / Previous navigation with Arrow keys
      if (!isInput) {
        if (e.key === 'ArrowRight' || e.key === 'j') {
          e.preventDefault()
          if (test.currentQuestionIndex < test.questions.length - 1) {
            navigateToQuestion(test.currentQuestionIndex + 1)
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'k') {
          e.preventDefault()
          if (test.currentQuestionIndex > 0) {
            navigateToQuestion(test.currentQuestionIndex - 1)
          }
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          const currentQ = test.questions[test.currentQuestionIndex]
          if (currentQ) {
            if (test.flaggedQuestions.includes(currentQ.id)) {
              unflagQuestion(currentQ.id)
            } else {
              flagQuestion(currentQ.id)
            }
          }
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          const optionIdx = parseInt(e.key, 10) - 1
          const currentQ = test.questions[test.currentQuestionIndex]
          // eslint-disable-next-line security/detect-object-injection
          const opt = currentQ?.options?.[optionIdx]
          if (currentQ && opt) {
            e.preventDefault()
            const optId = (opt as unknown as { id?: string }).id ?? opt.text
            if (optId) {
              answerQuestion(currentQ.id, optId)
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    test.isActive,
    test.questions,
    test.currentQuestionIndex,
    test.flaggedQuestions,
    test.isSubmitting,
    navigateToQuestion,
    flagQuestion,
    unflagQuestion,
    answerQuestion,
  ])

  const { on, isConnected } = useWebSocket()

  // Listen for real-time grading updates from the backend
  useEffect(() => {
    if (!isConnected) return

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
  }, [on, isConnected, test.results, updateSubjectiveGrade, addToast])

  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [aiModalInitialTopic, setAiModalInitialTopic] = useState<string | undefined>(undefined)
  const [aiModalInitialMode, setAiModalInitialMode] = useState<
    'adaptive' | 'weak_area' | undefined
  >(undefined)

  // Handle cross-feature deep linking (?search=..., ?generate=true, ?topic=..., ?mode=...)
  useEffect(() => {
    const searchParam = searchParams.get('search')
    if (searchParam && searchParam !== searchQuery) {
      setSearchQuery(searchParam)
    }

    const topicParam = searchParams.get('topic')
    const generateParam = searchParams.get('generate') === 'true'
    const modeParam = searchParams.get('mode') as 'adaptive' | 'weak_area' | undefined

    if (topicParam || generateParam) {
      if (topicParam) {
        setAiModalInitialTopic(topicParam)
      }
      if (modeParam) {
        setAiModalInitialMode(modeParam)
      }
      setIsAIModalOpen(true)
    }
  }, [searchParams])

  // Load attempt results directly when ?attempt=... is present in URL
  useEffect(() => {
    if (!attemptQueryId) return
    let isCancelled = false
    const loadAttemptResult = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await testsAService.getAttemptResult(attemptQueryId)
        if (!isCancelled && response.status === 'success' && response.data) {
          setTestResults(response.data)
        } else if (!isCancelled) {
          setError('Attempt result not found')
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load attempt result')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }
    void loadAttemptResult()
    return () => {
      isCancelled = true
    }
  }, [attemptQueryId, setTestResults])

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

    if (!testId && !test.isActive && !attemptQueryId) {
      void loadAccessAndTests()
    } else {
      setHasAccess(true)
      if (test.isActive && test.questions.length > 0) {
        setLoading(false)
      }
    }
  }, [filter, testId, test.isActive, test.questions.length, attemptQueryId])

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
                section_id: q.section_id ?? q.sectionId ?? null,
                sectionId: q.sectionId ?? q.section_id ?? null,
              })),
              {
                testId: test.testInfo.testId,
                testTitle: test.testInfo.testTitle,
                totalQuestions: test.testInfo.totalQuestions,
                timeLimit: response.data.time_limit ?? test.testInfo.timeLimit,
                sections: response.data.sections,
              },
              response.data.attempt_id ?? test.attempt?.attemptId ?? '',
              response.data.answers ?? {},
              response.data.time_remaining_seconds,
              response.data.sections
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

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      addToast({ message: '🌐 Network restored. Syncing test state...', type: 'success' })
      void offlineAssessmentManager.syncPendingQueue()
    }
    const handleOffline = () => {
      setIsOnline(false)
      addToast({
        message: '⚡ Working Offline: Answers will buffer locally with cryptographic signatures.',
        type: 'warning',
        duration: 5000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addToast])

  const handleDownloadOffline = useCallback(
    async (testItem: TestA) => {
      setDownloadingTestIds(prev => new Set(prev).add(testItem.id))
      try {
        const res = await testsAService.getOfflineBundle(testItem.id)
        if (res.status === 'success' && res.data) {
          await offlineAssessmentManager.saveTestBundle(res.data)
          const list = await offlineAssessmentManager.listOfflineBundles()
          setOfflineBundles(list)
          addToast({
            message: `📦 "${testItem.title}" saved offline! You can take this exam anytime without internet.`,
            type: 'success',
          })
        }
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : 'Failed to download offline bundle',
          type: 'error',
        })
      } finally {
        setDownloadingTestIds(prev => {
          const next = new Set(prev)
          next.delete(testItem.id)
          return next
        })
      }
    },
    [addToast]
  )

  const handleManualSync = useCallback(async () => {
    if (!isOnline) {
      addToast({
        message: '⚠️ Cannot sync while offline. Please connect to the internet.',
        type: 'warning',
      })
      return
    }
    setIsSyncingQueue(true)
    try {
      await offlineAssessmentManager.syncPendingQueue()
      const count = await offlineAssessmentManager.getPendingSyncCount()
      setLocalPendingSyncCount(count)
      setPendingSyncCount(count)
      addToast({ message: '✅ All offline submissions reconciled with server!', type: 'success' })
    } catch {
      addToast({ message: 'Failed to sync queue. Will retry automatically.', type: 'error' })
    } finally {
      setIsSyncingQueue(false)
    }
  }, [isOnline, addToast, setPendingSyncCount])

  const handleAdaptiveStep = useCallback(async () => {
    const currentQ = test.questions[test.currentQuestionIndex]
    const selected = test.answers[currentQ?.id]
    if (!currentQ || selected === undefined || selected === '') {
      addToast({
        message: 'Please select an answer before proceeding to the next adaptive question.',
        type: 'warning',
      })
      return
    }

    setAdaptiveStepLoading(true)
    try {
      const res = await testsAService.submitAdaptiveStep(test.testInfo?.testId || '', {
        attempt_id: test.attempt?.attemptId || '',
        question_id: currentQ.id,
        selected_option_id: selected,
        time_spent_seconds: 30,
      })

      if (res.status === 'success' && res.data) {
        const { isCompleted, nextQuestion, currentTheta, sem, normalizedScore, diagnostics } =
          res.data

        setAdaptiveMetrics(currentTheta, sem)

        if (isCompleted) {
          setAdaptiveDiagnostics(diagnostics)
          setTestResults({
            test_id: test.testInfo?.testId || '',
            attempt_id: test.attempt?.attemptId || '',
            test_title: test.testInfo?.testTitle || 'Adaptive Assessment',
            mode: 'adaptive',
            score: normalizedScore,
            total_marks: 100,
            percentage: normalizedScore,
            passed: normalizedScore >= 70,
            correct_count: res.data.questionsAnswered,
            incorrect_count: Math.max(
              0,
              (res.data.totalQuestionsPool || 15) - res.data.questionsAnswered
            ),
            unanswered_count: 0,
            time_limit: test.testInfo?.timeLimit || 30,
            time_taken: (test.testInfo?.timeLimit || 30) * 60 - test.timeRemaining,
            is_mock: false,
            question_results: [],
          })
          addToast({
            message: `🎯 CAT Converged! Latent Ability θ: ${currentTheta > 0 ? '+' : ''}${currentTheta.toFixed(2)} (${diagnostics?.abilityBand || 'Proficient'}).`,
            type: 'success',
            duration: 6000,
          })
        } else if (nextQuestion) {
          stepAdaptiveQuestion({
            id: nextQuestion.id,
            text: nextQuestion.text,
            question_type: nextQuestion.type || 'mcq',
            difficulty: nextQuestion.difficulty ?? 0.5,
            bloom_level: 'analyze',
            options: nextQuestion.options || [],
            order: test.questions.length,
            marks: nextQuestion.points || 1,
          })
        }
      }
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Error processing adaptive step',
        type: 'error',
      })
    } finally {
      setAdaptiveStepLoading(false)
    }
  }, [
    test.questions,
    test.currentQuestionIndex,
    test.answers,
    test.testInfo,
    test.attempt,
    test.timeRemaining,
    addToast,
    setAdaptiveMetrics,
    setTestResults,
    stepAdaptiveQuestion,
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
        const isAdaptive = testItem.mode === 'adaptive' || testItem.difficulty === 'adaptive'
        const isContest = testItem.mode === 'contest'
        const isPractice = testItem.mode === 'practice'
        const isOfflineAvailable = offlineBundles.some(b => b.testId === testItem.id)

        startTest(
          'tests-a',
          testItem.id,
          testItem.title,
          testItem.question_count,
          testItem.time_limit_minutes
        )

        if (isAdaptive) {
          setAssessmentMode('adaptive')
          setAdaptiveMetrics(0.0, 1.0)
        } else if (isContest) {
          setAssessmentMode('contest')
          try {
            await testsAService.getTimeSync()
          } catch {
            // non-critical
          }
        } else if (isPractice) {
          setAssessmentMode('practice')
        } else if (!isOnline && isOfflineAvailable) {
          setAssessmentMode('offline')
        }

        // If offline and bundle exists, load bundle directly from IndexedDB without network!
        if (!isOnline && isOfflineAvailable) {
          const bundle = await offlineAssessmentManager.getTestBundle(testItem.id)
          if (bundle && bundle.questions) {
            setTestQuestions(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              bundle.questions.map((q: any) => ({
                id: q.id,
                text: q.text ?? '',
                question_type: q.type ?? 'mcq',
                difficulty: q.difficulty ?? 0.5,
                bloom_level: q.bloomLevel ?? 'understand',
                options: q.options ?? [],
                order: q.order ?? 0,
                marks: q.points ?? 1,
              })),
              {
                testId: testItem.id,
                testTitle: testItem.title,
                totalQuestions: bundle.questions.length,
                timeLimit: bundle.timeLimitMinutes ?? testItem.time_limit_minutes,
              },
              `offline_attempt_${Date.now()}`
            )
            navigate(`/tests-a/${testItem.id}`)
            return
          }
        }

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
              section_id: q.section_id ?? q.sectionId ?? null,
              sectionId: q.sectionId ?? q.section_id ?? null,
            })),
            {
              testId: testItem.id,
              testTitle: testItem.title,
              totalQuestions: data.questions?.length ?? 0,
              timeLimit: data.time_limit ?? testItem.time_limit_minutes,
              sections: data.sections ?? testItem.sections,
            },
            data.attempt_id ?? '',
            data.answers ?? {},
            data.time_remaining_seconds,
            data.sections ?? testItem.sections
          )
          navigate(`/tests-a/${testItem.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
        resetTestState()
      }
    },
    [
      hasAccess,
      startTest,
      setAssessmentMode,
      setAdaptiveMetrics,
      offlineBundles,
      isOnline,
      setTestQuestions,
      navigate,
      addToast,
      resetTestState,
    ]
  )

  const handleTestGenerated = useCallback(
    (testData: {
      questions: TestQuestion[]
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
      if (!isOnline || test.isOfflineMode) {
        const bundle = offlineBundles.find(b => b.testId === test.testInfo?.testId)
        const attemptId = test.attempt?.attemptId || `offline_${Date.now()}`
        const totalElapsedSeconds = Math.max(
          0,
          (test.testInfo?.timeLimit ?? 30) * 60 - test.timeRemaining
        )

        await offlineAssessmentManager.queueOfflineSubmission({
          testId: test.testInfo?.testId || '',
          bundleId: bundle?.bundleId || `bundle_${test.testInfo?.testId}`,
          attemptId,
          answers: test.answers,
          confidences: test.confidences,
          timesSpent: {},
          clientStartedAt: test.attempt?.startedAt || new Date().toISOString(),
          clientCompletedAt: new Date().toISOString(),
          totalElapsedSeconds,
          bundleSignature: bundle?.signature || 'offline_signature',
        })

        const count = await offlineAssessmentManager.getPendingSyncCount()
        setLocalPendingSyncCount(count)
        setPendingSyncCount(count)

        const totalQ = Math.max(1, test.questions.length)
        const ansCount = Object.keys(test.answers).length

        setTestResults({
          test_id: test.testInfo?.testId || '',
          attempt_id: attemptId,
          test_title: test.testInfo?.testTitle || 'Offline Assessment',
          mode: 'offline',
          score: ansCount * 5,
          total_marks: totalQ * 5,
          percentage: Math.round((ansCount / totalQ) * 100),
          passed: true,
          correct_count: ansCount,
          incorrect_count: Math.max(0, totalQ - ansCount),
          unanswered_count: Math.max(0, totalQ - ansCount),
          time_limit: test.testInfo?.timeLimit || 30,
          time_taken: totalElapsedSeconds,
          is_mock: false,
          question_results: test.questions.map(q => ({
            question_id: q.id,
            question_text: q.text,
            question_type: q.question_type,
            selected_options: [
              {
                id: String(test.answers[q.id] || ''),
                text: String(test.answers[q.id] || 'Answered offline'),
              },
            ],
            correct_options: [{ id: 'offline', text: 'Verification Pending Reconnect' }],
            is_correct: true,
            marks_obtained: 5,
            explanation:
              'Submission sealed with cryptographic HMAC-SHA256 signature. Awaiting auto-sync.',
            time_spent: 30,
            is_flagged: test.flaggedQuestions.includes(q.id),
            confidence: test.confidences[q.id],
          })),
        })

        addToast({
          message:
            '⚡ Submission sealed offline! Will automatically sync once network is restored.',
          type: 'success',
          duration: 6000,
        })
        return
      }

      const result = await submitTest()
      if (!result.success) {
        setError('Failed to submit test. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    isOnline,
    test.isOfflineMode,
    test.testInfo,
    test.attempt,
    test.timeRemaining,
    test.answers,
    test.confidences,
    test.questions,
    test.flaggedQuestions,
    offlineBundles,
    submitTest,
    setTestResults,
    addToast,
    setPendingSyncCount,
  ])

  // Client countdown anchored to Date.now()+timeRemaining, corrected by server
  // heartbeat for contest mode. Deps include timeRemaining + attemptId to avoid
  // stale closures; prevAttemptIdRef resets the anchor on attempt switch.
  useEffect(() => {
    if (test.attempt?.attemptId !== prevAttemptIdRef.current) {
      targetEndTimeRef.current = null
      prevAttemptIdRef.current = test.attempt?.attemptId
      chime5mPlayedRef.current = false
      chime1mPlayedRef.current = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }

    if (!test.isActive || test.isSubmitting) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
      targetEndTimeRef.current = null
      return
    }

    if (!targetEndTimeRef.current && test.timeRemaining > 0) {
      targetEndTimeRef.current = Date.now() + test.timeRemaining * 1000
    } else if (targetEndTimeRef.current && test.timeRemaining === 0) {
      // handle ref reset when truthy check fails (recovered time_remaining was 0 or reset)
      targetEndTimeRef.current = null
    }

    if (timerRef.current) return

    timerRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return
      const remainingSeconds = Math.max(
        0,
        Math.round((targetEndTimeRef.current - Date.now()) / 1000)
      )
      useStore.setState(state => ({
        test: { ...state.test, timeRemaining: remainingSeconds },
      }))

      // Audio chimes & gentle countdown notices
      if (remainingSeconds <= 300 && remainingSeconds > 290 && !chime5mPlayedRef.current) {
        chime5mPlayedRef.current = true
        playExamChime('warning-5m')
        addToast({ message: '⏳ 5 minutes remaining in your examination session.', type: 'info' })
      } else if (remainingSeconds <= 60 && remainingSeconds > 50 && !chime1mPlayedRef.current) {
        chime1mPlayedRef.current = true
        playExamChime('warning-1m')
        addToast({ message: '⚠️ 1 minute remaining! Please finalize your answers.', type: 'error' })
      } else if (remainingSeconds === 0) {
        playExamChime('time-up')
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [test.isActive, test.isSubmitting, test.timeRemaining, test.attempt?.attemptId, addToast])

  // Server heartbeat: every 60s during contest mode, reconcile client clock
  // drift against authoritative server time so auto-submit matches backend.
  useEffect(() => {
    if (!test.isActive || test.isSubmitting || test.assessmentMode !== 'contest') return
    if (!test.testInfo?.testId || !test.attempt?.attemptId) return
    const heartbeatId = setInterval(() => {
      void (async () => {
        try {
          const res = await testsAService.getTimeSync()
          const serverRemaining = (res?.data as { time_remaining_seconds?: number })
            ?.time_remaining_seconds
          if (typeof serverRemaining === 'number' && serverRemaining >= 0) {
            targetEndTimeRef.current = Date.now() + serverRemaining * 1000
            useStore.setState(state => ({
              test: { ...state.test, timeRemaining: serverRemaining },
            }))
          }
        } catch {
          // Heartbeat is best-effort; client countdown continues uninterrupted.
        }
      })()
    }, 60_000)
    return () => clearInterval(heartbeatId)
  }, [
    test.isActive,
    test.isSubmitting,
    test.assessmentMode,
    test.testInfo?.testId,
    test.attempt?.attemptId,
  ])

  // Periodic autosave every 30 seconds during active test
  const autosaveRef = useRef<ReturnType<typeof setInterval> | undefined>()
  const testAnswersRef = useRef(test.answers)
  const testInfoRef = useRef(test.testInfo)
  const attemptIdRef = useRef(test.attempt?.attemptId)
  const lockedSectionsRef = useRef(test.lockedSectionIds)

  // Keep refs in sync
  useEffect(() => {
    testAnswersRef.current = test.answers
    testInfoRef.current = test.testInfo
    attemptIdRef.current = test.attempt?.attemptId
    lockedSectionsRef.current = test.lockedSectionIds
  }, [test.answers, test.testInfo, test.attempt?.attemptId, test.lockedSectionIds])

  useEffect(() => {
    if (!test.isActive || test.isSubmitting || !attemptIdRef.current) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
        autosaveRef.current = undefined
      }
      return
    }

    const flushAutosave = async () => {
      try {
        const answers = testAnswersRef.current || {}
        const testInfo = testInfoRef.current
        const attemptId = attemptIdRef.current
        const lockedSectionIds = lockedSectionsRef.current || []
        // Skip empty autosaves to avoid pointless writes, but offline queue
        // count is still refreshed below so the Offline Station stays accurate.
        if (testInfo?.testId && attemptId && Object.keys(answers).length > 0) {
          await testsAService.batchAutosave(testInfo.testId, answers, attemptId, lockedSectionIds)
          useStore.setState(state => ({
            test: { ...state.test, lastAutosavedAt: new Date().toISOString() },
          }))
        }
      } catch (err) {
        // Autosave failure (often offline): refresh queued offline count so the
        // Offline Assessment Station badge stays truthful instead of hiding loss.
        try {
          const count = await offlineAssessmentManager.getPendingSyncCount()
          setLocalPendingSyncCount(count)
          setPendingSyncCount(count)
        } catch {
          // ignore count-refresh failure
        }
        console.warn('[TestsAPage] Autosave failed, offline queue updated:', err)
      }
    }

    autosaveRef.current = setInterval(() => {
      void flushAutosave()
    }, 30000)

    // beforeunload flush: best-effort save so closing the tab mid-exam does
    // not lose the last <30s of answers. Async is not guaranteed here, so we
    // fire-and-forget and rely on the offline queue as fallback.
    const handleBeforeUnload = () => {
      const answers = testAnswersRef.current || {}
      const testInfo = testInfoRef.current
      const attemptId = attemptIdRef.current
      const lockedSectionIds = lockedSectionsRef.current || []
      if (testInfo?.testId && attemptId && Object.keys(answers).length > 0) {
        void testsAService
          .batchAutosave(testInfo.testId, answers, attemptId, lockedSectionIds)
          .catch(() => undefined)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
        autosaveRef.current = undefined
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [test.isActive, test.isSubmitting, test.attempt?.attemptId, setPendingSyncCount])

  useEffect(() => {
    if (
      test.timeRemaining === 0 &&
      test.isActive &&
      !test.isSubmitting &&
      !submitAttempted.current
    ) {
      // Atomic check-and-set to prevent race conditions
      if (submitAttempted.current) return
      submitAttempted.current = true
      void handleSubmit()
    }
  }, [test.timeRemaining, test.isActive, test.isSubmitting, handleSubmit])

  const filteredTests = useMemo(
    () =>
      tests.filter(test => {
        if (
          selectedModePill === 'adaptive' &&
          test.mode !== 'adaptive' &&
          test.difficulty !== 'adaptive'
        )
          return false
        if (selectedModePill === 'contest' && test.mode !== 'contest') return false
        if (selectedModePill === 'practice' && test.mode !== 'practice') return false
        if (selectedModePill === 'ai' && test.ai_mode !== 'ai_required' && !test.is_ai_generated)
          return false
        if (selectedModePill === 'non_ai' && test.ai_mode !== 'no_ai') return false
        if (selectedModePill === 'offline' && !offlineBundles.some(b => b.testId === test.id))
          return false

        return (
          (filter.mode === '' || test.mode === filter.mode) &&
          (filter.difficulty === '' || test.difficulty === filter.difficulty) &&
          (filter.aiMode === '' ||
            (test.ai_mode || (test.is_ai_generated ? 'ai_optional' : 'no_ai')).toLowerCase() ===
              filter.aiMode.toLowerCase()) &&
          (searchQuery === '' ||
            test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            test.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }),
    [tests, searchQuery, filter, selectedModePill, offlineBundles]
  )

  // State-preserving retry: re-fetch list WITHOUT window.location.reload()
  // so in-progress answers, timer refs, and offline queue are never lost.
  const handleRetryLoadTests = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await testsAService.getTests(filter)
      if (response.status === 'success') {
        setTests(response.data)
      } else {
        setError('Failed to load tests. Your answers are preserved — try again.')
      }
    } catch (err) {
      // Preserve all local state (answers/timer/queue); surface retryable UI.
      setError(
        err instanceof Error
          ? `${err.message} — your answers and timer are preserved.`
          : 'Failed to load tests. Your answers and timer are preserved.'
      )
    } finally {
      setLoading(false)
    }
  }, [filter])

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
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={AlertTriangle}
              title="Could not load tests"
              description={`${error} Your in-progress answers (if any) and offline queue are preserved.`}
              actionLabel="Retry without losing progress"
              onAction={() => void handleRetryLoadTests()}
              secondaryAction={{ label: 'Back to dashboard', href: '/dashboard' }}
            />
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

        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-md">
            <WifiOff className="w-4 h-4" />
            <span>
              Working Offline: Your answers are safely buffered locally. Reconnect before
              submitting.
            </span>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {test.testInfo?.testTitle}
              </h1>
              <div className="flex items-center gap-4">
                {test.assessmentMode === 'adaptive' && (
                  <div className="hidden sm:block">
                    <IRTThetaGauge theta={test.adaptiveTheta} sem={test.adaptiveSem} />
                  </div>
                )}
                {test.assessmentMode === 'contest' && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold shadow-sm">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Contest Arena</span>
                  </div>
                )}
                {test.assessmentMode === 'practice' && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-bold shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Practice Mode</span>
                  </div>
                )}
                <div
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Time remaining ${Math.floor(test.timeRemaining / 60)} minutes ${String(test.timeRemaining % 60).padStart(2, '0')} seconds`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    test.timeRemaining < 60
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 animate-pulse'
                      : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}
                >
                  <Timer className="w-4 h-4" aria-hidden="true" />
                  <span className="font-mono font-medium" aria-hidden="true">
                    {Math.floor(test.timeRemaining / 60)}:
                    {String(test.timeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
                {tabSwitchCount > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold"
                    title="Number of tab / window switch events detected"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Switches: {tabSwitchCount}</span>
                  </div>
                )}
                <div className="text-xs hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                  {test.autosaveStatus === 'saving' ? (
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Saving...
                    </span>
                  ) : test.autosaveStatus === 'retrying' ? (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      Retrying...
                    </span>
                  ) : !isOnline || test.autosaveStatus === 'offline' ? (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline (Saved locally)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {test.lastAutosavedAt
                        ? `Saved ${new Date(test.lastAutosavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        : 'Autosave Active'}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => setIsSubmitModalOpen(true)}
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
              <span className="hidden md:inline font-mono">
                Shortcuts:{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                  ←
                </kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                  →
                </kbd>{' '}
                Navigate •{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                  1-4
                </kbd>{' '}
                Answer •{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                  F
                </kbd>{' '}
                Flag
              </span>
              <span className="font-medium ml-auto">
                Question {test.currentQuestionIndex + 1} of {test.questions.length}
              </span>
            </div>

            <div className="mt-2" aria-live="polite">
              <ProgressBar
                progress={((test.currentQuestionIndex + 1) / test.questions.length) * 100}
                className="h-2"
                label={`Question ${test.currentQuestionIndex + 1} of ${test.questions.length}, ${Math.round(((test.currentQuestionIndex + 1) / test.questions.length) * 100)}% complete, ${Math.floor(test.timeRemaining / 60)} minutes remaining`}
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {test.sections && test.sections.length > 0 && (
            <div className="mb-4 bg-white dark:bg-gray-800/90 rounded-2xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                      Exam Sections ({test.sections.length})
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Switch between subjects or focus section questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeSection?.is_timed && activeSection.duration_minutes && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Section Limit: {activeSection.duration_minutes}m
                    </span>
                  )}
                  {activeSection && !isCurrentSectionLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Lock section "${activeSection.title}"? Answers in this section cannot be edited once locked.`
                          )
                        ) {
                          lockSection(activeSection.id)
                          addToast({
                            message: `🔒 Section "${activeSection.title}" locked. Advanced to next section.`,
                            type: 'info',
                          })
                        }
                      }}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1 transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock Section</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {test.sections.map((section, idx) => {
                  const sectionQuestions = test.questions.filter(
                    q => (q.section_id || q.sectionId) === section.id
                  )
                  const totalSecQuestions = sectionQuestions.length || section.question_count || 0
                  const answeredSecCount = sectionQuestions.filter(
                    q => test.answers[q.id] !== undefined && test.answers[q.id] !== ''
                  ).length
                  const isSelected =
                    activeSection?.id === section.id || test.activeSectionId === section.id
                  const isSecLocked = Boolean(test.lockedSectionIds?.includes(section.id))
                  const canNavigate = !isSecLocked || section.allow_backward_navigation !== false

                  return (
                    <button
                      key={section.id || idx}
                      onClick={() => {
                        if (!canNavigate) {
                          addToast({
                            message: `🔒 Section "${section.title}" is locked. Backward navigation is disabled.`,
                            type: 'warning',
                          })
                          return
                        }
                        setActiveSection(section.id)
                        const firstIndex = test.questions.findIndex(
                          q => (q.section_id || q.sectionId) === section.id
                        )
                        if (firstIndex !== -1) {
                          navigateToQuestion(firstIndex)
                        }
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-500/30'
                          : isSecLocked
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-700/60 dark:hover:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {isSecLocked && <Lock className="w-3 h-3 text-amber-500" />}
                      <span>{section.title || `Section ${idx + 1}`}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-purple-700 text-purple-100'
                            : isSecLocked
                              ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {answeredSecCount} / {totalSecQuestions}
                      </span>
                      {isSecLocked && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Locked
                        </span>
                      )}
                      {section.is_timed && section.duration_minutes && !isSecLocked && (
                        <span className="text-[10px] opacity-80 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {section.duration_minutes}m
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-nowrap gap-1 sm:gap-2 mb-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-x-visible">
            {test.questions.map((q, index) => {
              const isAnswered = test.answers[q.id] !== undefined && test.answers[q.id] !== ''
              const isCurrentFlagged = test.flaggedQuestions.includes(q.id)
              const isCurrent = index === test.currentQuestionIndex

              let btnClass =
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
              if (isCurrent) {
                btnClass =
                  'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 font-bold shadow-sm'
              } else if (isAnswered && isCurrentFlagged) {
                btnClass =
                  'bg-purple-100 text-purple-900 border-2 border-amber-400 dark:bg-purple-950/60 dark:text-purple-300 font-semibold'
              } else if (isAnswered) {
                btnClass =
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium'
              } else if (isCurrentFlagged) {
                btnClass =
                  'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 font-medium'
              }

              return (
                <button
                  key={q.id}
                  onClick={() => navigateToQuestion(index)}
                  aria-label={`Go to question ${index + 1}: ${isAnswered ? 'answered' : 'unanswered'}${isCurrentFlagged ? ', flagged' : ''}${isCurrent ? ', current' : ''}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`w-10 h-10 rounded-lg text-sm transition-all relative ${btnClass}`}
                  title={`Question ${index + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isCurrentFlagged ? ' (Flagged)' : ''}`}
                >
                  {index + 1}
                  {isCurrentFlagged && !isCurrent && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white dark:border-gray-900" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-6 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" /> Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Answered (
              {Object.values(test.answers).filter(v => v !== undefined && v !== '').length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" /> Flagged (
              {test.flaggedQuestions.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500 border border-amber-400" /> Flagged &
              Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-700" /> Unanswered (
              {Math.max(
                0,
                test.questions.length -
                  Object.values(test.answers).filter(v => v !== undefined && v !== '').length
              )}
              )
            </span>
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
                sectionTitle={activeSection?.title}
                isSectionLocked={isCurrentSectionLocked}
                onAnswer={optionId => answerQuestion(currentQuestion.id, optionId)}
                onConfidenceChange={level => setConfidence(currentQuestion.id, level)}
                onFlag={() => flagQuestion(currentQuestion.id)}
                onUnflag={() => unflagQuestion(currentQuestion.id)}
                assessmentMode={test.assessmentMode}
                practiceChecked={Boolean(practiceChecked[currentQuestion.id])}
                onCheckPracticeAnswer={() => {
                  setPracticeChecked(prev => ({ ...prev, [currentQuestion.id]: true }))
                }}
                onDiagnoseMisconception={() => {
                  const selOpt = currentQuestion.options?.find(o => o.id === selectedAnswer)
                  const corrOpt = currentQuestion.options?.find(o => o.id !== selectedAnswer)
                  setSocraticModalQuestion({
                    questionText: currentQuestion.text,
                    selectedOptionText: selOpt?.text || 'Your selected choice',
                    correctOptionText: corrOpt?.text || 'Conceptual ground truth',
                  })
                }}
              />
            </motion.div>
          </AnimatePresence>

          {test.assessmentMode === 'adaptive' ? (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Activity className="w-4 h-4 text-purple-500 animate-pulse" />
                <span>
                  CAT Algorithm Active: Ability estimated via Bayesian EAP; next item maximizes
                  Fisher Information.
                </span>
              </div>
              <Button
                onClick={handleAdaptiveStep}
                disabled={adaptiveStepLoading || !selectedAnswer}
                variant="primary"
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
              >
                {adaptiveStepLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating θ...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Next Adaptive Item</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
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
          )}
        </div>

        {socraticModalQuestion && (
          <SocraticReviewModal
            isOpen={Boolean(socraticModalQuestion)}
            onClose={() => setSocraticModalQuestion(null)}
            questionText={socraticModalQuestion.questionText}
            selectedOptionText={socraticModalQuestion.selectedOptionText}
            correctOptionText={socraticModalQuestion.correctOptionText}
          />
        )}

        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-blue-600" /> Confirm Submission
                </h3>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  aria-label="Close submit confirmation dialog"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to submit your test? Once submitted, your answers will be
                graded deterministically.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-center">
                  <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {Object.values(test.answers).filter(v => v !== undefined && v !== '').length}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Attempted</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                  <span className="block text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {Math.max(
                      0,
                      test.questions.length -
                        Object.values(test.answers).filter(v => v !== undefined && v !== '').length
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Unanswered</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-center">
                  <span className="block text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {test.flaggedQuestions.length}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Flagged</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg">
                <span>Time Remaining:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                  {Math.floor(test.timeRemaining / 60)}m{' '}
                  {String(test.timeRemaining % 60).padStart(2, '0')}s
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Return to Test
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsSubmitModalOpen(false)
                    void handleSubmit()
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
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
            adaptiveDiagnostics={adaptiveDiagnostics}
            onRemediate={(topics: string[]) => {
              const topicStr = topics.join(', ')
              setAiModalInitialTopic(topicStr)
              setAiModalInitialMode('weak_area')
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              addToast({
                message: `🎯 Opening adaptive remediation drill for: ${topicStr}`,
                type: 'info',
              })
              setIsAIModalOpen(true)
            }}
            onRetry={() => {
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              if (test.testInfo) {
                const testItem = tests.find(t => t.id === test.testInfo?.testId)
                if (testItem) void handleStartTest(testItem)
              }
            }}
            onBack={() => {
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              setSearchParams({})
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
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsManualModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              Create Custom Test
            </Button>
            <Button
              onClick={() => setIsAIModalOpen(true)}
              variant="primary"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25"
            >
              <Sparkles className="w-5 h-5" />
              AI Custom Mock
            </Button>
          </div>
        </div>

        {/* Offline Assessment Station Bar */}
        {(localPendingSyncCount > 0 || offlineBundles.length > 0 || !isOnline) && (
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Offline Assessment Station
                  {offlineBundles.length > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px]">
                      {offlineBundles.length} Bundles Cached
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {localPendingSyncCount > 0
                    ? `${localPendingSyncCount} completed assessment submissions buffered locally, awaiting server reconciliation.`
                    : 'Download assessments now to practice or test on the go with zero network latency.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {localPendingSyncCount > 0 && (
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncingQueue || !isOnline}
                  size="sm"
                  variant="primary"
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                  <span>Sync Now ({localPendingSyncCount})</span>
                </Button>
              )}
            </div>
          </div>
        )}

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

        {/* 6-Mode Platform Filter Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
          {[
            { id: 'all', label: 'All Modes', icon: Target, mode: '', ai: '' },
            {
              id: 'adaptive',
              label: 'Adaptive CAT (2PL/3PL)',
              icon: Activity,
              mode: 'adaptive',
              ai: '',
            },
            { id: 'contest', label: 'Contest Arena', icon: Trophy, mode: 'contest', ai: '' },
            {
              id: 'practice',
              label: 'Practice & Socratic',
              icon: Sparkles,
              mode: 'practice',
              ai: '',
            },
            { id: 'ai', label: 'AI Generative', icon: BrainCircuit, mode: '', ai: 'ai_required' },
            {
              id: 'non_ai',
              label: 'Native Bank (Zero Latency)',
              icon: ShieldCheck,
              mode: '',
              ai: 'no_ai',
            },
            {
              id: 'offline',
              label: `Offline Ready (${offlineBundles.length})`,
              icon: DownloadCloud,
              mode: '',
              ai: '',
            },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModePill(m.id)
                setFilter(prev => ({
                  ...prev,
                  mode: m.mode,
                  aiMode: m.ai,
                }))
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                selectedModePill === m.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/50 font-bold'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          ))}
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

            <select
              value={filter.aiMode}
              onChange={e => setFilter({ ...filter, aiMode: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              aria-label="Filter by AI Policy"
            >
              <option value="">All Engines</option>
              <option value="no_ai">Native Question Bank (No AI)</option>
              <option value="ai_optional">AI Optional</option>
              <option value="hybrid">Hybrid</option>
              <option value="ai_required">AI Required</option>
            </select>
          </div>
        </div>

        {filteredTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                onStart={() => handleStartTest(test)}
                isOfflineBundle={offlineBundles.some(b => b.testId === test.id)}
                isDownloadingOffline={downloadingTestIds.has(test.id)}
                onDownloadOffline={() => handleDownloadOffline(test)}
              />
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
        onClose={() => {
          setIsAIModalOpen(false)
          setAiModalInitialTopic(undefined)
          setAiModalInitialMode(undefined)
        }}
        onTestGenerated={handleTestGenerated}
        hasAccess={hasAccess}
        initialTopic={aiModalInitialTopic}
        initialMode={aiModalInitialMode}
      />

      <ManualTestCreationModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onTestCreated={newTest => {
          setTests(prev => [newTest, ...prev])
        }}
      />
    </div>
  )
})

export default TestsAPage
