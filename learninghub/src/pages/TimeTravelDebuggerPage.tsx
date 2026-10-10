import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Code2,
  RotateCcw,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ExecutionTracePayload } from '../types/debugger'
import { debuggerService } from '../services/debuggerService'
import { TimeTravelControlsBar } from '../components/debugger/TimeTravelControlsBar'
import { VisualMemoryHeapGraph } from '../components/debugger/VisualMemoryHeapGraph'
import { CallStackScopePanel } from '../components/debugger/CallStackScopePanel'
import { InvariantAnomalyCard } from '../components/debugger/InvariantAnomalyCard'

const CODE_PRESETS = [
  {
    id: 'binary-search',
    name: 'Binary Search (Classic)',
    code: `function binarySearch(arr, target) {
  let low = 0
  let high = arr.length - 1
  while (low <= high) {
    let mid = Math.floor((low + high) / 2)
    if (arr[mid] === target) {
      return mid
    } else if (arr[mid] < target) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return -1
}`,
  },
  {
    id: 'two-pointer',
    name: 'Two-Pointer Sorted Convergence',
    code: `function twoSumSorted(nums, target) {
  let left = 0
  let right = nums.length - 1
  while (left < right) {
    const currentSum = nums[left] + nums[right]
    if (currentSum === target) {
      return [left, right]
    } else if (currentSum < target) {
      left++
    } else {
      right--
    }
  }
  return [-1, -1]
}`,
  },
  {
    id: 'linked-list',
    name: 'Linked List In-Place Reversal',
    code: `function reverseList(head) {
  let prev = null
  let curr = head
  while (curr) {
    let next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  return prev
}`,
  },
  {
    id: 'recursion',
    name: 'Recursion Call Stack Traversal',
    code: `function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}`,
  },
]

export const TimeTravelDebuggerPage: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('binary-search')
  const [code, setCode] = useState<string>(CODE_PRESETS[0].code)
  const [trace, setTrace] = useState<ExecutionTracePayload | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch or simulate trace when code changes
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    debuggerService
      .recordTrace({ code, language: 'javascript' })
      .then(res => {
        if (isMounted) {
          setTrace(res)
          setCurrentStepIndex(0)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [code])

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && trace && trace.steps.length > 0) {
      const intervalMs = Math.max(250, 1000 / playbackSpeed)
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= trace.steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, playbackSpeed, trace])

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId)
    const preset = CODE_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setCode(preset.code)
      setIsPlaying(false)
    }
  }

  const currentStep = trace?.steps[currentStepIndex] || null
  const activeLine = currentStep ? currentStep.line : -1
  const codeLines = code.split('\n')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 16
            </span>
            <span className="text-xs text-slate-400 font-mono">Omniscient Execution Engine</span>
            {isLoading && (
              <span className="text-xs text-amber-400 flex items-center gap-1 font-mono animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Recording Trace...
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Time-Travel Debugger & Memory Trace Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Step forward and backward in execution time. Inspect live stack frames, heap pointers, and
            detect failing algorithmic invariants with Socratic AI explanations.
          </p>
        </div>

        {/* Quick Actions & Workspace Deep Link */}
        <div className="flex items-center gap-2">
          <Link
            to="/problems"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Problem Workspace</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false)
              setCurrentStepIndex(0)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Execution</span>
          </button>
        </div>
      </div>

      {/* Preset Archetype Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Algorithm Archetypes:</span>
        </span>
        {CODE_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedPresetId === preset.id
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Execution Scrubber HUD */}
      {trace && (
        <TimeTravelControlsBar
          currentStepIndex={currentStepIndex}
          totalSteps={trace.totalSteps}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          steps={trace.steps}
          onStepChange={idx => {
            setCurrentStepIndex(idx)
            setIsPlaying(false)
          }}
          onTogglePlay={() => setIsPlaying(prev => !prev)}
          onSpeedChange={setPlaybackSpeed}
          onReset={() => {
            setCurrentStepIndex(0)
            setIsPlaying(false)
          }}
        />
      )}

      {/* 3-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Code Editor with Active Line Highlighting */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Source Code Execution AST</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Active Line {activeLine}
              </span>
            </div>

            {/* Line by Line Code Viewer */}
            <div className="font-mono text-xs rounded-xl bg-slate-950 p-2 border border-slate-850 overflow-x-auto max-h-[480px]">
              {codeLines.map((lineContent, lineIdx) => {
                const lineNum = lineIdx + 1
                const isCurrent = lineNum === activeLine

                return (
                  <div
                    key={lineIdx}
                    className={`flex items-center gap-3 px-2 py-0.5 rounded transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500/20 text-emerald-200 border-l-2 border-emerald-400'
                        : 'text-slate-300 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="text-[10px] text-slate-600 select-none w-6 text-right font-mono">
                      {lineNum}
                    </span>
                    <pre className="m-0 font-mono text-xs">{lineContent}</pre>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Anomaly & Invariant Report */}
          {trace && <InvariantAnomalyCard anomalies={trace.anomalies} />}
        </div>

        {/* Center / Right Column (7 cols): Visual Memory Heap + Call Stack Frames */}
        <div className="lg:col-span-7 space-y-6">
          {/* Visual Memory Heap & Pointers */}
          <VisualMemoryHeapGraph
            heapObjects={currentStep?.heapObjects || {}}
            activeVariables={currentStep?.variables || {}}
          />

          {/* Call Stack & Scope Variable Panel */}
          <CallStackScopePanel
            callStack={currentStep?.callStack || []}
            variables={currentStep?.variables || {}}
            stdoutDelta={currentStep?.stdoutDelta}
          />
        </div>
      </div>
    </div>
  )
}

export default TimeTravelDebuggerPage
