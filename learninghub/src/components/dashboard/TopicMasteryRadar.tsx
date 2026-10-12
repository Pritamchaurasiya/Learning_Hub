import { useMemo } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '../ui/Card'

interface TopicMastery {
  topicName: string
  accuracy: number
  totalAttempts: number
}

interface Props {
  topicMastery: Record<string, TopicMastery>
}

export function TopicMasteryRadar({ topicMastery }: Props) {
  const chartData = useMemo(() => {
    return Object.entries(topicMastery).map(([key, val]) => ({
      topic: val.topicName || key,
      accuracy: val.accuracy,
      attempts: val.totalAttempts,
      fullMark: 100,
    }))
  }, [topicMastery])

  const weakTopics = useMemo(() => {
    return chartData.filter(d => d.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy)
  }, [chartData])

  const strongTopics = useMemo(() => {
    return chartData.filter(d => d.accuracy >= 85).sort((a, b) => b.accuracy - a.accuracy)
  }, [chartData])

  const avgAccuracy = useMemo(() => {
    if (chartData.length === 0) return 0
    return Math.round(chartData.reduce((sum, d) => sum + d.accuracy, 0) / chartData.length)
  }, [chartData])

  if (chartData.length === 0) return null

  return (
    <Card className="p-6 space-y-4" data-testid="topic-mastery-radar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Topic Mastery Radar
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Competency distribution across studied domains
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-bold tabular-nums">
          {avgAccuracy}% avg
        </div>
      </div>

      {/* Radar Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            <PolarGrid stroke="rgba(150,150,150,0.15)" />
            <PolarAngleAxis
              dataKey="topic"
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            />
            <Radar
              name="Accuracy"
              dataKey="accuracy"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight pills */}
      <div className="space-y-2">
        {weakTopics.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Needs Attention: </span>
              {weakTopics.map(t => `${t.topic} (${t.accuracy}%)`).join(', ')}
            </div>
          </div>
        )}
        {strongTopics.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Strong: </span>
              {strongTopics.map(t => `${t.topic} (${t.accuracy}%)`).join(', ')}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
