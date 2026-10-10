import React from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { TraceStep } from '../../types/debugger'

interface TimeTravelControlsBarProps {
  currentStepIndex: number
  totalSteps: number
  isPlaying: boolean
  playbackSpeed: number
  steps: TraceStep[]
  onStepChange: (index: number) => void
  onTogglePlay: () => void
  onSpeedChange: (speed: number) => void
  onReset: () => void
}

export const TimeTravelControlsBar: React.FC<TimeTravelControlsBarProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  steps,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
  onReset,
}) => {
  const currentStep = steps[currentStepIndex]

  const getEventBadgeColor = (event?: string) => {
    switch (event) {
      case 'CALL':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'MUTATION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'RETURN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'EXCEPTION':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/30'
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm space-y-3">
      {/* Upper Timeline Scrub Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              Step {currentStepIndex + 1} of {Math.max(1, totalSteps)}
            </span>
            {currentStep && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getEventBadgeColor(
                  currentStep.event
                )}`}
              >
                {currentStep.event} : Line {currentStep.line}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {currentStep?.functionName ? `${currentStep.functionName}()` : 'Global Execution'}
          </span>
        </div>

        {/* Scrub Bar Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStepIndex}
          onChange={e => onStepChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
          aria-label="Execution step timeline scrubber"
        />
      </div>

      {/* Control Buttons & Playback Settings */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback Steppers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(0)}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition-colors"
            title="First Step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700/40 transition-colors"
            title="Step Backwards in Execution Time (Alt+Left)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Step Back</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1))}
            disabled={currentStepIndex >= totalSteps - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700/40 transition-colors"
            title="Step Forward in Execution Time (Alt+Right)"
          >
            <span>Step Forward</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, totalSteps - 1))}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition-colors"
            title="Last Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Multiplier Pill Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <span className="text-slate-500 px-1 font-mono text-[10px]">SPEED:</span>
          {[0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                playbackSpeed === s
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
