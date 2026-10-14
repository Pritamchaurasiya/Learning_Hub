import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card } from '../ui/Card'

interface Props {
  data: Array<{ date: string; accuracy: number; testsCompleted: number }>
}

export function WeeklyStudyAreaChart({ data }: Props) {
  const trendChange =
    data.length >= 2
      ? Math.round((data[data.length - 1].accuracy - data[0].accuracy) * 10) / 10
      : null

  return (
    <Card className="p-6 space-y-4" data-testid="weekly-accuracy-chart">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Weekly Accuracy Trend
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Accuracy across completed assessments
            </p>
          </div>
        </div>
        {trendChange !== null && (
          <div
            className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
              trendChange >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            }`}
            aria-label={`Accuracy changed by ${trendChange} percentage points over this period`}
          >
            {trendChange >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)} pp this period</span>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 px-6 py-8 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            Your trend starts with your first completed assessment
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Once you complete practice tests, this chart will show how your accuracy changes over time.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full pt-2" role="img" aria-label="Line chart showing accuracy across completed assessments">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: number | string) => [`${value}%`, 'Accuracy']}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#accuracyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
