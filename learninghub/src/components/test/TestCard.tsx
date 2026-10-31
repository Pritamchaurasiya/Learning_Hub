import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  BookOpen,
  Target,
  DownloadCloud,
  Trophy,
  CheckCircle2,
  RefreshCw,
  Activity,
  Play,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { TestA } from '../../services/testsAService'

export interface TestCardProps {
  test: TestA
  onStart: () => void
  isOfflineBundle?: boolean
  isDownloadingOffline?: boolean
  onDownloadOffline?: () => void
}

export const TestCard = memo(
  ({ test, onStart, isOfflineBundle, isDownloadingOffline, onDownloadOffline }: TestCardProps) => {
    const difficultyColors: Record<string, string> = {
      easy: 'bg-green-100 text-green-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40',
      medium:
        'bg-yellow-100 text-yellow-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40',
      hard: 'bg-red-100 text-red-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40',
      mixed:
        'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/40',
      adaptive:
        'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/40',
    }

    const aiModeInfo = useMemo(() => {
      const modeKey = (
        test.ai_mode || (test.is_ai_generated ? 'ai_optional' : 'no_ai')
      ).toLowerCase()
      switch (modeKey) {
        case 'no_ai':
          return {
            label: 'Native Bank',
            class:
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40',
          }
        case 'hybrid':
          return {
            label: 'Hybrid',
            class:
              'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40',
          }
        case 'ai_required':
          return {
            label: 'AI Required',
            class:
              'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40',
          }
        default:
          return {
            label: 'AI Optional',
            class:
              'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40',
          }
      }
    }, [test.ai_mode, test.is_ai_generated])

    const isAdaptive = test.mode === 'adaptive' || test.difficulty === 'adaptive'
    const isContest = test.mode === 'contest'

    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-900/90 border border-gray-100 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:shadow-xl dark:shadow-md transition-all duration-300 backdrop-blur-xl group">
          <div className="p-6 flex-1 flex flex-col relative z-10">
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge className={difficultyColors[test.difficulty] ?? difficultyColors.mixed}>
                  {test.difficulty}
                </Badge>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${aiModeInfo.class}`}
                >
                  {aiModeInfo.label}
                </span>
                {isAdaptive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                    CAT
                  </span>
                )}
                {isContest && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    Contest
                  </span>
                )}
                {isOfflineBundle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    Offline Ready
                  </span>
                )}
              </div>
              <div className="flex items-center text-gray-500 dark:text-slate-400 text-sm shrink-0">
                <Clock className="w-4 h-4 mr-1" />
                {test.time_limit_minutes} min
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {test.title}
            </h3>

            <p className="text-gray-600 dark:text-slate-300 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
              {test.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 mb-4">
              <span className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                {test.question_count} questions
              </span>
              <span className="flex items-center">
                <Target className="w-4 h-4 mr-1" />
                Pass: {test.passing_score}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onStart}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Test
              </Button>

              {onDownloadOffline && (
                <Button
                  variant="outline"
                  onClick={e => {
                    e.stopPropagation()
                    onDownloadOffline()
                  }}
                  disabled={isDownloadingOffline}
                  title={
                    isOfflineBundle
                      ? 'Offline bundle cached and ready'
                      : 'Download test bundle for offline use'
                  }
                  className={`px-3 py-2 border transition-all ${
                    isOfflineBundle
                      ? 'text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/50'
                      : 'text-gray-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {isDownloadingOffline ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : isOfflineBundle ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <DownloadCloud className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/60 px-6 py-3 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Mode</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {test.mode}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }
)

TestCard.displayName = 'TestCard'
