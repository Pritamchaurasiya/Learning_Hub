import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'

interface Props {
  targetDate?: string
  title?: string
  participants?: number
  contestId?: string
}

export function ContestCountdownWidget({
  targetDate,
  title = 'Global Competitive DSA Championship',
  participants = 420,
}: Props) {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    mins: number
    secs: number
  }>({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  })

  useEffect(() => {
    // If targetDate not provided, lock to a stable 36h from first mount
    const target = targetDate
      ? new Date(targetDate).getTime()
      : Date.now() + 1000 * 60 * 60 * 36

    const update = () => {
      const diff = Math.max(0, target - Date.now())
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-indigo-500/10 border border-amber-500/20 dark:border-amber-500/30 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Upcoming Live Arena
            </span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
            {participants} Registered
          </span>
        </div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-3">
          {title}
        </h4>
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[
            { label: 'Days', val: timeLeft.days },
            { label: 'Hours', val: timeLeft.hours },
            { label: 'Mins', val: timeLeft.mins },
            { label: 'Secs', val: timeLeft.secs },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur rounded-xl p-1.5 border border-gray-200/50 dark:border-slate-700/50 shadow-sm"
            >
              <div className="text-base font-black text-gray-900 dark:text-white tabular-nums font-mono">
                {String(item.val).padStart(2, '0')}
              </div>
              <div className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate(`/contest`)}
        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
      >
        <span>Enter Contest Hall</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </Card>
  )
}
