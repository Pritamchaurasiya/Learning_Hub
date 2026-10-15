import React, { useState } from 'react'
import { ShieldCheck, ShieldAlert, Cpu, Terminal, Play, Flame } from 'lucide-react'
import type { RaceConditionSimResult } from '../../types/distributedRateLimiter'

interface DistributedLuaAtomicityHUDProps {
  onSimulate: (concurrency: number, capacity: number) => Promise<void>
  result: RaceConditionSimResult | null
  isLoading?: boolean
}

export const DistributedLuaAtomicityHUD: React.FC<DistributedLuaAtomicityHUDProps> = ({
  onSimulate,
  result,
  isLoading = false,
}) => {
  const [concurrency, setConcurrency] = useState<number>(100)
  const [capacity, setCapacity] = useState<number>(15)

  const handleSimulate = async () => {
    await onSimulate(concurrency, capacity)
  }

  const sampleLuaScript = `-- Redis Single-Threaded Atomic Lua Script (EVAL)
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")

if current + 1 > limit then
    return 0 -- Throttled (HTTP 429)
else
    redis.call('incrby', key, 1)
    if current == 0 then
        redis.call('expire', key, 60)
    end
    return 1 -- Admitted (HTTP 200)
end`

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Distributed Race Condition vs Redis Lua Atomicity
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                TOCTOU Defense
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Inspect how non-atomic read-modify-write patterns breach rate limits under high concurrency
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSimulate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Simulating Contention...' : 'Execute Concurrency Race'}</span>
        </button>
      </div>

      {/* Sliders Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Concurrent Goroutines / Threads:</span>
            <span className="text-rose-400 font-mono font-bold">{concurrency} requests</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            step={10}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Configured Bucket Capacity:</span>
            <span className="text-cyan-400 font-mono font-bold">{capacity} max</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Results Comparison */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Unprotected Card */}
          <div className="bg-rose-950/20 border border-rose-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-200">Unprotected Read-Modify-Write</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Vulnerable
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Total Admitted</span>
                  <p className="text-xl font-mono font-bold text-slate-200">{result.unprotectedAllowed}</p>
                </div>
                <div className="bg-rose-900/30 p-2.5 rounded-lg border border-rose-800">
                  <span className="text-[10px] text-rose-300 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400" /> Over-Limit Breaches
                  </span>
                  <p className="text-xl font-mono font-bold text-rose-400">+{result.unprotectedBreaches}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-rose-300/80 italic">
              Critical TOCTOU Failure: Multiple client threads read the same stale token counter before any single write could commit, erroneously approving {result.unprotectedBreaches} requests past limit {result.capacity}.
            </p>
          </div>

          {/* Redis Lua Atomic Card */}
          <div className="bg-emerald-950/20 border border-emerald-800/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-200">Redis EVAL Lua Script</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Single-Threaded Atomic
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Total Admitted</span>
                  <p className="text-xl font-mono font-bold text-emerald-400">{result.luaAtomicAllowed}</p>
                </div>
                <div className="bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-800">
                  <span className="text-[10px] text-emerald-300">Over-Limit Breaches</span>
                  <p className="text-xl font-mono font-bold text-emerald-400">{result.luaAtomicBreaches}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-emerald-300/80">
              Zero Race Conditions: Lua script executes atomically within Redis engine. No other commands can interleave during evaluation, guaranteeing perfect capacity enforcement of {result.capacity}.
            </p>
          </div>
        </div>
      )}

      {/* Redis Lua Script Code Preview */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>ratelimit_atomic.lua</span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-slate-500">Atomic EVAL SHA</span>
        </div>
        <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {sampleLuaScript}
        </pre>
      </div>
    </div>
  )
}
