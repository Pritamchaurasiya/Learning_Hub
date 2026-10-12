import React from 'react'
import { CanaryRelease } from '../../types/canary'
import { Server, Zap, ShieldCheck, AlertTriangle } from 'lucide-react'

interface CanaryTrafficGaugeProps {
  deployment: CanaryRelease
}

export const CanaryTrafficGauge: React.FC<CanaryTrafficGaugeProps> = ({ deployment }) => {
  const canaryPercent = deployment.trafficWeightCanary
  const baselinePercent = deployment.trafficWeightBaseline

  const isRolledBack = deployment.stage === 'ROLLED_BACK'
  const isPromoted = deployment.stage === 'FULL_PROMOTION'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Live Traffic Weight Shifter
          </h3>
          <p className="text-xs text-slate-400">
            Real-time weighted routing distribution between Baseline and Canary instances
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRolledBack ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              100% Traffic Diverted to Baseline (Rolled Back)
            </span>
          ) : isPromoted ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Fully Promoted to Production
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active Split: {baselinePercent}% / {canaryPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Visual Dual Cylinder Progress Bar */}
      <div className="relative w-full h-8 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex shadow-inner">
        <div
          data-testid="traffic-baseline-bar"
          style={{ width: `${baselinePercent}%` }}
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 flex items-center px-3 justify-start font-mono text-xs font-bold text-white shadow-sm"
        >
          {baselinePercent > 12 && (
            <span className="truncate">Baseline: {baselinePercent}%</span>
          )}
        </div>
        <div
          data-testid="traffic-canary-bar"
          style={{ width: `${canaryPercent}%` }}
          className={`h-full transition-all duration-500 flex items-center px-3 justify-end font-mono text-xs font-bold text-white ${
            isRolledBack
              ? 'bg-rose-600'
              : 'bg-gradient-to-r from-amber-500 to-emerald-500'
          }`}
        >
          {canaryPercent > 12 && (
            <span className="truncate">Canary: {canaryPercent}%</span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/80">
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-blue-400">
              <Server className="w-3.5 h-3.5" />
              Baseline ({deployment.previousVersion})
            </span>
            <span className="font-mono text-slate-300">{deployment.baselineMetrics.requestsPerSecond} req/s</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-white">
              {baselinePercent}%
            </span>
            <span className="text-xs text-slate-400">
              P99: <strong className="text-slate-200">{deployment.baselineMetrics.p99LatencyMs}ms</strong>
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              Canary ({deployment.version})
            </span>
            <span className="font-mono text-slate-300">{deployment.canaryMetrics.requestsPerSecond} req/s</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-400">
              {canaryPercent}%
            </span>
            <span className="text-xs text-slate-400">
              P99: <strong className="text-amber-300">{deployment.canaryMetrics.p99LatencyMs}ms</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
