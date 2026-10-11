import React from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingDown,
} from 'lucide-react'
import { ClusterTopology, ServiceNode, CircuitBreakerState } from '../../types/chaosCluster'

interface CircuitBreakerStatusHUDProps {
  topology: ClusterTopology
  selectedNodeId?: string
  onSelectNode?: (nodeId: string) => void
}

export const CircuitBreakerStatusHUD: React.FC<CircuitBreakerStatusHUDProps> = ({
  topology,
  selectedNodeId,
  onSelectNode,
}) => {
  const closedBreakers = topology.nodes.filter((n) => n.circuitBreaker.state === 'CLOSED')
  const openBreakers = topology.nodes.filter((n) => n.circuitBreaker.state === 'OPEN')
  const halfOpenBreakers = topology.nodes.filter((n) => n.circuitBreaker.state === 'HALF_OPEN')

  const totalFallbacks = topology.nodes.reduce(
    (sum, n) => sum + (n.circuitBreaker.fallbackInvocations || 0),
    0
  )

  const getBreakerIcon = (state: CircuitBreakerState) => {
    switch (state) {
      case 'CLOSED':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />
      case 'OPEN':
        return <ShieldX className="w-4 h-4 text-rose-400" />
      case 'HALF_OPEN':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />
    }
  }

  const getStrategyBadge = (strategy: ServiceNode['circuitBreaker']['fallbackStrategy']) => {
    switch (strategy) {
      case 'STALE_CACHE':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Fallback: STALE_CACHE
          </span>
        )
      case 'EMPTY_COLLECTION':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Fallback: EMPTY_COLLECTION
          </span>
        )
      case 'FAIL_FAST_429':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Fallback: FAIL_FAST_429
          </span>
        )
    }
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Header and Aggregate Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Circuit Breaker Heads-Up Display (HUD)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributed failure isolation state machine monitoring Little&apos;s Law queue saturation.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            Closed: <span className="font-bold">{closedBreakers.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            Open: <span className="font-bold">{openBreakers.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            Half-Open: <span className="font-bold">{halfOpenBreakers.length}</span>
          </div>
        </div>
      </div>

      {/* Aggregate Fallback Protection Callout */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300 font-semibold">
            Cumulative Fallbacks Served Under Load:
          </span>
          <span className="font-mono text-white font-bold">{totalFallbacks} invocations</span>
        </div>
        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Self-Healing Cascade Dampener Active
        </div>
      </div>

      {/* Node Circuit Breaker Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topology.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const cb = node.circuitBreaker

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode?.(node.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                cb.state === 'OPEN'
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70'
                  : cb.state === 'HALF_OPEN'
                  ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              } ${isSelected ? 'ring-2 ring-cyan-500/50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                    {getBreakerIcon(cb.state)}
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs line-clamp-1">{node.name}</h5>
                    <span className="text-[10px] font-mono text-slate-500">{node.id}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    cb.state === 'OPEN'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                      : cb.state === 'HALF_OPEN'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {cb.state}
                </span>
              </div>

              {/* Threshold & Consecutive Failures */}
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Fail Threshold:</span>
                  <span className="text-white font-bold">{cb.failureThresholdPercent}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Consecutive Fails:</span>
                  <span
                    className={
                      cb.consecutiveFailures > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'
                    }
                  >
                    {cb.consecutiveFailures}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Fallbacks Triggered:</span>
                  <span className="text-cyan-400 font-bold">{cb.fallbackInvocations}</span>
                </div>
              </div>

              {/* Strategy Badge */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                {getStrategyBadge(cb.fallbackStrategy)}
                <span className="text-[10px] text-slate-500 font-mono">
                  {node.cpuPercent}% CPU
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
