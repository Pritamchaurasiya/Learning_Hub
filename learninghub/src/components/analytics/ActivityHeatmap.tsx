import { memo } from 'react'
import { motion } from 'framer-motion'

interface ActivityDay {
  date: string
  level: 0 | 1 | 2 | 3 | 4 // 0 = no activity, 4 = high activity
}

interface ActivityHeatmapProps {
  data: ActivityDay[]
  weeks?: number
}

const levelColors = {
  0: 'bg-gray-100 dark:bg-gray-800',
  1: 'bg-primary-200 dark:bg-primary-900/30',
  2: 'bg-primary-400 dark:bg-primary-700/50',
  3: 'bg-primary-600 dark:bg-primary-600',
  4: 'bg-primary-800 dark:bg-primary-400',
}

const levelLabels = {
  0: 'No activity',
  1: 'Light activity',
  2: 'Moderate activity',
  3: 'High activity',
  4: 'Very high activity',
}

export const ActivityHeatmap = memo(function ActivityHeatmap({
  data,
  weeks = 12,
}: ActivityHeatmapProps) {
  // Group data by weeks
  const weeks_data = []
  const daysPerWeek = 7
  for (let i = 0; i < weeks; i++) {
    const weekData = data.slice(i * daysPerWeek, (i + 1) * daysPerWeek)
    weeks_data.push(weekData)
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {/* Week labels */}
        <div className="flex flex-col gap-1 pt-6">
          {weekDays.map((day, idx) => (
            <div key={day} className="h-4 text-xs text-gray-400 w-8 text-right pr-2">
              {idx % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Activity grid */}
        <div className="flex gap-1">
          {weeks_data.map((week, weekIdx) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <motion.div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${weekIdx}-${dayIdx}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (weekIdx * 7 + dayIdx) * 0.005 }}
                  className={`w-4 h-4 rounded-sm ${levelColors[day?.level || 0]} hover:ring-2 hover:ring-primary-500/50 cursor-pointer transition-all`}
                  title={`${day?.date || ''}: ${levelLabels[day?.level || 0]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${levelColors[level as keyof typeof levelColors]}`}
            title={levelLabels[level as keyof typeof levelLabels]}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
})

export default ActivityHeatmap
