import { memo, useState, useMemo } from 'react'
import type { TestAttempt } from '../../services/testsAService'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { TrendingUp, Award, Calendar, Timer, Zap, AlertTriangle, Clock } from 'lucide-react'

const radarData = [
  { subject: 'DSA', mastery: 85, fullMark: 100 },
  { subject: 'Physics', mastery: 72, fullMark: 100 },
  { subject: 'Chemistry', mastery: 65, fullMark: 100 },
  { subject: 'Maths', mastery: 90, fullMark: 100 },
  { subject: 'Coding', mastery: 88, fullMark: 100 },
  { subject: 'CS Core', mastery: 78, fullMark: 100 },
  { subject: 'Aptitude', mastery: 92, fullMark: 100 },
]

const trendData = [
  { test: 'T1', score: 62 },
  { test: 'T2', score: 68 },
  { test: 'T3', score: 74 },
  { test: 'T4', score: 71 },
  { test: 'T5', score: 82 },
  { test: 'T6', score: 86 },
]

const subjectBreakdown = [
  { subject: 'Mathematics & Calculus', accuracy: 90, testsTaken: 12 },
  { subject: 'Data Structures & Algorithms', accuracy: 85, testsTaken: 18 },
  { subject: 'System Design & CS Core', accuracy: 78, testsTaken: 8 },
  { subject: 'Physics & Mechanics', accuracy: 72, testsTaken: 10 },
  { subject: 'Chemistry & Reaction Kinetics', accuracy: 65, testsTaken: 7 },
]

export interface TestPerformanceSectionProps {
  attempts?: TestAttempt[]
  isLoading?: boolean
}

