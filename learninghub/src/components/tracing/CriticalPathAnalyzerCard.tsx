import React from 'react'
import {
  Flame,
  Zap,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Clock,
  Layers,
} from 'lucide-react'
import type { TraceAggregate, Span } from '../../types/distributedTracing'

interface CriticalPathAnalyzerCardProps {
  trace: TraceAggregate
}

export const CriticalPathAnalyzerCard: React.FC<CriticalPathAnalyzerCardProps> = ({
  trace,
}) => {
  // Critical path spans
  const criticalSpans = trace.spans.filter((s) => s.isCriticalPath)
  const sumAllSpans = trace.spans.reduce((acc, s) => acc + s.durationMs, 0)
  const concurrencySavingsMs = Math.max(0, sumAllSpans - trace.totalDurationMs)

  // Find the single slowest span on the critical path
  const bottleneckSpan = [...criticalSpans].sort(
    (a, b) => b.durationMs - a.durationMs
  )[0]

  const bottleneckPercentage =
    bottleneckSpan && trace.criticalPathDurationMs > 0
      ? ((bottleneckSpan.durationMs / trace.criticalPathDurationMs) * 100).toFixed(
          1
        )
      : '0'

  const getRecommendation = (span?: Span) => {
    if (!span) return 'Analyze async workers and parallel dispatch.'
    if (span.serviceName.includes('db') || span.name.includes('SELECT') || span.name.includes('INSERT')) {
      return 'Add a composite index on query predicates or implement read-through Redis caching with TTL.'
    }
    if (span.serviceName.includes('payment')) {
      return 'Implement idempotency tokens and offload non-blocking verification to an asynchronous message queue.'
    }
    if (span.serviceName.includes('auth')) {
      return 'Cache verified JWT claims in-memory or utilize asymmetric ed25519 local signature checks to avoid remote verification hops.'
    }
    if (span.serviceName.includes('gateway')) {
      return 'Enable HTTP/2 or HTTP/3 multiplexing and connection pooling to reduce handshake and transport serialization overhead.'
    }
    return 'Inspect internal event loops, CPU profiling, and garbage collection pauses.'
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Flame className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Critical Path & Bottleneck Latency Analysis
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The longest sequential chain of dependent spans that directly dictates total request duration.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold border border-indigo-200 dark:border-indigo-800">
          <Zap className="w-4 h-4 text-indigo-500" />
          Concurrency Saved {concurrencySavingsMs.toFixed(0)} ms
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Critical Path Duration</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 mt-2">
            {trace.criticalPathDurationMs.toFixed(1)}{' '}
            <span className="text-sm font-normal text-gray-500">ms</span>
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {((trace.criticalPathDurationMs / Math.max(1, trace.totalDurationMs)) * 100).toFixed(0)}% of total response time
          </span>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Sequential Bottleneck</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-2 truncate">
            {bottleneckSpan ? bottleneckSpan.name : 'None'}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            Takes {bottleneckPercentage}% of critical path
          </span>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Critical Spans</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 mt-2">
            {criticalSpans.length}{' '}
            <span className="text-sm font-normal text-gray-500">/ {trace.spanCount}</span>
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            Remaining {trace.spanCount - criticalSpans.length} spans run concurrently
          </span>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-750">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>Concurrency Factor</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {(sumAllSpans / Math.max(1, trace.totalDurationMs)).toFixed(2)}x
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            Total work vs elapsed wall time
          </span>
        </div>
      </div>

      {/* Critical Path Sequential Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-500" />
          Sequential Execution Chain (Critical Path)
        </h4>

        <div className="space-y-2">
          {criticalSpans.map((span, idx) => {
            const pct =
              trace.criticalPathDurationMs > 0
                ? (span.durationMs / trace.criticalPathDurationMs) * 100
                : 0

            const isWorst = span.spanId === bottleneckSpan?.spanId

            return (
              <div
                key={span.spanId}
                className={`p-3.5 rounded-xl border transition-all ${
                  isWorst
                    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 font-mono font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {span.serviceName}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="font-mono text-gray-600 dark:text-gray-300">
                      {span.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {isWorst && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                        Primary Bottleneck
                      </span>
                    )}
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {span.durationMs.toFixed(1)} ms
                    </span>
                    <span className="text-gray-500">({pct.toFixed(0)}%)</span>
                  </div>
                </div>

                {/* Relative Duration Bar */}
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isWorst ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI Recommendation Callout */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-blue-900 dark:text-blue-200">
            Automated Performance Recommendation for {bottleneckSpan?.serviceName}
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            {getRecommendation(bottleneckSpan)}
          </p>
        </div>
      </div>
    </div>
  )
}
