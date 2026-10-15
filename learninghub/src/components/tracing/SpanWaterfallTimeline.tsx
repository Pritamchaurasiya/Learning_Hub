import React, { useState } from 'react'
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import type { TraceAggregate } from '../../types/distributedTracing'

interface SpanWaterfallTimelineProps {
  trace: TraceAggregate
}

export const SpanWaterfallTimeline: React.FC<SpanWaterfallTimelineProps> = ({ trace }) => {
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null)

  const totalTime = Math.max(1, trace.totalDurationMs)

  const getServiceColor = (service: string): string => {
    switch (service) {
      case 'api-gateway':
        return 'bg-blue-500'
      case 'auth-service':
        return 'bg-purple-500'
      case 'course-service':
        return 'bg-emerald-500'
      case 'postgres-db':
        return 'bg-cyan-500'
      case 'payment-service':
        return 'bg-amber-500'
      case 'redis-cache':
        return 'bg-rose-500'
      case 'notification-worker':
        return 'bg-indigo-500'
      default:
        return 'bg-gray-500'
    }
  }

  const selectedSpan = trace.spans.find((s) => s.spanId === selectedSpanId)

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Distributed Span Waterfall & Gantt Timeline
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visual breakdown of request execution across microservices. Spans with flame badges denote the latency Critical Path.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
            Total: <strong className="text-indigo-600 dark:text-indigo-400">{trace.totalDurationMs}ms</strong>
          </span>
          <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-700 dark:text-rose-300">
            Critical Path: <strong>{trace.criticalPathDurationMs}ms</strong>
          </span>
        </div>
      </div>

      {/* Waterfall Rows */}
      <div className="space-y-2 font-mono">
        {/* Time ruler */}
        <div className="grid grid-cols-12 text-[10px] text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-1">
          <div className="col-span-5 text-left font-sans">Operation & Service</div>
          <div className="col-span-7 flex justify-between">
            <span>0ms</span>
            <span>{Math.round(totalTime * 0.25)}ms</span>
            <span>{Math.round(totalTime * 0.5)}ms</span>
            <span>{Math.round(totalTime * 0.75)}ms</span>
            <span>{totalTime}ms</span>
          </div>
        </div>

        {trace.spans.map((span) => {
          const isSelected = selectedSpanId === span.spanId
          const leftPercent = (span.startTimeMs / totalTime) * 100
          const widthPercent = Math.max(1.5, (span.durationMs / totalTime) * 100)
          const isCritical = span.isCriticalPath

          return (
            <div
              key={span.spanId}
              onClick={() => setSelectedSpanId(isSelected ? null : span.spanId)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                  : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40 border-transparent'
              }`}
            >
              <div className="grid grid-cols-12 items-center gap-2">
                {/* Left metadata */}
                <div className="col-span-5 flex items-center gap-1.5 text-xs truncate">
                  {isSelected ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}

                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getServiceColor(
                      span.serviceName
                    )}`}
                  />

                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {span.name}
                  </span>

                  {isCritical && (
                    <span
                      title="Critical Path Bottleneck"
                      className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded"
                    >
                      <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    </span>
                  )}

                  {span.statusCode === 'ERROR' && (
                    <span className="inline-flex items-center text-[10px] text-rose-500 font-bold">
                      <AlertCircle className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Right Waterfall bar */}
                <div className="col-span-7 relative h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                  <div
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    className={`absolute top-0 bottom-0 rounded flex items-center px-1 text-[10px] text-white font-bold transition-all ${
                      span.statusCode === 'ERROR'
                        ? 'bg-rose-500'
                        : isCritical
                        ? 'bg-amber-500'
                        : getServiceColor(span.serviceName)
                    }`}
                  >
                    <span className="truncate">{span.durationMs}ms</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Span Detail Card */}
      {selectedSpan && (
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-200 dark:border-gray-750 text-xs space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-750">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-100 font-sans">
                Span: {selectedSpan.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {selectedSpan.serviceName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">ID: {selectedSpan.spanId}</span>
              {selectedSpan.statusCode === 'OK' ? (
                <span className="text-emerald-600 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> ERROR
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400 uppercase text-[10px] font-sans font-bold">
                Timing Attributes
              </span>
              <div className="mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                <div>Start Offset: {selectedSpan.startTimeMs}ms</div>
                <div>Duration: {selectedSpan.durationMs}ms</div>
                <div>Kind: {selectedSpan.kind}</div>
                <div>Parent ID: {selectedSpan.parentSpanId || 'ROOT'}</div>
              </div>
            </div>

            <div>
              <span className="text-gray-400 uppercase text-[10px] font-sans font-bold">
                Custom Tags & Attributes
              </span>
              <div className="mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                {Object.entries(selectedSpan.attributes).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-indigo-600 dark:text-indigo-400">{k}:</span> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
