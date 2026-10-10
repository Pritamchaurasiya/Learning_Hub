import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Camera,
  Keyboard,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { FlowStateGauge } from '../components/neuro/FlowStateGauge'
import { BiofeedbackAlertBanner } from '../components/neuro/BiofeedbackAlertBanner'
import { CognitiveLoadHeatmapCard } from '../components/neuro/CognitiveLoadHeatmapCard'
import { neuroAdaptiveService } from '../services/neuroAdaptiveService'
import {
  CognitiveTelemetryPayload,
  CognitiveStateEvaluation,
} from '../types/neuroAdaptive'

export const NeuroStudyOptimizerPage = () => {
  const [sessionActive, setSessionActive] = useState<boolean>(false)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(1200) // Default 20m in progress
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [typingInput, setTypingInput] = useState<string>('')
  const [backspaceCount, setBackspaceCount] = useState<number>(6)
  const [difficulty, setDifficulty] = useState<CognitiveTelemetryPayload['currentProblemDifficulty']>('MEDIUM')
  const [taskType, setTaskType] = useState<CognitiveTelemetryPayload['taskType']>('DSA_CODING')

  // Live evaluation state
  const [evaluation, setEvaluation] = useState<CognitiveStateEvaluation>({
    sessionId: 'sess-neuro-demo',
    evaluationId: 'cog_demo_init',
    timestamp: new Date().toISOString(),
    cognitiveLoadIndex: 48,
    fatigueScore: 22,
    flowStateScore: 82,
    state: 'OPTIMAL_FLOW',
    recommendedAction: 'MAINTAIN_CURRENT_PACE',
    telemetryDigest: 'neuro_init_hash',
  })

  const [activeIntervention, setActiveIntervention] = useState<{
    isOpen: boolean
    secondsRemaining: number
    title: string
    type: string
  }>({
    isOpen: false,
    secondsRemaining: 0,
    title: '',
    type: '',
  })

  const lastKeyTimeRef = useRef<number>(Date.now())
  const latenciesRef = useRef<number[]>([140, 160, 135, 150, 180])

  // Timer tick
  useEffect(() => {
    let interval: any
    if (sessionActive) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [sessionActive])

  // Periodic cognitive evaluation
  const runEvaluation = useCallback(async () => {
    const latencies = latenciesRef.current
    const mean = latencies.length
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 160
    const variance = latencies.length
      ? latencies.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / latencies.length
      : 3500

    const activeMins = Math.max(1, Math.round(elapsedSeconds / 60))
    const payload: CognitiveTelemetryPayload = {
      sessionId: 'sess-neuro-live',
      taskType,
      activeDurationMinutes: activeMins,
      keystroke: {
        flightTimeMeanMs: Math.round(mean),
        flightTimeVarianceMs2: Math.round(variance),
        backspaceCountPerMinute: backspaceCount,
        pauseCountAboveTwoSec: Math.floor(activeMins / 8),
      },
      ocular: cameraActive
        ? {
            blinkRatePerMinute: 16,
            averageFixationDurationMs: 340,
            saccadeVelocityScore: 0.92,
          }
        : undefined,
      currentProblemDifficulty: difficulty,
    }

    const res = await neuroAdaptiveService.evaluateCognitiveState(payload)
    setEvaluation(res)
  }, [elapsedSeconds, backspaceCount, cameraActive, difficulty, taskType])

  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionActive) {
        void runEvaluation()
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [sessionActive, runEvaluation])

  // Typing telemetry capture
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now()
    const diff = now - lastKeyTimeRef.current
    lastKeyTimeRef.current = now

    if (diff > 20 && diff < 2000) {
      latenciesRef.current.push(diff)
      if (latenciesRef.current.length > 50) latenciesRef.current.shift()
    }

    if (e.key === 'Backspace') {
      setBackspaceCount(prev => prev + 1)
    }
  }

  // Intervention countdown
  useEffect(() => {
    let timer: any
    if (activeIntervention.isOpen && activeIntervention.secondsRemaining > 0) {
      timer = setInterval(() => {
        setActiveIntervention(prev => {
          if (prev.secondsRemaining <= 1) {
            return { ...prev, isOpen: false, secondsRemaining: 0 }
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [activeIntervention.isOpen, activeIntervention.secondsRemaining])

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Neuro-Adaptive Study State Optimizer"
        description="Real-time flow state detection, mental fatigue estimation, and biofeedback pacing optimizer"
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                Milestone 15 Biofeedback Engine
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sweller Cognitive Load Theory
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
              <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Neuro-Adaptive Study State Optimizer
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time cognitive fatigue detection, biometric eye tracking, and autonomic micro-break intervention.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCameraActive(!cameraActive)}
              variant="outline"
              className={`text-xs flex items-center gap-1.5 ${
                cameraActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{cameraActive ? 'Ocular Tracking: ON' : 'Webcam Biomarkers: OFF'}</span>
            </Button>

            <Button
              onClick={() => setSessionActive(!sessionActive)}
              variant={sessionActive ? 'outline' : 'primary'}
              className="text-xs flex items-center gap-1.5 shadow-sm"
            >
              {sessionActive ? (
                <>
                  <Pause className="w-4 h-4 text-amber-500" />
                  <span>Pause Session</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white" />
                  <span>Start Flow Session</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Biofeedback Nudge Banner */}
        <BiofeedbackAlertBanner
          action={evaluation.recommendedAction}
          intervention={evaluation.suggestedIntervention}
          onApplyIntervention={() => {
            if (evaluation.suggestedIntervention) {
              setActiveIntervention({
                isOpen: true,
                secondsRemaining: evaluation.suggestedIntervention.durationSec,
                title: evaluation.suggestedIntervention.message,
                type: evaluation.suggestedIntervention.type,
              })
            }
          }}
          onDismiss={() => {
            setEvaluation(prev => ({
              ...prev,
              recommendedAction: 'MAINTAIN_CURRENT_PACE',
              suggestedIntervention: undefined,
            }))
          }}
        />

        {/* Top Metric Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FlowStateGauge
            flowScore={evaluation.flowStateScore}
            fatigueScore={evaluation.fatigueScore}
            cognitiveLoad={evaluation.cognitiveLoadIndex}
            state={evaluation.state}
          />

          <div className="md:col-span-2 space-y-6">
            <CognitiveLoadHeatmapCard
              activeDurationMinutes={Math.round(elapsedSeconds / 60)}
              keystroke={{
                flightTimeMeanMs: 145,
                flightTimeVarianceMs2: 3200,
                backspaceCountPerMinute: backspaceCount,
                pauseCountAboveTwoSec: 2,
              }}
              ocular={
                cameraActive
                  ? {
                      blinkRatePerMinute: 16,
                      averageFixationDurationMs: 340,
                      saccadeVelocityScore: 0.92,
                    }
                  : undefined
              }
            />

            {/* Session Controls & Difficulty Matrix */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono text-2xl font-black">
                  {formatTimer(elapsedSeconds)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Flow Session Timer
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {sessionActive ? 'Active cognitive tracking in progress' : 'Session paused'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as CognitiveTelemetryPayload['taskType'])}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="Select study task type"
                  >
                    <option value="DSA_CODING">DSA Coding</option>
                    <option value="MATH_CALCULATION">Math Calculation</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                    <option value="FLASHCARD_REVIEW">Flashcards</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        difficulty === diff
                          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setElapsedSeconds(0)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Keystroke Telemetry Test Pad */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-indigo-500" />
              Live Cognitive Scratchpad & Keystroke Telemetry Ingestion
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Type code or reasoning notes to benchmark mental fatigue
            </span>
          </div>

          <textarea
            value={typingInput}
            onChange={e => setTypingInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="// Solve or reason here... As you type, the engine evaluates flight time variance and cognitive strain..."
            className="w-full p-4 rounded-xl font-mono text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
          />

          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Words Typed: {typingInput.trim() ? typingInput.trim().split(/\s+/).length : 0} | Backspaces:{' '}
              {backspaceCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={runEvaluation}
              className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
            >
              Evaluate Telemetry Now
            </Button>
          </div>
        </div>
      </div>

      {/* Micro-Intervention Modal */}
      <AnimatePresence>
        {activeIntervention.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 text-center space-y-5"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Biofeedback Reset Active
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {activeIntervention.title}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                <span className="font-mono text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {activeIntervention.secondsRemaining}s
                </span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  Breathe deeply & focus attention away from screen
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  setActiveIntervention(prev => ({ ...prev, isOpen: false }))
                }
                className="w-full text-xs"
              >
                Skip Reset & Continue
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
