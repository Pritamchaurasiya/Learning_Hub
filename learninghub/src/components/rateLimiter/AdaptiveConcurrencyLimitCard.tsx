import React, { useState } from 'react'
import { Gauge, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Sparkles } from 'lucide-react'
import type { AdaptiveConcurrencyState } from '../../types/distributedRateLimiter'

interface AdaptiveConcurrencyLimitCardProps {
  state: AdaptiveConcurrencyState
  onUpdateRtt: (rttMs: number) => Promise<void>
  isLoading?: boolean
}

export const AdaptiveConcurrencyLimitCard: React.FC<AdaptiveConcurrencyLimitCardProps> = ({
  state,
  onUpdateRtt,
  isLoading = false,
}) => {
  const [sliderRtt, setSliderRtt] = useState<number>(state.smoothedRttMs || 20)

  const handleRttChange = async (val: number) => {
    setSliderRtt(val)
    await onUpdateRtt(val)
  }

  const gradientRatio = state.smoothedRttMs > 0 ? state.baselineRttMs / state.smoothedRttMs : 1.0
  const limitUsagePct = Math.min(100, (state.inflightRequests / Math.max(1, state.currentLimit)) * 100)

  const getStatusBadge = () => {
    switch (state.status) {
      case 'OPTIMAL':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          label: 'OPTIMAL (Additive Increase)',
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />,
        }
      case 'SATURATED':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          label: 'SATURATED (Multiplicative Decrease)',
          icon: <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />,
        }
      case 'THROTTLING':
      default:
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          label: 'THROTTLING (Steady State)',
          icon: <Minus className="w-3.5 h-3.5 text-amber-400" />,
        }
    }
  }

  const badge = getStatusBadge()

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Adaptive Concurrency Limiter
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${badge.bg}`}>
                {badge.icon}
                {badge.label}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Dynamically scales maximum in-flight requests using Little's Law and RTT Gradient feedback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRttChange(20.0)}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
          >
            Normal (20ms)
          </button>
          <button
            type="button"
            onClick={() => handleRttChange(150.0)}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
          >
            Latency Spike (150ms)
          </button>
        </div>
      </div>

      {/* RTT Slider Simulation */}
      <div className="my-5 p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-medium">Inject Observed Latency (Downstream RTT):</span>
          <span className="text-amber-400 font-mono font-bold">{sliderRtt.toFixed(1)} ms</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          step={2}
          value={sliderRtt}
          onChange={(e) => handleRttChange(Number(e.target.value))}
          className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>10ms (Healthy)</span>
          <span>Baseline: {state.baselineRttMs}ms</span>
          <span>200ms (Heavy Congestion)</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Dynamic Limit</span>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{state.currentLimit}</p>
          <span className="text-[10px] text-slate-500">[{state.minLimit} - {state.maxLimit}]</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">In-Flight Reqs</span>
          <p className="text-xl font-bold font-mono text-indigo-400 mt-1">{state.inflightRequests}</p>
          <span className="text-[10px] text-slate-500">{Math.round(limitUsagePct)}% capacity</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Smoothed RTT</span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{state.smoothedRttMs.toFixed(1)}ms</p>
          <span className="text-[10px] text-slate-500">EMA (α=0.2)</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Gradient Ratio (G)</span>
          <p className={`text-xl font-bold font-mono mt-1 ${gradientRatio >= 0.95 ? 'text-emerald-400' : gradientRatio < 0.75 ? 'text-rose-400' : 'text-amber-400'}`}>
            {gradientRatio.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-500">{state.adjustmentDirection}</span>
        </div>
      </div>

      {/* Progress Capacity Bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Inflight Load vs Dynamic Ceiling</span>
          <span className="font-mono">{state.inflightRequests} / {state.currentLimit} max concurrent</span>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              limitUsagePct > 80 ? 'bg-rose-500' : limitUsagePct > 50 ? 'bg-amber-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${limitUsagePct}%` }}
          />
        </div>
      </div>

      {/* Theory & Architecture Breakdown */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-amber-400 font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Little's Law in Modern Microservices</span>
        </div>
        <p className="leading-relaxed">
          Little's Law dictates that average concurrency equals throughput multiplied by latency (L = λ * W).
          When downstream databases or services slow down, requests accumulate in queues, inflating memory and causing cascading timeouts. The Gradient algorithm continually tunes the concurrency limit L to keep queue size minimal without sacrificing throughput.
        </p>
        {state.status === 'SATURATED' && (
          <div className="p-2.5 bg-rose-950/30 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Downstream saturation detected! Limit throttled down to protect backend resources from collapse.</span>
          </div>
        )}
      </div>
    </div>
  )
}
