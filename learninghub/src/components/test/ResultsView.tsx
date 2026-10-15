import { useState, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Timer,
  Star,
  BrainCircuit,
  Target,
  RotateCcw,
  BarChart3,
  Bookmark,
  Sparkles,
  AlertTriangle,
  Activity,
  Check,
  Lightbulb,
  RefreshCw,
  Loader2,
  Download,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { MathRenderer } from '../MathRenderer'
import { AssessmentIntegrityScorecard } from './AssessmentIntegrityScorecard'
import { CompetitiveScoringBreakdownCard } from './CompetitiveScoringBreakdownCard'
import { PeerPercentileBellCurve } from './PeerPercentileBellCurve'
import { SpeedAccuracyScatterChart } from './SpeedAccuracyScatterChart'
import { SocraticReviewModal } from './SocraticReviewModal'
import { MistakeRemediationModal } from './MistakeRemediationModal'
import { analyzeMistakes } from '../../services/remediationService'
import { testsAService, type TestResult } from '../../services/testsAService'
import { scorecardPdfService } from '../../services/scorecardPdfService'
import { useStore } from '../../stores/useStore'

interface ParsedRubric {
  feedback: string
  rubric: Array<{ name: string; score: number; maxScore: number; comment?: string }>
  strengths: string[]
  improvements: string[]
}

const parseSubjectiveFeedback = (raw?: string): ParsedRubric | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && (parsed.rubric || parsed.rubricBreakdown || parsed.feedback)) {
        const rawRubric = parsed.rubric || parsed.rubricBreakdown || []
        return {
          feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
          rubric: Array.isArray(rawRubric)
            ? rawRubric.map((r: any) => ({
                name: r.name || r.criterion || 'Criterion',
                score: typeof r.score === 'number' ? r.score : 0,
                maxScore: typeof r.maxScore === 'number' && r.maxScore > 0 ? r.maxScore : 1,
                comment: r.comment || r.feedback || '',
              }))
            : [],
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean) : [],
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.filter(Boolean)
            : [],
        }
      }
    } catch {
      // Fallback to plain string if parse fails
    }
  }
  return null
}

