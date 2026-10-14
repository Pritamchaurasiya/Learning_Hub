import { memo } from 'react'
import { Cpu, ShieldCheck, Keyboard } from 'lucide-react'

interface SystemStatusBarProps {
  onOpenKeyboardShortcuts?: () => void
}

export const SystemStatusBar = memo(function SystemStatusBar({
  onOpenKeyboardShortcuts,
}: SystemStatusBarProps) {
  return (
    <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 text-xs text-slate-400 font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Status Indicators */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-200 font-medium">All Systems Operational</span>
          </div>

          <span className="hidden sm:inline text-slate-700">•</span>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>AST Sandbox: &lt;14ms</span>
          </div>

          <span className="hidden md:inline text-slate-700">•</span>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Syllabus: NTA 2026.4 Audited</span>
          </div>
        </div>

        {/* Right Power-User Action */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">99.98% Uptime</span>
          {onOpenKeyboardShortcuts && (
            <button
              onClick={onOpenKeyboardShortcuts}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors text-[11px]"
              title="View Keyboard Shortcuts"
            >
              <Keyboard className="w-3 h-3 text-slate-400" />
              <span>Press</span>
              <kbd className="px-1 py-0.2 bg-slate-950 rounded border border-slate-700 font-bold text-amber-400">
                ?
              </kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default SystemStatusBar
