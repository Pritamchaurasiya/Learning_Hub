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
import { TrendingUp, Activity, ArrowRight, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'

interface Props {
  data: Array<{ date: string; accuracy: number; testsCompleted: number }>
}

export function WeeklyStudyAreaChart({ data }: Props) {
  const navigate = useNavigate()

  const hasData = useMemo(() => {
    return Boolean(
      data &&
      data.length > 0 &&
      data.some(d => (d.testsCompleted ?? 0) > 0 || (d.accuracy ?? 0) > 0)
    )
  }, [data])

  const { deltaString, isPositive } = useMemo(() => {
    if (!hasData || !data || data.length === 0) {
      return { deltaString: null, isPositive: true }
    }

    const validPoints = data.filter(d => (d.accuracy ?? 0) > 0)
    if (validPoints.length === 0) {
      return { deltaString: null, isPositive: true }
    }

    if (validPoints.length >= 2) {
      const first = validPoints[0].accuracy
      const last = validPoints[validPoints.length - 1].accuracy
      const delta = Math.round(last - first)
      const isPos = delta >= 0
      return {
        deltaString: `${isPos ? '+' : ''}${delta}% across session window`,
        isPositive: isPos,
      }
    }

    return { deltaString: null, isPositive: true }
  }, [data, hasData])

  return (
    <Card className="p-6 space-y-4 gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-black text-sm text-gray-900 dark:text-white">
              7-Day Accuracy & Mastery Trajectory
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Chronological accuracy trend across recent tests
            </p>
          </div>
        </div>

        {deltaString && (
          <div
            className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isPositive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{deltaString}</span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-gray-50/50 dark:bg-slate-950/40 border border-dashed border-gray-200 dark:border-slate-800 space-y-3">
          <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
            <Award className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              No performance history recorded yet
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              Complete your first practice test or diagnostic assessment to view your weekly
              performance trajectory and topic breakdown.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tests-a')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            <span>Start Practice Test</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="h-56 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(150,150,150,0.15)"
              />
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [`${val}%`, 'Accuracy']}
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
