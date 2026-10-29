import { memo, useState } from 'react'
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
import { TrendingUp, Award, Calendar } from 'lucide-react'

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

export const TestPerformanceSection = memo(function TestPerformanceSection() {
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<string | null>(null)

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
    <div className="mb-8 rounded-3xl border border-purple-100 dark:border-white/10 bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-900/70 dark:to-indigo-950/30 p-6 md:p-8 backdrop-blur-xl shadow-sm dark:shadow-2xl transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Performance & Mastery Diagnostics <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Real-time analytics updated continuously after every mock and practice test.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Overall Band: Elite
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Subject Mastery Radar Chart */}
        <div className="rounded-2xl border border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Subject Mastery Radar</b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">7 Core Disciplines</span>
          </div>
          <div className="w-full h-56 -my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#cbd5e1" className="dark:opacity-30" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#7c3aed', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
                <Radar
                  name="Mastery"
                  dataKey="mastery"
                  stroke="#7c3aed"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 pt-2 border-t border-purple-100 dark:border-white/10">
            <span>Strongest: Aptitude (92%)</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">Focus: Chemistry (65%)</span>
          </div>
        </div>

        {/* 2. Score Trend Line Graph */}
        <div className="rounded-2xl border border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Score Trajectory</b>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">+24% Last 6 Tests</span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="test" stroke="#64748b" fontSize={11} />
                <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ fill: '#0284c7', r: 4 }}
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 pt-2 border-t border-purple-100 dark:border-white/10">
            <span>Baseline: 62%</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">Peak: 86%</span>
          </div>
        </div>

        {/* 3. Exam Readiness Index & Confidence Calibration */}
        <div className="rounded-2xl border border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <b className="text-sm font-bold text-gray-900 dark:text-white">Exam Readiness Index</b>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>

          <div className="flex items-center gap-4 my-auto">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200 dark:text-white/10"
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
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">88%</span>
                <span className="text-[9px] uppercase tracking-wider text-purple-600 dark:text-purple-300 font-bold">
                  Score
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">High Probability of Clearance</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Composite metric calculated from speed consistency, topic coverage, and negative
                marking control.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-purple-100 dark:border-white/10 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Sure Confidence Accuracy</span>
              <b className="text-emerald-600 dark:text-emerald-400">94%</b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Fairly Sure Accuracy</span>
              <b className="text-amber-600 dark:text-amber-400">76%</b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Guess Accuracy</span>
              <b className="text-rose-600 dark:text-rose-400">38%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown & 70% Target Goal Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <b className="text-sm font-bold text-gray-900 dark:text-white">
              Accuracy by Subject (70% Target Benchmark)
            </b>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Goal Marker</span>
          </div>

          <div className="space-y-3">
            {subjectBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <span className="truncate">{item.subject}</span>
                  <span className={item.accuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                    {item.accuracy}% ({item.testsTaken} tests)
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
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
        <div className="rounded-2xl border border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <b className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              12-Week Study Heatmap
            </b>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-white/10" />
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
                      ? 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20'
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
          <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-2 flex items-center justify-between">
            <span>
              {selectedHeatmapCell || 'Click any day to inspect test volume and consistency'}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">54 Days Active</span>
          </div>
        </div>
      </div>
    </div>
  )
})
