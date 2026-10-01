import React, { useState } from 'react'
import type { WasmExecutionResult, WasmTestCaseResult } from '../services/wasm/types'
import { CheckCircle2, XCircle, Clock, Zap, Cpu, Terminal, AlertTriangle } from 'lucide-react'

interface WasmTestResultsViewProps {
  result: WasmExecutionResult
}

export const WasmTestResultsView: React.FC<WasmTestResultsViewProps> = ({ result }) => {
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0)
  const testCases = result?.testResults ?? []
  const activeCase: WasmTestCaseResult | undefined = testCases[activeCaseIndex]

  const isAccepted = result.status === 'AC'

  return (
    <div className="flex flex-col h-full space-y-3 font-sans text-xs">
      {/* ── Summary Banner ── */}
      <div
        className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isAccepted
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : result.status === 'TLE'
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAccepted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : result.status === 'TLE' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {isAccepted
                  ? 'All Sample Tests Passed'
                  : result.status === 'TLE'
                  ? 'Time Limit Exceeded (TLE)'
                  : result.status === 'RE'
                  ? 'Runtime Error (RE)'
                  : 'Wrong Answer (WA)'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-900 border border-gray-700 text-gray-300">
                <Zap className="w-3 h-3 text-amber-400" />
                {result.engine}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">{result.feedback}</p>
          </div>
        </div>

        {/* Runtime & Memory Telemetry */}
        <div className="flex items-center gap-3 self-end sm:self-center font-mono text-[11px] bg-gray-950/60 px-3 py-1.5 rounded-md border border-gray-800">
          <span className="flex items-center gap-1 text-gray-300" title="Sub-millisecond execution time">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            {result.totalExecutionTimeMs} ms
          </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-gray-300" title="Peak WebAssembly memory">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            {result.peakMemoryKb} KB
          </span>
          <span className="text-gray-600">|</span>
          <span className="font-bold text-emerald-400">
            {result.passedTests}/{result.totalTests} Passed
          </span>
        </div>
      </div>

      {/* ── Testcase Tabs ── */}
      {testCases.length > 0 && (
        <div className="flex flex-col flex-1 min-h-0 space-y-2">
          <div className="flex items-center gap-1.5 border-b border-gray-800/80 pb-1.5 overflow-x-auto">
            {testCases.map((tc, idx) => (
              <button
                key={tc.testCaseIndex}
                onClick={() => setActiveCaseIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors text-xs shrink-0 ${
                  activeCaseIndex === idx
                    ? 'bg-gray-800 text-white border border-gray-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                {tc.passed ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                )}
                <span>Case {tc.testCaseIndex}</span>
              </button>
            ))}
          </div>

          {/* ── Active Testcase Detail ── */}
          {activeCase && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto">
              {/* Input */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400">Input</span>
                <div className="bg-gray-900 border border-gray-800 rounded p-2.5 font-mono text-gray-200 text-xs break-all whitespace-pre-wrap">
                  {activeCase.input || '<no input>'}
                </div>
              </div>

              {/* Expected Output */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400">Expected Output</span>
                <div className="bg-gray-900 border border-gray-800 rounded p-2.5 font-mono text-emerald-300 text-xs break-all whitespace-pre-wrap">
                  {activeCase.expectedOutput || '<any>'}
                </div>
              </div>

              {/* Your Output */}
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400">Your Output</span>
                  <span className="text-[10px] font-mono text-gray-500">
                    Execution: {activeCase.executionTimeMs} ms • Memory: {activeCase.memoryKb} KB
                  </span>
                </div>
                <div
                  className={`bg-gray-900 border rounded p-2.5 font-mono text-xs break-all whitespace-pre-wrap ${
                    activeCase.passed
                      ? 'border-gray-800 text-gray-200'
                      : 'border-rose-500/40 text-rose-300 bg-rose-950/10'
                  }`}
                >
                  {activeCase.actualOutput}
                </div>
              </div>

              {/* Error or Logs */}
              {(activeCase.error || activeCase.logs.length > 0) && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-gray-500" />
                    Console Output / Error Trace
                  </span>
                  <div className="bg-gray-950 border border-gray-800/80 rounded p-2.5 font-mono text-[11px] text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {activeCase.error && (
                      <p className="text-rose-400 font-bold mb-1">{activeCase.error}</p>
                    )}
                    {activeCase.logs.map((log, lIdx) => (
                      <p key={lIdx}>{log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
