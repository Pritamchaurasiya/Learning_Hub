import React from 'react'
import { Terminal, Cpu, Braces } from 'lucide-react'
import { CallStackFrame } from '../../types/debugger'

interface CallStackScopePanelProps {
  callStack: CallStackFrame[]
  variables: Record<string, any>
  stdoutDelta?: string
}

export const CallStackScopePanel: React.FC<CallStackScopePanelProps> = ({
  callStack,
  variables,
  stdoutDelta,
}) => {
  const varEntries = Object.entries(variables)

  return (
    <div className="space-y-4">
      {/* Call Stack Frames Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Call Stack Frames</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            Depth: {callStack.length}
          </span>
        </div>

        <div className="space-y-2">
          {callStack.map((frame, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                idx === callStack.length - 1
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 shadow-xs'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-mono text-[10px] font-bold text-slate-300">
                  {frame.depth}
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {frame.functionName}()
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">Line {frame.line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope Variables Inspector */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
            <Braces className="w-4 h-4 text-amber-400" />
            <span>Local Scope Variables</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            {varEntries.length} Variable{varEntries.length > 1 ? 's' : ''}
          </span>
        </div>

        {varEntries.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No variables declared in active scope.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {varEntries.map(([name, val]) => {
              const isArray = Array.isArray(val)
              const typeLabel = isArray ? 'Array' : typeof val

              return (
                <div
                  key={name}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{name}:</span>
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 uppercase">
                      {typeLabel}
                    </span>
                  </div>
                  <span className="text-emerald-400 font-semibold truncate max-w-[140px]">
                    {JSON.stringify(val)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Execution Stdout Console */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Execution Console Log</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 min-h-[60px] max-h-32 overflow-y-auto">
          {stdoutDelta ? (
            <p className="text-emerald-400/90 leading-relaxed">&gt; {stdoutDelta}</p>
          ) : (
            <p className="text-slate-600 italic">Ready for step execution...</p>
          )}
        </div>
      </div>
    </div>
  )
}
