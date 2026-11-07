import { memo, useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Zap, AlertTriangle, Clock, Timer, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateBenchmarkSeconds } from './QuestionPaceRadar'

export interface QuestionPaceProfile {
  questionId: string
  index: number
  topic: string
  difficulty?: string | number
  questionType?: string
  marks?: number
  timeSpent: number
  benchmarkTime: number
  ratio: number
  isCorrect: boolean | null
  classification: 'optimal' | 'time_trap' | 'rushed' | 'unattempted'
}

export interface PacingEfficiencyCardProps {
  questionResults?: Array<{
    question_id?: string
    id?: string
    topic?: string
    difficulty?: string | number
    question_type?: string
    type?: string
    marks?: number
    time_spent?: number
    timeSpentSeconds?: number
    is_correct?: boolean | null
  }>
  totalTimeTaken?: number // in seconds
  onJumpToQuestion?: (questionIndex: number) => void
}

export const PacingEfficiencyCard = memo(function PacingEfficiencyCard({
  questionResults = [],
  totalTimeTaken,
  onJumpToQuestion,
}: PacingEfficiencyCardProps) {
  const [showTrapDetails, setShowTrapDetails] = useState(false)

  const analysis = useMemo(() => {
    if (!questionResults || questionResults.length === 0) {
      return null
    }

    const fallbackAvgTime =
      totalTimeTaken && totalTimeTaken > 0
        ? Math.round(totalTimeTaken / questionResults.length)
        : 90

    let totalTimeBanked = 0
    let totalTimeLostTraps = 0
    let totalBenchmark = 0
    let totalActual = 0

    const profiles: QuestionPaceProfile[] = questionResults.map((q, idx) => {
      const qId = q.question_id || q.id || `q-${idx}`
      const diff = q.difficulty
      const type = q.question_type || q.type || 'mcq'
      const marks = q.marks || 1
      const actualTime =
        typeof q.time_spent === 'number'
          ? q.time_spent
          : typeof q.timeSpentSeconds === 'number'
            ? q.timeSpentSeconds
            : fallbackAvgTime
      const bench = calculateBenchmarkSeconds(diff, type, marks)
      const ratio = bench > 0 ? actualTime / bench : 1
      const isCorrect = q.is_correct ?? null

      totalBenchmark += bench
      totalActual += actualTime

      let classification: 'optimal' | 'time_trap' | 'rushed' | 'unattempted' = 'optimal'
      if (actualTime <= 5 && isCorrect === null) {
        classification = 'unattempted'
      } else if (ratio > 1.4 && isCorrect === false) {
        classification = 'time_trap'
        totalTimeLostTraps += Math.max(0, actualTime - bench)
      } else if (ratio < 0.4 && isCorrect === false) {
        classification = 'rushed'
      } else {
        classification = 'optimal'
        if (isCorrect === true && actualTime < bench) {
          totalTimeBanked += bench - actualTime
        }
      }

      return {
        questionId: qId,
        index: idx,
        topic: q.topic || 'General',
        difficulty: diff,
        questionType: type,
        marks,
        timeSpent: actualTime,
        benchmarkTime: bench,
        ratio,
        isCorrect,
        classification,
      }
    })

    const optimalCount = profiles.filter(p => p.classification === 'optimal').length
    const trapProfiles = profiles.filter(p => p.classification === 'time_trap')
    const rushedProfiles = profiles.filter(p => p.classification === 'rushed')

    // Pacing Health Score (0 - 100): Weighted on optimal pacing and penalizing time traps
    const rawEfficiency = Math.round(
      Math.max(
        15,
        Math.min(
          100,
          (optimalCount / profiles.length) * 100 -
            trapProfiles.length * 15 -
            rushedProfiles.length * 8 +
            (totalTimeBanked > 60 ? 10 : 0)
        )
      )
    )

    const avgActual = Math.round(totalActual / profiles.length)
    const avgBench = Math.round(totalBenchmark / profiles.length)

    return {
      profiles,
      trapProfiles,
      rushedProfiles,
      optimalCount,
      pacingScore: rawEfficiency,
      totalTimeBanked,
      totalTimeLostTraps,
      avgActual,
      avgBench,
      totalCount: profiles.length,
    }
  }, [questionResults, totalTimeTaken])

  if (!analysis) return null

  const {
    trapProfiles,
    rushedProfiles,
    optimalCount,
    pacingScore,
    totalTimeBanked,
    totalTimeLostTraps,
    avgActual,
    avgBench,
    totalCount,
  } = analysis

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const scoreTier =
    pacingScore >= 80
      ? {
          label: 'Master Pacer',
          color: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          advice:
            'Remarkable pace discipline! You banked time on strong topics and avoided sinkholes.',
        }
      : pacingScore >= 60
        ? {
            label: 'Balanced Pacer',
            color: 'text-blue-600 dark:text-blue-400',
            badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            advice: 'Good pacing tempo overall, but a few questions drained excessive exam clock.',
          }
        : {
            label: 'Pacing Needs Calibration',
            color: 'text-amber-600 dark:text-amber-400',
            badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            advice: 'High time spent on incorrect questions compromised your end-of-test buffer.',
          }

  return (
    <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900/90 dark:via-gray-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Pacing Efficiency & Time Trap Diagnostic
              </h3>
              <Badge
                className={`${scoreTier.badgeBg} text-[10px] font-bold uppercase tracking-wider`}
              >
                {scoreTier.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Granular telemetry comparing your question-by-question solve speed against empirical
              benchmarks.
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
            Pacing Health Index
          </span>
          <span className={`text-2xl font-black font-mono ${scoreTier.color}`}>
            {pacingScore}
            <span className="text-xs font-normal text-gray-400"> / 100</span>
          </span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {/* Time Banked on Swift Wins */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
            <span>Time Banked (Speed Wins)</span>
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            +{formatMinSec(totalTimeBanked)}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            Saved by solving confident questions faster than benchmark.
          </p>
        </div>

        {/* Time Lost to Traps */}
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300 mb-1">
            <span>Time Lost in Traps</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-300">
            {totalTimeLostTraps > 0 ? `-${formatMinSec(totalTimeLostTraps)}` : '0s'}
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
            Sunk on incorrect questions exceeding 140% of benchmark time.
          </p>
        </div>

        {/* Average Pace vs Benchmark */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
            <span>Average Pace / Question</span>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-300">
            {formatMinSec(avgActual)}{' '}
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              (Target: {formatMinSec(avgBench)})
            </span>
          </div>
          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-1">
            {avgActual <= avgBench ? 'Under benchmark pace.' : 'Over benchmark pace.'}
          </p>
        </div>
      </div>

      {/* Pacing Distribution Proportion Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span>Question Execution Breakdown</span>
          <span className="font-mono text-gray-500">
            {optimalCount} Optimal · {trapProfiles.length} Traps · {rushedProfiles.length} Rushed
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-gray-800 flex overflow-hidden">
          <div
            title={`Optimal / Target Pace: ${optimalCount} questions`}
            style={{ width: `${(optimalCount / totalCount) * 100}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
          />
          <div
            title={`Time Traps: ${trapProfiles.length} questions`}
            style={{ width: `${(trapProfiles.length / totalCount) * 100}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
          />
          <div
            title={`Rushed Guesses: ${rushedProfiles.length} questions`}
            style={{ width: `${(rushedProfiles.length / totalCount) * 100}%` }}
            className="h-full bg-amber-400 transition-all duration-500"
          />
        </div>
      </div>

      {/* Actionable Strategy Tip */}
      <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-start gap-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
        <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-gray-900 dark:text-white block mb-0.5">
            Pacing Strategy Recommendation
          </span>
          {scoreTier.advice}
          {trapProfiles.length > 0 && (
            <span className="block mt-1 text-rose-700 dark:text-rose-300 font-medium">
              💡 Cut losses earlier: Identify unviable problems within 90s, mark for review, and
              preserve energy for reachable questions.
            </span>
          )}
        </div>
      </div>

      {/* Expandable Time Trap Drilldown */}
      {trapProfiles.length > 0 && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTrapDetails(prev => !prev)}
            className="w-full flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Inspect {trapProfiles.length} Identified Time Trap Question(s)</span>
            </span>
            {showTrapDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>

          {showTrapDetails && (
            <div className="mt-3 space-y-2">
              {trapProfiles.map(trap => (
                <div
                  key={trap.questionId}
                  className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                      Q{trap.index + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {trap.topic}
                      </span>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400">
                        Spent {formatMinSec(trap.timeSpent)} (Target:{' '}
                        {formatMinSec(trap.benchmarkTime)}) · {Math.round(trap.ratio * 100)}% of
                        target time
                      </div>
                    </div>
                  </div>

                  {onJumpToQuestion && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onJumpToQuestion(trap.index)}
                      className="text-[11px] px-2.5 py-1 h-auto text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                    >
                      Review
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
})
