import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card } from '../ui/Card'

interface Props {
  data?: Array<{ questionNum: number; timeSec: number; accuracy: number; topic: string }>
}

const DEMO_SCATTER = [
  { questionNum: 1, timeSec: 25, accuracy: 100, topic: 'Big-O Notation' },
  { questionNum: 2, timeSec: 40, accuracy: 100, topic: 'Recurrences' },
  { questionNum: 3, timeSec: 85, accuracy: 100, topic: 'Master Theorem' },
  { questionNum: 4, timeSec: 20, accuracy: 0, topic: 'Array Amortization' }, // Rush error
  { questionNum: 5, timeSec: 110, accuracy: 0, topic: 'Fibonacci Heaps' }, // Knowledge gap
  { questionNum: 6, timeSec: 35, accuracy: 100, topic: 'Binary Heaps' },
  { questionNum: 7, timeSec: 65, accuracy: 100, topic: 'Priority Queues' },
  { questionNum: 8, timeSec: 95, accuracy: 0, topic: 'Dynamic Programming' },
]

export function SpeedAccuracyScatterChart({ data = DEMO_SCATTER }: Props) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
            Speed vs. Accuracy 4-Quadrant Diagnostic
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Identifies mastered concepts, deliberate problem-solving, rush slips, and knowledge gaps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
          <span className="font-black block text-[10px] uppercase">Q1: Mastered</span>
          <span className="text-xs font-semibold">Fast & Accurate</span>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300">
          <span className="font-black block text-[10px] uppercase">Q2: Deliberate</span>
          <span className="text-xs font-semibold">Slow & Accurate</span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
          <span className="font-black block text-[10px] uppercase">Q3: Rush Trap</span>
          <span className="text-xs font-semibold">Fast & Inaccurate</span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300">
          <span className="font-black block text-[10px] uppercase">Q4: Relearn</span>
          <span className="text-xs font-semibold">Slow & Inaccurate</span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
            <XAxis
              type="number"
              dataKey="timeSec"
              name="Time Spent (s)"
              unit="s"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
            />
            <YAxis
              type="number"
              dataKey="accuracy"
              name="Accuracy"
              domain={[-10, 110]}
              ticks={[0, 100]}
              tickFormatter={v => (v === 100 ? 'Correct' : v === 0 ? 'Wrong' : '')}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
            />
            <ReferenceLine x={60} stroke="#94a3b8" strokeDasharray="3 3" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any, name: any) => [
                name === 'Accuracy' ? (val === 100 ? 'Correct' : 'Incorrect') : `${val}s`,
                name,
              ]}
            />
            <Scatter name="Questions" data={data} fill="#6366f1" shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
