import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Gift, Sparkles, Flame, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { playRewardChime } from '../../utils/soundEffects'
import { useStore } from '../../stores/useStore'
import { calculateLevel } from '../../utils/number'

export interface QuestItem {
  id: string
  title: string
  category: string
  xp: number
  completed: boolean
  actionUrl?: string
  actionLabel?: string
  aiTargetBadge?: string
}

export interface DailyMomentumQuestWidgetProps {
  weakTopic?: string
  onActionClick?: (quest: QuestItem) => void
}

const getTodayKey = () => `lh_daily_quests_${new Date().toISOString().slice(0, 10)}`

export function DailyMomentumQuestWidget({ weakTopic, onActionClick }: DailyMomentumQuestWidgetProps = {}) {
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const defaultQuests: QuestItem[] = [
    {
      id: 'q-1',
      title: weakTopic ? `Run 1 Adaptive Diagnostic Test (${weakTopic})` : 'Run 1 Adaptive Diagnostic Test',
      category: weakTopic ? 'Targeted AI Boost' : 'Assessment',
      xp: 75,
      completed: false,
      actionUrl: '/tests-a',
      actionLabel: 'Launch Test',
      aiTargetBadge: weakTopic,
    },
    {
      id: 'q-2',
      title: 'Complete 1 Pomodoro Deep Work Sprint',
      category: 'Focus',
      xp: 50,
      completed: false,
      actionUrl: '/study-planner',
      actionLabel: 'Focus Timer',
    },
    {
      id: 'q-3',
      title: 'Review 1 Flagged Problem or Concept',
      category: 'Revision',
      xp: 35,
      completed: false,
      actionUrl: '/revision',
      actionLabel: 'SRS Review',
    },
  ]

  const [quests, setQuests] = useState<QuestItem[]>(() => {
    try {
      const saved = localStorage.getItem(getTodayKey())
      if (saved) {
        const parsed = JSON.parse(saved) as QuestItem[]
        if (Array.isArray(parsed) && parsed.length === defaultQuests.length) {
          return parsed.map((q, idx) => ({
            ...defaultQuests[idx],
            ...q,
            actionUrl: defaultQuests[idx].actionUrl,
            actionLabel: defaultQuests[idx].actionLabel,
          }))
        }
      }
    } catch {}

    return defaultQuests
  })

  // Synchronize dynamic AI weakness topic calibration when telemetry arrives
  useEffect(() => {
    if (!weakTopic) return
    setQuests(prev =>
      prev.map(q => {
        if (q.id === 'q-1' && !q.title.includes(weakTopic)) {
          return {
            ...q,
            title: `Run 1 Adaptive Diagnostic Test (${weakTopic})`,
            category: 'Targeted AI Boost',
            aiTargetBadge: weakTopic,
          }
        }
        return q
      })
    )
  }, [weakTopic])

  const [claimedBonus, setClaimedBonus] = useState(() => {
    try {
      return localStorage.getItem(`${getTodayKey()}_bonus`) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(getTodayKey(), JSON.stringify(quests))
    } catch {}
  }, [quests])

  const completedCount = quests.filter(q => q.completed).length
  const totalQuests = quests.length
  const progressPercent = Math.round((completedCount / totalQuests) * 100)
  const isAllComplete = completedCount === totalQuests

  const handleToggleQuest = (id: string) => {
    setQuests(prev =>
      prev.map(q => {
        if (q.id === id) {
          const nextState = !q.completed
          if (nextState) {
            playRewardChime('quest-complete')
            addToast({
              message: `🎯 Quest Completed: ${q.title}! (+${q.xp} XP)`,
              type: 'success',
            })
            // Dispatch live XP gain to global store
            useStore.setState(s => {
              const nextXp = (s.progress.xp || 0) + q.xp
              const newLevel = calculateLevel(nextXp)
              return {
                progress: {
                  ...s.progress,
                  xp: nextXp,
                  level: newLevel,
                },
              }
            })
            try {
              useStore.getState().updateDailyGoal(q.xp)
            } catch {}
          } else {
            // Revert XP if toggled off
            useStore.setState(s => {
              const nextXp = Math.max(0, (s.progress.xp || 0) - q.xp)
              const newLevel = calculateLevel(nextXp)
              return {
                progress: {
                  ...s.progress,
                  xp: nextXp,
                  level: newLevel,
                },
              }
            })
          }
          return { ...q, completed: nextState }
        }
        return q
      })
    )
  }

  const handleClaimBonus = () => {
    if (claimedBonus) return
    setClaimedBonus(true)
    try {
      localStorage.setItem(`${getTodayKey()}_bonus`, 'true')
    } catch {}

    playRewardChime('milestone')
    useStore.setState(s => {
      const nextXp = (s.progress.xp || 0) + 100
      const newLevel = calculateLevel(nextXp)
      return {
        progress: {
          ...s.progress,
          xp: nextXp,
          level: newLevel,
        },
      }
    })
    try {
      useStore.getState().updateDailyGoal(100)
    } catch {}

    addToast({
      message: '🏆 Daily Quest Master Reward: +100 Bonus XP & Daily Momentum Badge!',
      type: 'success',
    })
  }

  const handleAction = (e: React.MouseEvent, quest: QuestItem) => {
    e.stopPropagation()
    if (onActionClick) {
      onActionClick(quest)
    } else if (quest.actionUrl) {
      navigate(quest.actionUrl)
    }
  }

  return (
    <Card
      className="p-5 relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 shadow-xl"
      data-testid="daily-momentum-quest-widget"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              Daily Momentum Quests
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {completedCount}/{totalQuests} Done
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Build daily learning momentum & unlock milestone XP multipliers
            </p>
          </div>
        </div>

        <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
          {progressPercent}%
        </span>
      </div>

      <div className="mb-4">
        <ProgressBar progress={progressPercent} className="h-2 rounded-full" />
      </div>

      {/* Quest list */}
      <div className="space-y-2.5">
        {quests.map(quest => (
          <motion.div
            key={quest.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleToggleQuest(quest.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggleQuest(quest.id)
              }
            }}
            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              quest.completed
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                : 'bg-gray-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-slate-800/70 border-gray-100 dark:border-slate-800 text-gray-800 dark:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {quest.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 hover:text-indigo-500" />
              )}
              <div className="min-w-0">
                <div
                  className={`text-xs font-bold leading-snug flex items-center gap-1.5 flex-wrap ${
                    quest.completed ? 'line-through opacity-75' : ''
                  }`}
                >
                  <span className="truncate">{quest.title}</span>
                  {quest.aiTargetBadge && !quest.completed && (
                    <span
                      data-testid="ai-target-badge"
                      className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0"
                    >
                      AI Target
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">
                  {quest.category}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-lg ${
                  quest.completed
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                +{quest.xp} XP
              </span>

              {quest.actionUrl && !quest.completed && (
                <button
                  type="button"
                  onClick={e => handleAction(e, quest)}
                  title={quest.actionLabel || 'Launch Activity'}
                  aria-label={quest.actionLabel || `Launch ${quest.title}`}
                  className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-slate-750 transition-transform active:scale-90"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Daily completion chest bonus */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Bonus Quest Chest (+100 XP)
          </span>
        </div>

        {isAllComplete ? (
          <button
            onClick={handleClaimBonus}
            disabled={claimedBonus}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              claimedBonus
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-default'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 active:scale-95'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{claimedBonus ? 'Claimed ✓' : 'Claim Loot'}</span>
          </button>
        ) : (
          <span className="text-[10px] text-gray-400 font-semibold">
            Complete {totalQuests - completedCount} more to unlock
          </span>
        )}
      </div>
    </Card>
  )
}
