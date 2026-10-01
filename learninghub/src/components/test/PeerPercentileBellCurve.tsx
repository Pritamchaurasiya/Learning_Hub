import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Users, Award } from 'lucide-react'
import { Card } from '../ui/Card'

interface Props {
  userScore: number // e.g. 84
  userPercentile?: number // e.g. 92.4
}

// Generate Gaussian Bell Curve Data
function generateBellCurve(userScore: number) {
  const points = []
  const mean = 65
  const stdDev = 15

  for (let x = 20; x <= 100; x += 2) {
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2))
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent) * 1000
    points.push({
      score: x,
      density: Math.round(y * 100) / 100,
      isUser: Math.abs(x - userScore) < 2,
    })
  }
  return points
}

export function PeerPercentileBellCurve({ userScore = 84, userPercentile = 92.4 }: Props) {
  const data = generateBellCurve(userScore)

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Cohort Peer Percentile Benchmark
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Normal distribution curve across 1,250+ students in this assessment cohort
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-black">
          <Award className="w-4 h-4" />
          <span>
            Top {100 - Math.round(userPercentile)}% (Percentile {userPercentile}th)
          </span>
        </div>
      </div>

      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="score"
              unit="%"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any) => [`${val}`, 'Cohort Density']}
            />
            <ReferenceLine
              x={userScore}
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: `You (${userScore}%)`,
                fill: '#6366f1',
                fontSize: 11,
                position: 'top',
              }}
            />
            <Area
              type="monotone"
              dataKey="density"
              stroke="#a855f7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#bellGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
