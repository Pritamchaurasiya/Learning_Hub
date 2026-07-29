import { memo, useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Brain, Zap } from 'lucide-react'

export interface CognitiveMetric {
  dimension: string
  score: number // 0 - 100
  benchmark: number // 0 - 100
  fullMark: number
}

interface CognitiveRadarChartProps {
  metrics?: CognitiveMetric[]
  className?: string
}

const DEFAULT_METRICS: CognitiveMetric[] = [
  { dimension: 'Memory Stability', score: 85, benchmark: 70, fullMark: 100 },
  { dimension: 'Conceptual Depth', score: 78, benchmark: 65, fullMark: 100 },
  { dimension: 'Speed & Precision', score: 92, benchmark: 75, fullMark: 100 },
  { dimension: 'Problem Solving', score: 80, benchmark: 70, fullMark: 100 },
  { dimension: 'Retention Index', score: 88, benchmark: 68, fullMark: 100 },
  { dimension: 'Consistency', score: 95, benchmark: 80, fullMark: 100 },
]

export const CognitiveRadarChart = memo(function CognitiveRadarChart({
  metrics,
  className = '',
}: CognitiveRadarChartProps) {
  const chartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return DEFAULT_METRICS
    return metrics
  }, [metrics])

  const overallCognitiveScore = useMemo(() => {
    const total = chartData.reduce((acc, m) => acc + m.score, 0)
    return Math.round(total / chartData.length)
  }, [chartData])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-black tracking-wide uppercase text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            Cognitive Profile Radar
          </h4>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
            SuperMemo SM-2 & IRT multi-dimensional evaluation
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40">
          <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
            {overallCognitiveScore}% Index
          </span>
        </div>
      </div>

      {/* Radar Graphic */}
      <div className="w-full flex-1 min-h-[260px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" opacity={0.3} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickCount={5}
            />
            <Radar
              name="Benchmark Level"
              dataKey="benchmark"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="#94a3b8"
              fillOpacity={0.1}
            />
            <Radar
              name="Cognitive Score"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="#6366f1"
              fillOpacity={0.35}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as CognitiveMetric
                  return (
                    <div className="p-3 bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 rounded-xl space-y-1">
                      <p className="text-xs font-black text-gray-900 dark:text-white">
                        {data.dimension}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          Score: {data.score}%
                        </span>
                        <span className="text-gray-400">Target: {data.benchmark}%</span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Indicators */}
      <div className="flex items-center justify-around pt-3 border-t border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Learner Mastery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span>Peer Benchmark</span>
        </div>
      </div>
    </div>
  )
})

export default CognitiveRadarChart
