import { useState, useMemo } from 'react'
import {
  Award,
  TrendingDown,
  Sparkles,
  BookMarked,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Loader2,
  Trophy,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { revisionService } from '../../services/revisionService'
import { playRewardChime } from '../../utils/soundEffects'
import { triggerHaptic } from '../../utils/haptics'
import { useToast } from '../ui/Toast'
import type { TestResult } from '../../services/testsAService'

interface CompetitiveScoringBreakdownCardProps {
  result: TestResult
}

// Standard Normal Cumulative Distribution Function approximation
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if (z > 0) p = 1 - p
  return p
}

export function CompetitiveScoringBreakdownCard({ result }: CompetitiveScoringBreakdownCardProps) {
  const { addToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [hasExported, setHasExported] = useState(false)

  const correctCount = result.correct_count ?? 0
  const incorrectCount = result.incorrect_count ?? 0
  const unansweredCount = result.unanswered_count ?? 0
  const totalQuestions =
    correctCount + incorrectCount + unansweredCount > 0
      ? correctCount + incorrectCount + unansweredCount
      : (result.question_results?.length ?? 1)

  // NTA standard marking (+4 / -1)
  const grossMarks = correctCount * 4
  const negativePenalty = incorrectCount * 1
  const netScore = Math.max(0, grossMarks - negativePenalty)
  const maxPossibleMarks = totalQuestions * 4
  const netScorePercentage = maxPossibleMarks > 0 ? (netScore / maxPossibleMarks) * 100 : 0

  // Penalty drag: percentage of positive marks erased by incorrect guesses
  const penaltyDrag =
    grossMarks > 0 ? Math.round((negativePenalty / grossMarks) * 100) : 0

  // Predictive NTA Percentile Modeling (calibrated to historical distribution)
  const predictiveMetrics = useMemo(() => {
    const normalizedScore = netScorePercentage / 100
    // Historical NTA mean ~0.34, standard deviation ~0.17
    const z = (normalizedScore - 0.34) / 0.17
    const cdfValue = normalCDF(z)
    const percentile = Math.min(99.98, Math.max(1.0, Math.round(cdfValue * 10000) / 100))

    // Projected AIR among 1,200,000 national candidates
    const estimatedAir = Math.max(
      1,
      Math.round((1 - percentile / 100) * 1200000)
    )

    let tierLabel = 'Developing Foundation'
    let tierColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30'

    if (percentile >= 99.5) {
      tierLabel = 'Top 0.5% • IIT Top Branches'
      tierColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    } else if (percentile >= 98.0) {
      tierLabel = 'Top 2% • Top NIT CSE / State Merit'
      tierColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    } else if (percentile >= 90.0) {
      tierLabel = 'Top 10% • Tier 1 Core Branches'
      tierColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
    }

    return {
      percentile,
      estimatedAir,
      tierLabel,
      tierColor,
    }
  }, [netScorePercentage])

  // Collect wrong questions for 1-click revision deck export
  const incorrectQuestions = useMemo(() => {
    if (!result.question_results) return []
    return result.question_results.filter(q => q.is_correct === false)
  }, [result.question_results])

  const handleExportMistakesToFlashcards = async () => {
    if (incorrectQuestions.length === 0 || isExporting || hasExported) return

    setIsExporting(true)
    try {
      let createdCount = 0
      for (const q of incorrectQuestions) {
        const correctText =
          q.correct_options && q.correct_options.length > 0
            ? q.correct_options.map(o => o.text).join(', ')
            : 'Review concept explanation'

        await revisionService.createCustomCard({
          front: q.question_text,
          back: correctText,
          explanation: q.explanation || 'Analyzed from competitive test error remediation.',
          topic: q.topic || 'Exam Remediation',
          card_type: 'MISTAKE',
        })
        createdCount++
      }

      setHasExported(true)
      playRewardChime('quest-complete')
      triggerHaptic('success')
      addToast(
        `Successfully exported ${createdCount} mistake flashcards to Spaced Revision Hub!`,
        'success'
      )
    } catch {
      addToast('Failed to export flashcards. Please try again.', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-slate-800 text-white shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                NTA CBT Marking & Rank Calibration
              </h3>
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                +4 / -1 Scheme
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Official competitive scoring formula with negative marking penalty and projected All India Rank
            </p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-center ${predictiveMetrics.tierColor}`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{predictiveMetrics.tierLabel}</span>
        </div>
      </div>

      {/* Grid: 4 Scoring Telemetry Modules */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Gross Score
          </span>
          <div className="text-2xl font-black font-mono text-white">
            +{grossMarks}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {correctCount} &times; 4 marks
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
              Negative Penalty
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            -{negativePenalty}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {incorrectCount} &times; 1 mark lost
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Net Score
          </span>
          <div className="text-2xl font-black font-mono text-amber-400">
            {netScore} <span className="text-xs text-slate-500 font-normal">/ {maxPossibleMarks}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {netScorePercentage.toFixed(1)}% Normalized
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
              Projected AIR
            </span>
            <Award className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">
            ~{predictiveMetrics.estimatedAir.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {predictiveMetrics.percentile}th %ile (of 1.2M)
          </span>
        </div>
      </div>

      {/* Penalty Drag & Flashcard Sync Action Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              Guessing Penalty Drag: {penaltyDrag}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {penaltyDrag > 15
              ? `High penalty drag. Reckless guesswork erased ${negativePenalty} marks (${penaltyDrag}% of your gross score). Focus on selective skipping.`
              : 'Controlled guesswork. Low penalty drag indicates disciplined exam strategy.'}
          </p>
        </div>

        {incorrectQuestions.length > 0 && (
          <Button
            onClick={handleExportMistakesToFlashcards}
            disabled={isExporting || hasExported}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl transition ${
              hasExported
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 active:scale-95'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Flashcards...</span>
              </>
            ) : hasExported ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exported to Spaced Revision Hub</span>
              </>
            ) : (
              <>
                <BookMarked className="w-3.5 h-3.5" />
                <span>Export {incorrectQuestions.length} Mistakes to Flashcards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
