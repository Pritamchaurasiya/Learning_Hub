import { memo } from 'react'
import { Flame, CheckCircle2, Award, Zap, Target } from 'lucide-react'

export interface TestGamificationStripProps {
  streakDays?: number
  weeklyGoalCompleted?: number
  weeklyGoalTotal?: number
  accuracyRate?: number
}

export const TestGamificationStrip = memo(function TestGamificationStrip({
  streakDays = 7,
  weeklyGoalCompleted = 4,
  weeklyGoalTotal = 5,
  accuracyRate = 84,
}: TestGamificationStripProps) {
  const days = [
    { label: 'M', active: true },
    { label: 'T', active: true },
    { label: 'W', active: true },
    { label: 'T', active: true },
    { label: 'F', active: true },
    { label: 'S', active: true },
    { label: 'S', active: true, today: true },
  ]

  const badges = [
    { name: 'Speed Demon', icon: Zap, unlocked: true, color: 'from-amber-400 to-orange-500' },
    { name: 'Accuracy Ace', icon: Target, unlocked: true, color: 'from-emerald-400 to-teal-500' },
    { name: 'Streak King', icon: Flame, unlocked: true, color: 'from-purple-400 to-indigo-500' },
    { name: 'Exam Master', icon: Award, unlocked: true, color: 'from-blue-400 to-cyan-500' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Day Streak Tile */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <b className="text-sm font-bold text-white">{streakDays}-Day Streak</b>
            <span className="text-[11px] font-bold text-orange-400">🔥 On Fire</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {days.map((d, i) => (
              <span
                key={i}
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${
                  d.active
                    ? 'bg-orange-500 text-slate-950 shadow-sm shadow-orange-500/30'
                    : 'bg-white/10 text-gray-400'
                } ${d.today ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900' : ''}`}
                title={`Day ${d.label}`}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Weekly Test Goal */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
          <Target className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <b className="text-sm font-bold text-white">Weekly Target</b>
            <span className="text-xs font-semibold text-blue-400">
              {weeklyGoalCompleted}/{weeklyGoalTotal} tests
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${(weeklyGoalCompleted / weeklyGoalTotal) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            1 more test to hit weekly goal
          </span>
        </div>
      </div>

      {/* 3. Overall Accuracy Circular Gauge */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
        <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/10"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-emerald-400"
              strokeDasharray={`${accuracyRate}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-[11px] font-black text-white">{accuracyRate}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <b className="text-sm font-bold text-white">Overall Accuracy</b>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Top 15% across all simulated test takers
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>High Readiness Band</span>
          </div>
        </div>
      </div>

      {/* 4. Badges Earned */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Award className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <b className="text-sm font-bold text-white">Badges Unlocked</b>
          <div className="flex items-center gap-2 mt-2">
            {badges.map((b, i) => {
              const Icon = b.icon
              return (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${b.color} flex items-center justify-center text-slate-950 shadow-md transform hover:scale-110 transition-transform cursor-pointer`}
                  title={b.name}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})
