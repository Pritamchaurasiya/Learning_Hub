import { memo, useMemo } from 'react'
import {
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Building2,
  Compass,
  AlertCircle,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import {
  calculateShiftPercentileLocally,
  OFFICIAL_HISTORICAL_BENCHMARKS,
  type ShiftBenchmark,
} from '../../services/pyqData'
import type { TestResult } from '../../services/testsAService'

export interface HistoricalShiftBenchmarkCardProps {
  result: TestResult
  onReattemptMistakes?: () => void
}

/**
 * Resolves the matching official benchmark key for a given test result.
 */
function resolveBenchmarkKey(result: TestResult): string | null {
  const tId = (result.test_id || '').toLowerCase()
  const title = (result.test_title || '').toLowerCase()

  if (tId.includes('jan27-s1') || (title.includes('27') && title.includes('jan') && title.includes('shift 1'))) {
    return 'jee-main-2024-jan-27-s1'
  }
  if (tId.includes('apr05-s1') || (title.includes('05') && title.includes('apr') && title.includes('shift 1'))) {
    return 'jee-main-2024-apr-05-s1'
  }
  if (tId.includes('neet-ug-2024') || title.includes('neet ug 2024') || title.includes('neet 2024')) {
    return 'neet-ug-2024-code-q'
  }
  if (tId.includes('gate-cs-2024') || title.includes('gate') && title.includes('2024')) {
    return 'gate-cs-2024-official'
  }
  if (tId.includes('upsc-prelims-2023') || (title.includes('upsc') && title.includes('2023'))) {
    return 'upsc-prelims-2023-gs1'
  }
  if (tId.includes('ssc-cgl-2024') || (title.includes('ssc') && title.includes('2024'))) {
    return 'ssc-cgl-2024-tier1'
  }

  // Check known keys directly
  for (const key of Object.keys(OFFICIAL_HISTORICAL_BENCHMARKS)) {
    if (tId.includes(key)) return key
  }

  // If title mentions competitive exams, default to JEE Main S1 benchmark
  if (title.includes('jee main') || title.includes('jee')) {
    return 'jee-main-2024-jan-27-s1'
  }
  if (title.includes('neet')) {
    return 'neet-ug-2024-code-q'
  }
  if (title.includes('gate')) {
    return 'gate-cs-2024-official'
  }
  if (title.includes('upsc')) {
    return 'upsc-prelims-2023-gs1'
  }
  if (title.includes('ssc')) {
    return 'ssc-cgl-2024-tier1'
  }

  return null
}

export const HistoricalShiftBenchmarkCard = memo(function HistoricalShiftBenchmarkCard({
  result,
  onReattemptMistakes,
}: HistoricalShiftBenchmarkCardProps) {
  const benchmarkKey = useMemo(() => resolveBenchmarkKey(result), [result])
  const benchmark: ShiftBenchmark | null = benchmarkKey
    ? OFFICIAL_HISTORICAL_BENCHMARKS[benchmarkKey] ?? null
    : null

  const prediction = useMemo(() => {
    if (!benchmarkKey) return null
    const rawScore = result.score ?? 0
    return calculateShiftPercentileLocally(rawScore, benchmarkKey)
  }, [benchmarkKey, result.score])

  if (!benchmark || !prediction) {
    return null
  }

  const rawScore = Math.round((result.score ?? 0) * 10) / 10
  const totalMarks = benchmark.totalMarks || result.total_marks || 300

  // Category cutoff statuses
  const cutoffs = benchmark.categoryCutoffs
  const categoryList = [
    { label: 'General (UR)', score: cutoffs.general, cleared: rawScore >= cutoffs.general },
    { label: 'OBC-NCL', score: cutoffs.obc, cleared: rawScore >= cutoffs.obc },
    { label: 'GEN-EWS', score: cutoffs.ews, cleared: rawScore >= cutoffs.ews },
    { label: 'SC', score: cutoffs.sc, cleared: rawScore >= cutoffs.sc },
    { label: 'ST', score: cutoffs.st, cleared: rawScore >= cutoffs.st },
  ]

  return (
    <Card className="overflow-hidden border border-blue-500/30 bg-gradient-to-br from-slate-900 via-blue-950/30 to-indigo-950/40 text-white shadow-xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-b border-blue-500/20 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Official Shift Percentile & AIR Calibration
              </h3>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] uppercase font-bold">
                {benchmark.difficultyRating} Shift
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Calibrated against official historical NTA / Examination Board shift results: <strong>{benchmark.shift}</strong>
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full">
          Historical Shift Benchmark
        </span>
      </div>

      {/* Main Stats Grid: Percentile, AIR, Score, Cutoff */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Shift Percentile */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Shift Percentile
            </span>
            <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
              {prediction.percentile.toFixed(2)} %ile
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Higher than {prediction.percentile.toFixed(1)}% test-takers
            </span>
          </div>

          {/* Estimated All India Rank (AIR) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Estimated AIR Range
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              ~{prediction.estimatedAir.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Based on total cohort size
            </span>
          </div>

          {/* Raw Score */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Raw Shift Score
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {rawScore} <span className="text-xs text-slate-400 font-normal">/ {totalMarks}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {Math.round((rawScore / totalMarks) * 100)}% marks obtained
            </span>
          </div>

          {/* General Cutoff Qualification */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              General Cutoff
            </span>
            <div className={`text-xl sm:text-2xl font-black flex items-center justify-center gap-1.5 ${
              prediction.clearedCutoff ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {prediction.clearedCutoff ? (
                <>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Qualified</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>Not Met</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cutoff: {cutoffs.general} marks
            </span>
          </div>
        </div>

        {/* Shift Insights & Analysis */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>Shift Intelligence & Normalization Summary:</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {benchmark.shiftDifficultySummary} {prediction.summary}
          </p>
        </div>

        {/* Category-Wise Cutoff Breakdown Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Official Category-Wise Qualifying Benchmarks</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Your Score: <strong className="text-white font-mono">{rawScore}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {categoryList.map(cat => (
              <div
                key={cat.label}
                className={`p-3 rounded-lg border text-center transition-all ${
                  cat.cleared
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-300 mb-0.5">{cat.label}</div>
                <div className="text-xs font-mono font-bold">Cutoff: {cat.score}</div>
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold">
                  {cat.cleared ? (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Qualified
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> Short by {(cat.score - rawScore).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* College / Institution Feasibility Recommendations */}
        {prediction.targetCollegeTiers && prediction.targetCollegeTiers.length > 0 && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Target College / Branch Feasibility:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {prediction.targetCollegeTiers.map(tier => (
                <span
                  key={tier}
                  className="px-2.5 py-1 rounded-md bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 text-xs font-medium"
                >
                  {tier}
                </span>
              ))}
            </div>
          </div>
        )}
              {onReattemptMistakes && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onReattemptMistakes}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <span>Launch 1-Click Mistake Re-Attempt Drill</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  )
})
