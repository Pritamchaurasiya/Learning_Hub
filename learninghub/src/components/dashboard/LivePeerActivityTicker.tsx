import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Sparkles, Trophy, Flame, Swords, ChevronRight } from 'lucide-react'

interface PeerEvent {
  id: string
  user: string
  action: string
  achievement: string
  badge: 'trophy' | 'streak' | 'test' | 'code'
}

const PEER_EVENTS: PeerEvent[] = [
  {
    id: '1',
    user: 'Alex Chen',
    action: 'scored 96% in',
    achievement: 'Dynamic Programming Master Diagnostic',
    badge: 'test',
  },
  {
    id: '2',
    user: 'Priya Sharma',
    action: 'reached Level 5 Scholar with',
    achievement: '14-Day Continuous Streak',
    badge: 'streak',
  },
  {
    id: '3',
    user: 'Marcus Vance',
    action: 'unlocked verified credential',
    achievement: 'FAANG System Design Specialist',
    badge: 'trophy',
  },
  {
    id: '4',
    user: 'Elena Rostova',
    action: 'completed 25m deep focus sprint in',
    achievement: 'Binary Indexed Trees Drill',
    badge: 'code',
  },
  {
    id: '5',
    user: 'David Kim',
    action: 'placed Top 3% in',
    achievement: 'Global Competitive DSA Arena',
    badge: 'trophy',
  },
]

export function LivePeerActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % PEER_EVENTS.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const current = PEER_EVENTS[currentIndex]

  return (
    <div
      className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden text-xs"
      data-testid="live-peer-activity-ticker"
    >
      {/* Left: Active community indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>1,842 learners active now</span>
        </span>
      </div>

      {/* Middle/Right: Cycling peer event */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 truncate text-gray-600 dark:text-slate-300 font-medium"
          >
            {current.badge === 'trophy' && (
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            {current.badge === 'streak' && (
              <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            )}
            {current.badge === 'test' && (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            )}
            {current.badge === 'code' && (
              <span className="w-3.5 h-3.5 text-cyan-500 font-mono font-black shrink-0">
                &lt;/&gt;
              </span>
            )}

            <span className="truncate">
              <strong className="text-gray-900 dark:text-white font-bold">{current.user}</strong>{' '}
              {current.action}{' '}
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {current.achievement}
              </span>
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: Quick Duel Challenge Action */}
      <Link
        to="/arena/duel"
        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/20 transition-all shrink-0 text-xs"
      >
        <Swords className="w-3.5 h-3.5" />
        <span>1v1 Arena Duel</span>
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
