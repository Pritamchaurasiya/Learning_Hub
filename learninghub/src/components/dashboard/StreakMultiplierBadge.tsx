import { Flame, ShieldCheck, Zap } from 'lucide-react'

interface Props {
  streak: number
  longestStreak: number
}

export function StreakMultiplierBadge({ streak }: Props) {
  // Determine Tier
  const tier =
    streak >= 30
      ? { name: 'Diamond Legend', color: 'from-cyan-500 to-blue-600', multiplier: '2.0x' }
      : streak >= 14
        ? { name: 'Gold Champion', color: 'from-amber-400 to-orange-500', multiplier: '1.75x' }
        : streak >= 7
          ? { name: 'Silver Scholar', color: 'from-slate-300 to-slate-500', multiplier: '1.5x' }
          : { name: 'Bronze Explorer', color: 'from-orange-400 to-amber-600', multiplier: '1.25x' }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`px-3 py-1 rounded-full bg-gradient-to-r ${tier.color} text-white font-black text-xs flex items-center gap-1.5 shadow-md`}
      >
        <Flame className="w-3.5 h-3.5 fill-white" />
        <span>{streak} Day Streak</span>
      </div>

      <div className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-black flex items-center gap-1">
        <Zap className="w-3 h-3" />
        <span>{tier.multiplier} XP Boost</span>
      </div>

      <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-500/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Protected</span>
      </div>
    </div>
  )
}