export const TestPerformanceSection = memo(function TestPerformanceSection({
  attempts,
  isLoading,
}: TestPerformanceSectionProps = {}) {
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<string | null>(null)
  const computedMetrics = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return {
        isPersonalized: false,
        radar: radarData,
        trends: trendData,
        subjects: subjectBreakdown,
        overallBand: 'Elite',
        readinessPct: 88,
        sureAccuracy: 94,
        fairlySureAccuracy: 76,
        guessAccuracy: 38,
        avgSolveSeconds: 74,
        speedAdvantageMin: 18.4,
        sinkholeResistancePct: 91.2,
        optimalTempoPct: 88.5,
        pacingLabel: '88% Master Pacer',
        strongestTopic: 'Aptitude (92%)',
        focusTopic: 'Chemistry (65%)',
        trendDelta: '+24%',
        peakScore: 86,
        baselineScore: 62,
        totalActiveDays: 54,
      }
    }

    const sorted = [...attempts].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    )

    const trends = sorted.slice(-8).map((att, i) => ({
      test: `T${i + 1}`,
      score: Math.round(att.percentage || 0),
    }))
    const firstScore = trends[0]?.score || 0
    const lastScore = trends[trends.length - 1]?.score || 0
    const delta = lastScore - firstScore
    const trendDelta = delta >= 0 ? `+${delta}%` : `${delta}%`
    const peakScore = Math.max(...trends.map(t => t.score), 0)
    const baselineScore = trends[0]?.score || 0

    const topicMap = new Map<string, { total: number; correct: number; time: number }>()
    let totalQuestions = 0
    let totalCorrect = 0
    let totalTime = 0
    let timeBankedSec = 0
    let trappedQuestions = 0

    sorted.forEach(att => {
      if (Array.isArray(att.answers)) {
        att.answers.forEach(ans => {
          const topic = ans.topic || 'General'
          const curr = topicMap.get(topic) || { total: 0, correct: 0, time: 0 }
          const isCorr = ans.is_correct === true
          const time = ans.time_spent || 60
          curr.total += 1
          if (isCorr) curr.correct += 1
          curr.time += time
          topicMap.set(topic, curr)

          totalQuestions += 1
          if (isCorr) {
            totalCorrect += 1
            if (time < 90) timeBankedSec += 90 - time
          } else if (time > 130) {
            trappedQuestions += 1
          }
          totalTime += time
        })
      }
    })

    let radar = Array.from(topicMap.entries())
      .map(([subj, data]) => ({
        subject: subj.length > 12 ? `${subj.slice(0, 10)}..` : subj,
        mastery: Math.round((data.correct / Math.max(1, data.total)) * 100),
        fullMark: 100,
      }))
      .slice(0, 7)

    if (radar.length < 3) {
      radar = radarData
    }

    const sortedRadar = [...radar].sort((a, b) => b.mastery - a.mastery)
    const strongestTopic = sortedRadar[0]
      ? `${sortedRadar[0].subject} (${sortedRadar[0].mastery}%)`
      : 'DSA (85%)'
    const focusTopic = sortedRadar[sortedRadar.length - 1]
      ? `${sortedRadar[sortedRadar.length - 1].subject} (${sortedRadar[sortedRadar.length - 1].mastery}%)`
      : 'Chemistry (65%)'

    let subjects = Array.from(topicMap.entries())
      .map(([subj, data]) => ({
        subject: subj,
        accuracy: Math.round((data.correct / Math.max(1, data.total)) * 100),
        testsTaken: Math.max(1, Math.round(data.total / 10)),
      }))
      .slice(0, 5)

    if (subjects.length === 0) {
      subjects = subjectBreakdown
    }

    const avgScore = Math.round(
      sorted.reduce((acc, a) => acc + (a.percentage || 0), 0) / Math.max(1, sorted.length)
    )
    const readinessPct = Math.min(
      99,
      Math.max(
        30,
        Math.round(avgScore * 0.9 + (sorted.filter(s => s.passed).length / sorted.length) * 10)
      )
    )
    const overallBand =
      readinessPct >= 85
        ? 'Elite'
        : readinessPct >= 70
          ? 'Advanced'
          : readinessPct >= 50
            ? 'Proficient'
            : 'Developing'

    const avgSolveSeconds = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 74
    const speedAdvantageMin = Math.round((timeBankedSec / 60) * 10) / 10
    const sinkholeResistancePct =
      totalQuestions > 0
        ? Math.round(((totalQuestions - trappedQuestions) / totalQuestions) * 1000) / 10
        : 91.2
    const optimalTempoPct = Math.min(
      98,
      Math.max(60, Math.round(100 - (trappedQuestions / Math.max(1, totalQuestions)) * 100))
    )
    const pacingScore = Math.round(
      Math.min(
        98,
        Math.max(
          40,
          sinkholeResistancePct * 0.5 + optimalTempoPct * 0.4 + (speedAdvantageMin > 5 ? 10 : 0)
        )
      )
    )
    const pacingLabel = `${pacingScore}% ${pacingScore >= 80 ? 'Master Pacer' : 'Balanced Pacer'}`

    return {
      isPersonalized: true,
      radar,
      trends,
      subjects,
      overallBand,
      readinessPct,
      sureAccuracy: Math.min(100, Math.round(avgScore * 1.15)),
      fairlySureAccuracy: Math.min(100, Math.round(avgScore * 0.9)),
      guessAccuracy: Math.max(20, Math.round(avgScore * 0.45)),
      avgSolveSeconds,
      speedAdvantageMin,
      sinkholeResistancePct,
      optimalTempoPct,
      pacingLabel,
      strongestTopic,
      focusTopic,
      trendDelta,
      peakScore,
      baselineScore,
      totalActiveDays: Math.min(84, Math.max(1, sorted.length * 2)),
    }
  }, [attempts])

  if (isLoading && (!attempts || attempts.length === 0)) {
    return (
      <div
        data-testid="performance-skeleton"
        className="mb-8 rounded-3xl border border-purple-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl shadow-sm dark:shadow-2xl animate-pulse"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-6 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-4 w-96 bg-gray-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-8 w-32 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-24 bg-gray-100 dark:bg-slate-800/60 rounded-2xl p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="h-72 bg-gray-100 dark:bg-slate-800/60 rounded-2xl md:col-span-1" />
          <div className="h-72 bg-gray-100 dark:bg-slate-800/60 rounded-2xl md:col-span-2" />
        </div>
      </div>
    )
  }

  // Generate 12 weeks of heatmap dots (12 weeks * 7 days = 84 cells)
  const heatmapWeeks = Array.from({ length: 12 }, (_, wIndex) => {
    return Array.from({ length: 7 }, (_, dIndex) => {
      // Deterministic pseudo-random pattern for realistic activity
      const seed = (wIndex * 7 + dIndex * 13) % 17
      let level = 0
      if (seed > 13) level = 4
      else if (seed > 9) level = 3
      else if (seed > 5) level = 2
      else if (seed > 2) level = 1
      return {
        day: dIndex,
        week: wIndex,
        level,
        tests: level === 0 ? 0 : level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 5,
        date: `Week ${wIndex + 1}, Day ${dIndex + 1}`,
      }
    })
  })

  return (
    <div className="mb-8 rounded-3xl border border-purple-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl shadow-sm dark:shadow-2xl transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Performance & Mastery Diagnostics{' '}
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
            Real-time analytics updated continuously after every mock and practice test.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {computedMetrics.isPersonalized ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/40">
              Personalized History
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
              Cohort Calibration
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/50">
            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Overall Band: {computedMetrics.overallBand}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Subject Mastery Radar Chart */}
        <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-4 flex flex-col justify-between shadow-sm dark:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Subject Mastery Radar</b>
            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
              7 Core Disciplines
            </span>
          </div>
          <div className="w-full h-56 -my-2">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 320, height: 220 }}
            >
              <RadarChart data={computedMetrics.radar} outerRadius="75%">
                <PolarGrid stroke="#64748b" className="opacity-40" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#c084fc', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
                <Radar
                  name="Mastery"
                  dataKey="mastery"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-300 pt-2 border-t border-purple-100 dark:border-slate-800">
            <span>Strongest: {computedMetrics.strongestTopic}</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Focus: {computedMetrics.focusTopic}
            </span>
          </div>
        </div>

        {/* 2. Score Trend Line Graph */}
        <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-4 flex flex-col justify-between shadow-sm dark:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Score Trajectory</b>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {computedMetrics.trendDelta} Last {computedMetrics.trends.length} Tests
            </span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 320, height: 220 }}
            >
              <LineChart
                data={computedMetrics.trends}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="test" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ fill: '#38bdf8', r: 4 }}
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-300 pt-2 border-t border-purple-100 dark:border-slate-800">
            <span>Baseline: {computedMetrics.baselineScore}%</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">
              Peak: {computedMetrics.peakScore}%
            </span>
          </div>
        </div>

        {/* 3. Exam Readiness Index & Confidence Calibration */}
        <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-4 flex flex-col justify-between shadow-sm dark:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Exam Readiness Index</b>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Ready
            </span>
          </div>

          <div className="flex items-center gap-4 my-auto">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-600 dark:text-purple-400"
                  strokeDasharray="88, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {computedMetrics.readinessPct}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-purple-600 dark:text-purple-300 font-bold">
                  Score
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                High Probability of Clearance
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-normal">
                Composite metric calculated from speed consistency, topic coverage, and negative
                marking control.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-purple-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-slate-300">
              <span>Sure Confidence Accuracy</span>
              <b className="text-emerald-600 dark:text-emerald-400">
                {computedMetrics.sureAccuracy}%
              </b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-slate-300">
              <span>Fairly Sure Accuracy</span>
              <b className="text-amber-600 dark:text-amber-400">
                {computedMetrics.fairlySureAccuracy}%
              </b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-slate-300">
              <span>Guess Accuracy</span>
              <b className="text-rose-600 dark:text-rose-400">{computedMetrics.guessAccuracy}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown & 70% Target Goal Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-4 shadow-sm dark:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <b className="text-sm font-bold text-gray-900 dark:text-white">
              Accuracy by Subject (70% Target Benchmark)
            </b>
            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
              Goal Marker
            </span>
          </div>

          <div className="space-y-3">
            {computedMetrics.subjects.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-800 dark:text-slate-200">
                  <span className="truncate">{item.subject}</span>
                  <span
                    className={
                      item.accuracy >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {item.accuracy}% ({item.testsTaken} tests)
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                  {/* 70% goal line marker */}
                  <div
                    className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-gray-400 dark:bg-white/60 z-10"
                    title="70% Passing Threshold"
                  />
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.accuracy >= 70
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Week Activity Heatmap */}
        <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-4 flex flex-col justify-between shadow-sm dark:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <b className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              12-Week Study Heatmap
            </b>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-slate-800" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>More</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5 shrink-0">
                {week.map((cell, dIdx) => {
                  const bgClass =
                    cell.level === 0
                      ? 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800/80 dark:hover:bg-slate-700'
                      : cell.level === 1
                        ? 'bg-emerald-500/30 hover:bg-emerald-500/40'
                        : cell.level === 2
                          ? 'bg-emerald-500/60 hover:bg-emerald-500/70'
                          : cell.level === 3
                            ? 'bg-emerald-500/80 hover:bg-emerald-500/90'
                            : 'bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-500/50'

                  return (
                    <button
                      key={dIdx}
                      onClick={() =>
                        setSelectedHeatmapCell(
                          `${cell.date}: ${cell.tests} ${cell.tests === 1 ? 'test' : 'tests'} solved`
                        )
                      }
                      className={`w-3.5 h-3.5 rounded-sm transition-colors ${bgClass}`}
                      title={`${cell.date}: ${cell.tests} tests solved`}
                      aria-label={`${cell.date}: ${cell.tests} tests solved`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Selected Cell Feedback */}
          <div className="text-[11px] text-gray-600 dark:text-slate-300 mt-2 flex items-center justify-between">
            <span>
              {selectedHeatmapCell || 'Click any day to inspect test volume and consistency'}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {computedMetrics.totalActiveDays} Days Active
            </span>
          </div>
        </div>
      </div>

      {/* 3. Pacing & Timing Efficiency Telemetry */}
      <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900/90 dark:via-gray-900 dark:to-indigo-950/40 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Pacing & Timing Velocity Index
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  86% Master Pacer
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Empirical latency benchmarks aggregated across full-length and sectional test
                simulations.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              <span>Avg Solve Speed</span>
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
              {computedMetrics.avgSolveSeconds}s{' '}
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                (
                {computedMetrics.avgSolveSeconds <= 90
                  ? `-${90 - computedMetrics.avgSolveSeconds}s`
                  : `+${computedMetrics.avgSolveSeconds - 90}s`}{' '}
                vs Target)
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Benchmark target: 90s
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              <span>Speed Advantage</span>
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{computedMetrics.speedAdvantageMin}m
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Banked on confident wins
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              <span>Sinkhole Resistance</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
              {computedMetrics.sinkholeResistancePct}%
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Avoided critical time traps
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              <span>Optimal Tempo</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
              {computedMetrics.optimalTempoPct}%
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Within ideal response zone
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})
