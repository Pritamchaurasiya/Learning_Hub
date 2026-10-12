import React from 'react'
import { CanaryRelease } from '../../types/canary'
import { Activity, AlertOctagon, CheckCircle2, Clock, ShieldAlert, TrendingUp } from 'lucide-react'

interface SloHealthMatrixProps {
  deployment: CanaryRelease
}

export const SloHealthMatrix: React.FC<SloHealthMatrixProps> = ({ deployment }) => {
  const evalData = deployment.lastEvaluation
  const slo = deployment.sloInvariants
  const bMetrics = deployment.baselineMetrics
  const cMetrics = deployment.canaryMetrics

  const isHealthy = evalData.verdict === 'HEALTHY'
  const isCritical = evalData.verdict === 'CRITICAL_BREACH'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Service Level Indicator (SLI) Health Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Real-time statistical hypothesis testing & error budget consumption analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="slo-verdict-badge"
            className={`px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1.5 ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : !isHealthy
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isCritical ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            ) : !isHealthy ? (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Verdict: {evalData.verdict}
          </span>
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            Action: {evalData.recommendation}
          </span>
        </div>
      </div>

      {/* Grid of 4 Core SLI Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* P99 Latency Card */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              P99 Latency
            </span>
            <span className="text-[11px] text-slate-500">Max: {slo.maxP99LatencyMs}ms</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-lg font-bold font-mono ${
                cMetrics.p99LatencyMs > slo.maxP99LatencyMs
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {cMetrics.p99LatencyMs}ms
            </span>
            <span className="text-xs text-slate-400">
              vs Base: {bMetrics.p99LatencyMs}ms
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, (cMetrics.p99LatencyMs / slo.maxP99LatencyMs) * 100)}%`,
              }}
              className={`h-full ${
                cMetrics.p99LatencyMs > slo.maxP99LatencyMs
                  ? 'bg-rose-500'
                  : 'bg-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Error Rate Card */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              5xx Error Rate
            </span>
            <span className="text-[11px] text-slate-500">Max: {slo.maxErrorRatePercent}%</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-lg font-bold font-mono ${
                cMetrics.errorRatePercent > slo.maxErrorRatePercent
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {cMetrics.errorRatePercent}%
            </span>
            <span className="text-xs text-slate-400">
              Delta: {evalData.errorRateDelta >= 0 ? `+${evalData.errorRateDelta}` : evalData.errorRateDelta}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, evalData.errorBudgetConsumedPercent)}%`,
              }}
              className={`h-full ${
                evalData.errorBudgetConsumedPercent > 80
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Latency Degradation Ratio */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Latency Ratio (Lc/Lb)
            </span>
            <span className="text-[11px] text-slate-500">Max: {slo.maxLatencyRatio}x</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-lg font-bold font-mono ${
                evalData.latencyDegradationRatio > slo.maxLatencyRatio
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {evalData.latencyDegradationRatio}x
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: &lt;{slo.maxLatencyRatio}x
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, (evalData.latencyDegradationRatio / slo.maxLatencyRatio) * 100)}%`,
              }}
              className={`h-full ${
                evalData.latencyDegradationRatio > slo.maxLatencyRatio
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
            />
          </div>
        </div>

        {/* Statistical Z-Score Card */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              Statistical Z-Score
            </span>
            <span className="text-[11px] text-slate-500">Limit: {slo.maxAllowedZScore}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-lg font-bold font-mono ${
                evalData.zScore > slo.maxAllowedZScore
                  ? 'text-rose-400'
                  : 'text-purple-300'
              }`}
            >
              z = {evalData.zScore}
            </span>
            <span className="text-xs text-slate-400">99% Conf.</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, Math.max(10, ((evalData.zScore + 1) / 3.5) * 100))}%`,
              }}
              className={`h-full ${
                evalData.zScore > slo.maxAllowedZScore
                  ? 'bg-rose-500'
                  : 'bg-purple-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Breached Invariants Alert */}
      {evalData.breachedSloInvariants.length > 0 && (
        <div
          data-testid="breached-invariants-banner"
          className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs"
        >
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-300">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            SLO Invariant Breach Detected ({evalData.breachedSloInvariants.length}):
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 pl-1 font-mono text-[11px]">
            {evalData.breachedSloInvariants.map((breach, idx) => (
              <li key={idx}>{breach}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
