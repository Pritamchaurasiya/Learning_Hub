import React, { useState } from 'react'
import { Zap, AlertTriangle, CheckCircle, RefreshCw, Layers } from 'lucide-react'
import type { RateLimitVerdict } from '../../types/distributedRateLimiter'

interface TokenBucketVisualizerProps {
  capacity: number
  refillRate: number
  remainingTokens: number
  onConsume: (cost: number) => Promise<void>
  isLoading?: boolean
  lastVerdict: RateLimitVerdict | null
}

export const TokenBucketVisualizer: React.FC<TokenBucketVisualizerProps> = ({
  capacity,
  refillRate,
  remainingTokens,
  onConsume,
  isLoading = false,
  lastVerdict,
}) => {
  const [selectedCost, setSelectedCost] = useState<number>(1)

  const fillPercentage = Math.min(100, Math.max(0, (remainingTokens / Math.max(1, capacity)) * 100))
  const isExhausted = remainingTokens <= 0

  const handleConsume = async (cost: number) => {
    setSelectedCost(cost)
    await onConsume(cost)
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Token Bucket Reservoir
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Continuous Refill
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Absorbs bursty traffic while guaranteeing long-term average throughput of {refillRate} tokens/sec
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400">Capacity: </span>
            <span className="font-bold text-white">{capacity}</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400">Refill: </span>
            <span className="font-bold text-emerald-400">+{refillRate}/s</span>
          </div>
        </div>
      </div>

      {/* Main Content: Reservoir & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
        {/* Left: Animated Cylinder Reservoir */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="relative w-36 h-56 rounded-2xl border-4 border-slate-700 bg-slate-900/80 overflow-hidden shadow-inner flex flex-col justify-end">
            {/* Liquid Fill */}
            <div
              className={`w-full transition-all duration-500 ease-out ${
                fillPercentage > 50
                  ? 'bg-gradient-to-t from-cyan-600 via-teal-500 to-emerald-400'
                  : fillPercentage > 20
                  ? 'bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-400'
                  : 'bg-gradient-to-t from-rose-700 via-red-600 to-rose-400'
              }`}
              style={{ height: `${fillPercentage}%` }}
            >
              {/* Ripple Animation Top */}
              <div className="w-full h-2 bg-white/30 backdrop-blur-sm animate-pulse" />
            </div>

            {/* Token Badge Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-white drop-shadow-md">
                {Math.round(remainingTokens * 10) / 10}
              </span>
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-300 drop-shadow">
                Tokens Left
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {Math.round(fillPercentage)}% Full
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refilling continuously via wall-clock delta</span>
          </div>
        </div>

        {/* Right: Controls & Consumption Actions */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Simulate Request Consumption
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleConsume(1)}
                disabled={isLoading}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedCost === 1
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">1 Token</span>
                <span className="text-[10px] text-slate-400">Standard API</span>
              </button>

              <button
                type="button"
                onClick={() => handleConsume(5)}
                disabled={isLoading}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedCost === 5
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">5 Tokens</span>
                <span className="text-[10px] text-slate-400">Heavy Query</span>
              </button>

              <button
                type="button"
                onClick={() => handleConsume(10)}
                disabled={isLoading}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedCost === 10
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-md shadow-rose-500/10'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                <Zap className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold">10 Tokens</span>
                <span className="text-[10px] text-slate-400">Burst Batch</span>
              </button>
            </div>
          </div>

          {/* Verdict Alert */}
          {lastVerdict && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                lastVerdict.allowed
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}
            >
              {lastVerdict.allowed ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{lastVerdict.allowed ? 'HTTP 200 OK — Request Admitted' : 'HTTP 429 Too Many Requests — Throttled'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                    Latency: {lastVerdict.currentLatencyMs}ms
                  </span>
                </div>
                <p className="text-slate-300">
                  {lastVerdict.allowed
                    ? `Admitted request consuming ${selectedCost} token(s). Remaining: ${lastVerdict.remainingTokens}/${lastVerdict.totalCapacity}.`
                    : `Token bucket depleted! Required ${selectedCost} tokens but only ${lastVerdict.remainingTokens} available. Retry after ${lastVerdict.retryAfterSeconds}s.`}
                </p>
              </div>
            </div>
          )}

          {isExhausted && !lastVerdict && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Bucket currently empty. Awaiting continuous background token refill.</span>
            </div>
          )}
        </div>
      </div>

      {/* Pedagogical Formula Footer */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 font-mono">
        <span className="text-cyan-400 font-semibold">Continuous Refill Formula: </span>
        <span>tokens = min(capacity, current_tokens + (now - last_refill_sec) * refill_rate)</span>
      </div>
    </div>
  )
}
