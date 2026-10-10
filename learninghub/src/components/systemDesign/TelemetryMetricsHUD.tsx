import React from 'react'
import { SimulationTelemetryResult } from '../../types/systemDesign'
import {
  Activity,
  Clock,
  AlertOctagon,
  Gauge,
  Scale,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

interface TelemetryMetricsHUDProps {
  telemetry: SimulationTelemetryResult
}

export const TelemetryMetricsHUD: React.FC<TelemetryMetricsHUDProps> = ({ telemetry }) => {
  const getStatusBanner = () => {
    switch (telemetry.systemStatus) {
      case 'OPTIMAL':
        return {
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          label: 'System SLA Nominal',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        }
      case 'DEGRADED':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'SLA Degraded (High P99 / Queue Lag)',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        }
      case 'CRITICAL_FAILURE':
      case 'OUTAGE':
      default:
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          label: 'Critical SLA Breach / Cascading Failures',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        }
    }
  }

  const status = getStatusBanner()

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold text-white">Live Production Telemetry HUD</h3>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${status.classes}`}>
          {status.icon}
          <span>{status.label}</span>
        </div>
      </div>

      {/* Grid of 4 Key Latency & Traffic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Achieved Throughput */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-sky-400" /> Throughput Achieved
          </span>
          <div className="text-lg font-bold text-white font-mono">
            {telemetry.throughputAchievedQps.toLocaleString()} <span className="text-xs text-slate-500">QPS</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Target: {telemetry.simulatedQps.toLocaleString()} QPS
          </div>
        </div>

        {/* P99 Latency */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> P99 Tail Latency
          </span>
          <div className="text-lg font-bold text-indigo-300 font-mono">
            {telemetry.p99LatencyMs} <span className="text-xs text-slate-500">ms</span>
          </div>
          <div className="text-[10px] text-slate-500">
            P50: {telemetry.p50LatencyMs}ms | P95: {telemetry.p95LatencyMs}ms
          </div>
        </div>

        {/* Error Rate */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> 5xx / Dropped Rate
          </span>
          <div className={`text-lg font-bold font-mono ${telemetry.errorRatePercentage > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {telemetry.errorRatePercentage}%
          </div>
          <div className="text-[10px] text-slate-500">
            Saturated Nodes: {telemetry.saturatedNodeIds.length}
          </div>
        </div>

        {/* CAP Classification */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-400" /> CAP Invariant
          </span>
          <div className="text-lg font-bold text-amber-300 font-mono">
            {telemetry.capClassification.primaryModel} Profile
          </div>
          <div className="text-[10px] text-slate-500">
            C: {telemetry.capClassification.consistencyScore} | A: {telemetry.capClassification.availabilityScore} | P: {telemetry.capClassification.partitionToleranceScore}
          </div>
        </div>
      </div>

      {/* CAP Theorem Balance Meters */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>CAP Theorem Balance Spectrum</span>
          <span className="text-[11px] text-slate-400 font-mono">{telemetry.capClassification.rationale}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block">Consistency (C)</span>
            <span className="text-emerald-400 font-bold">{telemetry.capClassification.consistencyScore}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block">Availability (A)</span>
            <span className="text-sky-400 font-bold">{telemetry.capClassification.availabilityScore}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block">Partition Tol. (P)</span>
            <span className="text-purple-400 font-bold">{telemetry.capClassification.partitionToleranceScore}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