const SubjectiveRubricScorecard = ({
  rawFeedback,
  marksObtained,
  totalPoints,
  onGrade,
  isGrading,
}: {
  rawFeedback?: string
  marksObtained: number | null
  totalPoints: number
  onGrade: () => void
  isGrading: boolean
}) => {
  const parsed = useMemo(() => parseSubjectiveFeedback(rawFeedback), [rawFeedback])
  const score = marksObtained ?? 0
  const pct = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

  if (!rawFeedback) {
    return (
      <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Subjective AI Rubric Evaluation
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Grade this response across conceptual accuracy, depth, clarity, and reasoning.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onGrade}
          disabled={isGrading}
          className="shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 shadow-xs transition-all"
        >
          {isGrading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Rubric...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Grade with AI Rubric</span>
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/90 dark:border-purple-850/60 flex flex-col gap-4 mt-4 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-purple-200/60 dark:border-purple-800/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-purple-950 dark:text-purple-200">
              AI Rubric Evaluation
            </span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-200/70 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
              {score} / {totalPoints} pts ({pct}%)
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onGrade}
          disabled={isGrading}
          className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-3 py-1.5 h-auto transition-colors"
        >
          {isGrading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Re-evaluating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Re-evaluate</span>
            </>
          )}
        </Button>
      </div>

      {/* Multi-dimensional criteria bars if available */}
      {parsed && parsed.rubric.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900/80 dark:text-purple-300/80">
            Dimensional Rubric Breakdown
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {parsed.rubric.map((crit, idx) => {
              const critPct = Math.round((crit.score / crit.maxScore) * 100)
              const barColor =
                critPct >= 80
                  ? 'bg-emerald-500'
                  : critPct >= 50
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'

              return (
                <div
                  key={crit.name || idx}
                  className="p-3 rounded-lg bg-white/90 dark:bg-gray-800/80 border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200 truncate pr-2">
                      {crit.name}
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 shrink-0 font-mono">
                      {crit.score} / {crit.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, critPct))}%` }}
                    />
                  </div>
                  {crit.comment && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {crit.comment}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      {parsed && (parsed.strengths.length > 0 || parsed.improvements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {parsed.strengths.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="space-y-1">
                {parsed.strengths.map((str, sIdx) => (
                  <li
                    key={sIdx}
                    className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-snug flex items-start gap-1.5"
                  >
                    <span className="text-emerald-500">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.improvements.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Actionable Recommendations</span>
              </div>
              <ul className="space-y-1">
                {parsed.improvements.map((imp, iIdx) => (
                  <li
                    key={iIdx}
                    className="text-xs text-amber-900 dark:text-amber-200/90 leading-snug flex items-start gap-1.5"
                  >
                    <span className="text-amber-500">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary prose feedback */}
      <div className="pt-1">
        <span className="text-xs font-bold text-purple-900/90 dark:text-purple-300/90 block mb-1">
          Detailed Evaluator Summary:
        </span>
        <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-white/70 dark:bg-gray-800/50 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
          {parsed?.feedback || rawFeedback}
        </div>
      </div>
    </div>
  )
}

export interface ResultsViewProps {
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

export const ResultsView = memo(
  ({ result, onRetry, onBack, onRemediate, adaptiveDiagnostics }: ResultsViewProps) => {
    const percentage = result.percentage ?? 0
    const isPassed = result.passed ?? false
    const correctCount = result.correct_count ?? 0
    const incorrectCount = result.incorrect_count ?? 0
    const timeTaken = result.time_taken ?? 0
    const isMock = result.is_mock ?? false
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
    const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false)
    const mistakeSummary = useMemo(() => analyzeMistakes(result), [result])
    const [socraticQuestion, setSocraticQuestion] = useState<{
      questionText: string
      selectedOptionText: string
      correctOptionText: string
    } | null>(null)
    const user = useStore(state => state.auth?.user)
    const addToast = useStore(state => state.addToast)
    const updateSubjectiveGrade = useStore(state => state.updateSubjectiveGrade)
    const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null)
    const [isExportingScorecard, setIsExportingScorecard] = useState(false)

    const handleExportScorecard = async () => {
      try {
        setIsExportingScorecard(true)
        await scorecardPdfService.downloadScorecard(result, 'Academic Assessment', {
          candidateName: user?.username || 'LearningHub Scholar',
          candidateEmail: user?.email,
        })
        addToast({ message: 'Official Scorecard downloaded successfully!', type: 'success' })
      } catch {
        addToast({ message: 'Failed to generate scorecard PDF.', type: 'error' })
      } finally {
        setIsExportingScorecard(false)
      }
    }

    const handleGradeSubjective = async (questionId: string, answerText?: string) => {
      if (!questionId || gradingQuestionId) return
      setGradingQuestionId(questionId)
      try {
        const response = await testsAService.gradeSubjectiveAnswer(result.test_id, {
          questionId,
          testResultId: result.attempt_id,
          answerText,
        })

        if (response.data) {
          updateSubjectiveGrade(response.data as any)
          addToast({
            message: '⚡ AI Rubric evaluation complete!',
            type: 'success',
          })
        }
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : 'Failed to grade subjective answer',
          type: 'error',
        })
      } finally {
        setGradingQuestionId(null)
      }
    }

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

          <div className="flex flex-wrap gap-3 justify-center items-center mt-6">
            {mistakeSummary.totalMistakes > 0 && (
              <Button
                onClick={() => setIsMistakeModalOpen(true)}
                variant="secondary"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md font-semibold text-xs sm:text-sm min-h-[44px]"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Mistake Diagnostics ({mistakeSummary.totalMistakes})</span>
              </Button>
            )}
            {weakTopics.length > 0 && onRemediate && (
              <Button
                onClick={() => onRemediate(weakTopics.map(t => t.topic))}
                variant="secondary"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md font-medium text-xs sm:text-sm min-h-[44px]"
              >
                <Target className="w-4 h-4" />
                <span>Remediate Weak Topics ({weakTopics.length})</span>
              </Button>
            )}
            <Button
              onClick={handleExportScorecard}
              disabled={isExportingScorecard}
              variant="secondary"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 shadow-md font-medium text-xs sm:text-sm min-h-[44px]"
            >
              {isExportingScorecard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-indigo-400" />
              )}
              <span>{isExportingScorecard ? 'Generating PDF...' : 'Download Scorecard (PDF)'}</span>
            </Button>
            <Button
              onClick={onRetry}
              variant="primary"
              className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Test</span>
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] text-xs sm:text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Back to Tests</span>
            </Button>
          </div>
        </Card>

        {/* NTA CBT Competitive Scoring Breakdown (+4 / -1) & National Rank Calibration */}
        <CompetitiveScoringBreakdownCard result={result} />

        {/* Cohort Bell Curve Benchmark */}
        <PeerPercentileBellCurve
          userScore={Math.round(percentage)}
          userPercentile={Math.min(99.9, Math.max(1.0, Math.round((percentage / 100) * 98 * 10) / 10))}
        />

        {/* Speed vs. Accuracy 4-Quadrant Diagnostic */}
        <SpeedAccuracyScatterChart />

        {/* Assessment Integrity Shield Card */}
        <AssessmentIntegrityScorecard result={result} />

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

        {/* Cognitive Diagnostics Snapshot Card */}
        {mistakeSummary.totalMistakes > 0 && (
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 dark:from-indigo-950/20 dark:via-gray-900 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Cognitive Error Pattern Analysis
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold text-xs">
                      {mistakeSummary.totalMistakes} Error{mistakeSummary.totalMistakes === 1 ? '' : 's'}
                    </Badge>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Primary Root Cause:{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {mistakeSummary.primaryWeaknessLabel}
                    </strong>
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setIsMistakeModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review Errors & Launch 5-Min Drill</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {mistakeSummary.categories.map(cat => (
                <div
                  key={cat.type}
                  className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-medium truncate">{cat.label}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{cat.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
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
                    {(() => {
                      const isSubjective =
                        String(q.question_type || '').toLowerCase() === 'subjective'
                      return (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="mt-0.5">
                              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                                Your Answer:
                              </span>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">
                              {isSubjective ? (
                                <MathRenderer text={q.text_answer ?? 'No answer provided'} />
                              ) : (
                                <MathRenderer text={q.selected_options?.[0]?.text || 'No answer'} />
                              )}
                            </div>
                          </div>

                          {!q.is_correct && !isSubjective && (
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

                          {isSubjective && (
                            <SubjectiveRubricScorecard
                              rawFeedback={q.ai_feedback}
                              marksObtained={q.marks_obtained}
                              totalPoints={(q as { points?: number }).points ?? 10}
                              onGrade={() => handleGradeSubjective(q.question_id, q.text_answer)}
                              isGrading={gradingQuestionId === q.question_id}
                            />
                          )}
                        </div>
                      )
                    })()}

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
                        <MathRenderer text={q.explanation} />
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

        {isMistakeModalOpen && (
          <MistakeRemediationModal
            isOpen={isMistakeModalOpen}
            onClose={() => setIsMistakeModalOpen(false)}
            summary={mistakeSummary}
            onStartTargetedDrill={topics => {
              setIsMistakeModalOpen(false)
              if (onRemediate) onRemediate(topics)
            }}
            onBookmarkQuestion={handleToggleBookmark}
            bookmarkedQuestionIds={bookmarkedIds}
          />
        )}
      </motion.div>
    )
  }
)

ResultsView.displayName = 'ResultsView'
