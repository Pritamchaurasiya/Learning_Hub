import { useState, useEffect } from 'react'
import { FileEdit, Check } from 'lucide-react'
import { Card } from '../ui/Card'

const SCRATCHPAD_KEY = 'lh_dashboard_study_scratchpad'

export function DashboardScratchpadWidget() {
  const [note, setNote] = useState(() => {
    try {
      return (
        localStorage.getItem(SCRATCHPAD_KEY) ||
        '• Master Theorem Case 2: T(n) = Theta(n^(log_b a) * log n)\n• Review Graph Dijkstra edge cases with PriorityQueue\n• Practice dynamic programming memoization table'
      )
    } catch {
      return ''
    }
  })
  const [savedStatus, setSavedStatus] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_KEY, note)
      setSavedStatus(true)
      const t = setTimeout(() => setSavedStatus(false), 1500)
      return () => clearTimeout(t)
    } catch {}
  }, [note])

  return (
    <Card className="p-5 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Study Scratchpad & Key Formulas
          </span>
        </div>
        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
          {savedStatus ? (
            <span className="text-emerald-500 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Auto-saved
            </span>
          ) : (
            'Local sync'
          )}
        </span>
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Jot down quick formulas, insights, or tasks..."
        className="w-full text-xs p-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-white font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[110px]"
      />
    </Card>
  )
}
