import { useState, useEffect, useRef } from 'react'
import { Clock, Pause, Play } from 'lucide-react'

interface Props {
  /** Session start time (ISO string or Date). Defaults to now. */
  startTime?: string | Date
  /** Total session duration in minutes */
  durationMinutes: number
}

export function SessionElapsedTimer({ startTime, durationMinutes }: Props) {
  const startRef = useRef<number>(
    startTime ? new Date(startTime).getTime() : Date.now()
  )
  const totalMs = durationMinutes * 60 * 1000

  const [elapsedMs, setElapsedMs] = useState(() => {
    if (startTime) {
      const parsed = new Date(startTime).getTime()
      return isNaN(parsed) ? 0 : Math.max(0, Date.now() - parsed)
    }
    return 0
  })
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (startTime) {
      const parsed = new Date(startTime).getTime()
      if (!isNaN(parsed)) {
        startRef.current = parsed
        setElapsedMs(Math.max(0, Date.now() - parsed))
      }
    }
  }, [startTime])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused])

  const elapsed = Math.max(0, elapsedMs)
  const remaining = Math.max(0, totalMs - elapsed)
  const progress = Math.min(100, (elapsed / totalMs) * 100)

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const isOvertime = elapsed > totalMs
  const isNearEnd = !isOvertime && remaining < 5 * 60 * 1000 // Last 5 minutes

  return (
    <div
      className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700"
      data-testid="session-elapsed-timer"
    >
      <Clock
        className={`w-3.5 h-3.5 ${
          isOvertime
            ? 'text-rose-400'
            : isNearEnd
              ? 'text-amber-400 animate-pulse'
              : 'text-emerald-400'
        }`}
      />

      {/* Elapsed */}
      <span className="text-xs font-mono font-black text-slate-200 tabular-nums">
        {formatTime(elapsed)}
      </span>

      {/* Progress bar */}
      <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isOvertime
              ? 'bg-rose-500'
              : isNearEnd
                ? 'bg-amber-500'
                : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {/* Remaining */}
      <span
        className={`text-[10px] font-bold tabular-nums ${
          isOvertime
            ? 'text-rose-400'
            : isNearEnd
              ? 'text-amber-400'
              : 'text-slate-400'
        }`}
      >
        {isOvertime ? `+${formatTime(elapsed - totalMs)}` : `-${formatTime(remaining)}`}
      </span>

      {/* Pause/Resume toggle */}
      <button
        onClick={() => setIsPaused(!isPaused)}
        className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        title={isPaused ? 'Resume timer' : 'Pause timer'}
        aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
      >
        {isPaused ? (
          <Play className="w-3 h-3" />
        ) : (
          <Pause className="w-3 h-3" />
        )}
      </button>
    </div>
  )
}
