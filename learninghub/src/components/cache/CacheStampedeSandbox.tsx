import React, { useState } from 'react'
import { Zap, AlertTriangle, ShieldCheck, Flame, Server, Clock, Database, RefreshCw } from 'lucide-react'
import type { StampedeSimulationResult } from '../../types/distributedCache'

interface CacheStampedeSandboxProps {
  onSimulate: (key: string, concurrency: number, strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH') => Promise<StampedeSimulationResult>
}

export const CacheStampedeSandbox: React.FC<CacheStampedeSandboxProps> = ({ onSimulate }) => {
  const [concurrency, setConcurrency] = useState(250)
  const [targetKey, setTargetKey] = useState('course:metadata:cs101')
  const [selectedStrategy, setSelectedStrategy] = useState<'NONE' | 'MUTEX_LOCK' | 'XFETCH'>('MUTEX_LOCK')
  const [simulationResult, setSimulationResult] = useState<StampedeSimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRunSimulation = async (strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH' = selectedStrategy) => {
    setSelectedStrategy(strategy)
    setIsLoading(true)
    try {
      const res = await onSimulate(targetKey, concurrency, strategy)
      setSimulationResult(res)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Simulation Controls Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Cache Stampede (Thundering Herd) Sandbox
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate sudden TTL expiration on a viral key under heavy concurrent client traffic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunSimulation('NONE')}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                selectedStrategy === 'NONE'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-red-500/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Unprotected (Crash)
            </button>
            <button
              onClick={() => handleRunSimulation('MUTEX_LOCK')}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                selectedStrategy === 'MUTEX_LOCK'
                  ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-blue-500/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Mutex Lease
            </button>
            <button
              onClick={() => handleRunSimulation('XFETCH')}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                selectedStrategy === 'XFETCH'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-emerald-500/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Probabilistic XFetch
            </button>
          </div>
        </div>

        {/* Sliders and Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-800">
          <div className="md:col-span-6 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Concurrent Requests Burst</span>
              <span className="text-cyan-400 font-mono font-bold">{concurrency} clients / sec</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={concurrency}
              onChange={e => setConcurrency(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>50 reqs</span>
              <span>250 reqs (Medium)</span>
              <span>500 reqs (Spike)</span>
            </div>
          </div>

          <div className="md:col-span-4 space-y-2">
            <label className="block text-xs font-medium text-slate-300">Hotspot Target Key</label>
            <input
              type="text"
              value={targetKey}
              onChange={e => setTargetKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => handleRunSimulation()}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Run Stress Test
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Result Presentation */}
      {simulationResult && (
        <div className="space-y-6 animate-in fade-in">
          {/* Result Banner */}
          <div
            className={`border rounded-xl p-5 ${
              simulationResult.stampedePrevented
                ? 'bg-emerald-950/40 border-emerald-500/50'
                : 'bg-red-950/40 border-red-500/50'
            }`}
          >
            <div className="flex items-start gap-3">
              {simulationResult.stampedePrevented ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    {simulationResult.stampedePrevented ? 'Stampede Successfully Prevented' : 'Catastrophic Stampede Triggered'}
                  </h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      simulationResult.strategy === 'NONE'
                        ? 'bg-red-900/60 text-red-300'
                        : simulationResult.strategy === 'MUTEX_LOCK'
                        ? 'bg-blue-900/60 text-blue-300'
                        : 'bg-emerald-900/60 text-emerald-300'
                    }`}
                  >
                    Strategy: {simulationResult.strategy}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{simulationResult.explanation}</p>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60">
              <div className="bg-slate-900/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-red-400" />
                  Primary DB Hits
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    simulationResult.dbQueriesCount > 1 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {simulationResult.dbQueriesCount} queries
                </span>
              </div>

              <div className="bg-slate-900/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  Cache Hits
                </span>
                <span className="text-lg font-bold font-mono text-emerald-300">
                  {simulationResult.cacheHitsCount} reqs
                </span>
              </div>

              <div className="bg-slate-900/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Avg Latency
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  {simulationResult.avgLatencyMs.toFixed(1)} ms
                </span>
              </div>

              <div className="bg-slate-900/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  P99 Tail Latency
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    simulationResult.p99LatencyMs > 50 ? 'text-amber-400' : 'text-cyan-300'
                  }`}
                >
                  {simulationResult.p99LatencyMs.toFixed(1)} ms
                </span>
              </div>
            </div>
          </div>

          {/* Time Series Load Bar Comparison */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center justify-between">
              <span>Traffic Ingestion Breakdown Across Time Steps</span>
              <span className="text-[10px] text-slate-400">
                Red: Database Load | Green: Cache Hits
              </span>
            </h4>
            <div className="space-y-3">
              {simulationResult.timeSeries.map(point => {
                const total = point.dbLoad + point.cacheHits
                const dbPct = total > 0 ? (point.dbLoad / total) * 100 : 0
                const cachePct = total > 0 ? (point.cacheHits / total) * 100 : 0

                return (
                  <div key={point.step} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span className="font-mono text-slate-400">Step {point.step} ({point.concurrentRequests} reqs)</span>
                      <span className="font-mono text-xs">
                        <strong className="text-red-400 font-bold">{point.dbLoad} DB</strong> vs{' '}
                        <strong className="text-emerald-400 font-bold">{point.cacheHits} Cache</strong>
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${dbPct}%` }}
                        className="bg-red-500 h-full transition-all duration-300"
                        title={`Database Load: ${point.dbLoad}`}
                      />
                      <div
                        style={{ width: `${cachePct}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                        title={`Cache Hits: ${point.cacheHits}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
