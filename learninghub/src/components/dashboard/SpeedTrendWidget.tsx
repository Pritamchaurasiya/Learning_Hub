import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Zap, TrendingDown } from 'lucide-react'
import { Card } from '../ui/Card'

interface SpeedDataPoint {
  date: string
  avgTimePerQuestion: number
  questionsAnswered: number
}

interface Props {
  data: SpeedDataPoint[]
}

export function SpeedTrendWidget({ data }: Props) {
  const improvement = useMemo(() => {
    if (data.length < 2) return null
    const first = data[0].avgTimePerQuestion
    const last = data[data.length - 1].avgTimePerQuestion
    const delta = first - last
    const pct = Math.round((delta / first) * 100)
    return { delta, pct, improved: delta > 0 }
  }, [data])

  const totalAnswered = useMemo(() => {
    return data.reduce((sum, d) => sum + d.questionsAnswered, 0)
  }, [data])

  if (data.length === 0) return null

  return (
    <Card className="p-5 space-y-3" data-testid="speed-trend-widget">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-gray-900 dark:text-white">
              Solving Speed
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Avg seconds per question
            </p>
          </div>
        </div>
        {improvement && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
              improvement.improved
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
            }`}
          >
            {improvement.improved ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            <span>
              {improvement.improved ? '-' : '+'}
              {Math.abs(improvement.pct)}%
            </span>
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              reversed
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '11px',
              }}
              formatter={(((val: any) => [`${val}s`, 'Avg Time']) as any)}
            />
            <Area
              type="monotone"
              dataKey="avgTimePerQuestion"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#speedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{totalAnswered} questions answered this week</span>
        <span className="font-mono font-bold text-gray-600 dark:text-gray-300">
          {data[data.length - 1]?.avgTimePerQuestion ?? '—'}s latest
        </span>
      </div>
    </Card>
  )
}
