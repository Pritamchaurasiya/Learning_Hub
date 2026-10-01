import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Flame } from 'lucide-react'
import { Card } from '../ui/Card'
import { useStore } from '../../stores/useStore'

export function DashboardPomodoroWidget() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const addToast = useStore(state => state.addToast)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            if (mode === 'focus') {
              setSessionsCompleted(c => c + 1)
              setMode('break')
              addToast({ message: '🎯 Focus sprint complete! Take a 5m break.', type: 'success' })
              return 5 * 60
            } else {
              setMode('focus')
              addToast({ message: '⚡ Break concluded! Ready to focus?', type: 'info' })
              return 25 * 60
            }
          }
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, mode, addToast])

  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')

  return (
    <Card className="p-5 bg-gradient-to-br from-indigo-950 via-gray-900 to-indigo-900 text-white shadow-xl border-indigo-800/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
            {mode === 'focus' ? 'Deep Work Focus Sprint' : 'Rest Break'}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200">
          {sessionsCompleted} Completed
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-black tracking-tight font-mono text-white">
          {mins}:{secs}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2.5 rounded-xl font-bold transition-all shadow-md ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setIsRunning(false)
              setSeconds(mode === 'focus' ? 25 * 60 : 5 * 60)
            }}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}
