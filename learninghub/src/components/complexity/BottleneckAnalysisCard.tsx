import React from 'react'
import { ProfilerResultPayload, ComplexityClass } from '../../types/complexity'
import { Cpu, AlertCircle, Lightbulb, ShieldCheck, Sigma, ArrowUpRight } from 'lucide-react'

interface BottleneckAnalysisCardProps {
  bottleneckAnalysis: ProfilerResultPayload['bottleneckAnalysis']
  classifiedClass: ComplexityClass
  confidenceScore: number
}

export const BottleneckAnalysisCard: React.FC<BottleneckAnalysisCardProps> = ({
  bottleneckAnalysis,
  classifiedClass,
  confidenceScore,
}) => {
  const getLimiterLabel = (limiter: ProfilerResultPayload['bottleneckAnalysis']['primaryLimiter']) => {
    switch (limiter) {
      case 'CPU_COMPUTATIONAL':
        return { label: 'CPU Instruction Bound', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      case 'MEMORY_BANDWIDTH':
        return { label: 'Memory Bus / Bandwidth Bound', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' }
      case 'ALLOCATION_OVERHEAD':
        return { label: 'Heap GC Allocation Overhead', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      case 'CACHE_MISSES':
        return { label: 'L1/L2 Cache Hierarchy Misses', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
      default:
        return { label: 'Balanced Workload', color: 'text-slate-400 bg-slate-800 border-slate-700' }
    }
  }

  const limiterInfo = getLimiterLabel(bottleneckAnalysis.primaryLimiter)

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
      {/* Header & Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Asymptotic Bottleneck & Proof Diagnostics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hardware resource profiling and formal mathematical invariant analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${limiterInfo.color}`}>
            {limiterInfo.label}
          </span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300 font-mono">
              Confidence: <strong className="text-emerald-400">{confidenceScore}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Formal Proof + Detected Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formal Mathematical Proof */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sigma className="w-4 h-4 text-indigo-400" />
            <span>Formal Mathematical Proof ({classifiedClass})</span>
          </div>
          <p className="text-xs text-slate-400">
            Theoretical recurrences evaluated via Master Theorem & Akra-Bazzi method:
          </p>
          <div className="p-3 rounded-lg bg-slate-900/80 border border-indigo-500/20 font-mono text-sm text-indigo-300 overflow-x-auto">
            {bottleneckAnalysis.katexFormalProof}
          </div>
        </div>

        {/* Detected Anomalies */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Identified Complexity Friction Points</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {bottleneckAnalysis.detectedAnomalies.map((anomaly, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{anomaly}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Engineering Suggestions */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Lightbulb className="w-4 h-4" />
          <span>Actionable Algorithmic Optimizations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bottleneckAnalysis.actionableSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
