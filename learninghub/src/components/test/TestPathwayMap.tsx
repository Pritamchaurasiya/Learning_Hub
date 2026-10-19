import { memo } from 'react'
import { Check, Lock, Play, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'

export interface PathwayStage {
  id: string
  title: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'completed' | 'current' | 'locked'
  score?: number
}

export interface TestPathwayMapProps {
  onStartStage?: (stage: PathwayStage) => void
}

const defaultStages: PathwayStage[] = [
  {
    id: 'stage-1',
    title: 'Stage 1: Core Logic & Fundamentals',
    topic: 'DSA & Coding Basics',
    difficulty: 'easy',
    status: 'completed',
    score: 95,
  },
  {
    id: 'stage-2',
    title: 'Stage 2: Linear & Non-Linear Structures',
    topic: 'Trees, Graphs & Heaps',
    difficulty: 'medium',
    status: 'completed',
    score: 88,
  },
  {
    id: 'stage-3',
    title: 'Stage 3: Speed, Timing & Edge Cases',
    topic: 'Algorithmic Optimization',
    difficulty: 'medium',
    status: 'current',
  },
  {
    id: 'stage-4',
    title: 'Stage 4: Full Multi-Subject Mock',
    topic: 'Physics, Maths, DSA & Aptitude',
    difficulty: 'hard',
    status: 'locked',
  },
  {
    id: 'stage-5',
    title: 'Stage 5: Grand Championship & PYQ',
    topic: 'Official Exam Calibration',
    difficulty: 'hard',
    status: 'locked',
  },
]

export const TestPathwayMap = memo(function TestPathwayMap({ onStartStage }: TestPathwayMapProps) {
  return (
    <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/40 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Your Guided Pathway <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Pass each stage to unlock the next level and increase your IRT mastery rating.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
          Stage 3 of 5 In Progress
        </span>
      </div>

      {/* Pathway Roadmap Nodes */}
      <div className="relative">
        {/* Connecting Progress Line (Hidden on tiny screens, horizontal on md+) */}
        <div className="hidden lg:block absolute top-7 left-12 right-12 h-1 bg-white/10 z-0">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-purple-500 w-[50%]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
          {defaultStages.map((stage, index) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'
            const isLocked = stage.status === 'locked'

            return (
              <div
                key={stage.id}
                className={`relative rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-purple-950/40 border-2 border-purple-500 shadow-xl shadow-purple-500/20'
                    : isCompleted
                      ? 'bg-emerald-950/20 border border-emerald-500/30'
                      : 'bg-white/5 border border-white/5 opacity-70'
                }`}
              >
                {/* Node Status Badge */}
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm mb-3 transition-transform ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : isCurrent
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/40 ring-4 ring-purple-400/30 animate-pulse'
                        : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 stroke-[3]" />
                  ) : isCurrent ? (
                    <span className="text-base font-extrabold">{index + 1}</span>
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>

                {/* Difficulty Chip */}
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mb-1.5 ${
                    stage.difficulty === 'easy'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : stage.difficulty === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {stage.difficulty}
                </span>

                <h3 className="text-sm font-bold text-white mb-1 leading-snug">{stage.title}</h3>
                <p className="text-xs text-gray-400 mb-3">{stage.topic}</p>

                {isCompleted && (
                  <span className="mt-auto text-xs font-bold text-emerald-400">
                    Passed ({stage.score}%)
                  </span>
                )}

                {isCurrent && (
                  <Button
                    onClick={() => onStartStage?.(stage)}
                    className="mt-auto w-full py-1.5 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Stage</span>
                  </Button>
                )}

                {isLocked && (
                  <span className="mt-auto text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
