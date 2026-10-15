import React, { useState, useEffect } from 'react'
import {
  Layers,
  Network,
  Flame,
  AlertTriangle,
  FileText,
  Play,
  RotateCcw,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import type {
  TraceAggregate,
  TracingStudioTab,
} from '../types/distributedTracing'
import { distributedTracingService } from '../services/distributedTracingService'
import { SpanWaterfallTimeline } from '../components/tracing/SpanWaterfallTimeline'
import { ServiceDependencyGraph } from '../components/tracing/ServiceDependencyGraph'
import { CriticalPathAnalyzerCard } from '../components/tracing/CriticalPathAnalyzerCard'
import { TraceChaosControlPanel } from '../components/tracing/TraceChaosControlPanel'
import { W3cTraceContextInspector } from '../components/tracing/W3cTraceContextInspector'

const SCENARIOS = [
  { id: 'Course Enrollment Transaction', label: 'Course Enrollment Transaction' },
  { id: 'User Authentication Flow', label: 'User Authentication & JWT Issuance' },
  { id: 'Catalog Search & Index Query', label: 'Catalog Search & Index Query' },
  { id: 'Payment Gateway Settlement', label: 'Payment Gateway Settlement' },
]

export const DistributedTracingStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TracingStudioTab>('WATERFALL')
  const [traces, setTraces] = useState<TraceAggregate[]>([])
  const [selectedTraceId, setSelectedTraceId] = useState<string>('')
  const [selectedScenario, setSelectedScenario] = useState<string>(SCENARIOS[0].id)
  const [loading, setLoading] = useState<boolean>(true)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [showEduGuide, setShowEduGuide] = useState<boolean>(false)

  useEffect(() => {
    loadTraces()
  }, [])

  const loadTraces = async () => {
    setLoading(true)
    try {
      const data = await distributedTracingService.getTraces()
      setTraces(data)
      if (data.length > 0) {
        setSelectedTraceId(data[0].traceId)
      }
    } catch {
      const mocks = distributedTracingService.getMockTraces()
      setTraces(mocks)
      if (mocks.length > 0) {
        setSelectedTraceId(mocks[0].traceId)
      }
    } finally {
      setLoading(false)
    }
  }

  const activeTrace =
    traces.find((t) => t.traceId === selectedTraceId) || traces[0]

  const handleSimulateNew = async () => {
    setIsSimulating(true)
    try {
      const newTrace = await distributedTracingService.simulateRequest({
        scenarioName: selectedScenario,
        clientBaggage: {
          'session-id': 'sess-' + Math.random().toString(36).substring(2, 8),
          'user-tier': 'enterprise-pro',
        },
      })
      setTraces((prev) => [newTrace, ...prev])
      setSelectedTraceId(newTrace.traceId)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleChaosSimulationResult = (newTrace: TraceAggregate) => {
    setTraces((prev) => [newTrace, ...prev])
    setSelectedTraceId(newTrace.traceId)
  }

  const handleReset = async () => {
    await distributedTracingService.reset()
    await loadTraces()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Distributed Tracing & OpenTelemetry Studio
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  OTel v1.30 Spec
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                End-to-end request tracing, W3C traceparent context propagation, span DAG Gantt waterfall, and chaos latency profiling.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-gray-100 shadow-sm"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleSimulateNew}
            disabled={isSimulating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSimulating ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            Simulate Request
          </button>

          <button
            onClick={handleReset}
            title="Reset Traces"
            className="p-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trace Selector Carousel / Dropdown */}
      {traces.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Trace:
            </span>
            <select
              value={selectedTraceId}
              onChange={(e) => setSelectedTraceId(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
            >
              {traces.map((t) => (
                <option key={t.traceId} value={t.traceId}>
                  {t.name} ({t.traceId.substring(0, 10)}...) - {t.totalDurationMs.toFixed(0)}ms
                </option>
              ))}
            </select>
          </div>

          {activeTrace && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                Duration: <strong className="text-gray-950 dark:text-gray-50">{activeTrace.totalDurationMs.toFixed(1)}ms</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                Spans: <strong className="text-gray-950 dark:text-gray-50">{activeTrace.spanCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Critical Path: <strong>{activeTrace.criticalPathDurationMs.toFixed(1)}ms</strong>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                  activeTrace.hasError
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {activeTrace.hasError ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" /> ERROR
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-750 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'WATERFALL', label: 'Waterfall Timeline', icon: Layers },
          { id: 'DEPENDENCY_DAG', label: 'Microservice DAG', icon: Network },
          { id: 'CRITICAL_PATH', label: 'Critical Path Analysis', icon: Flame },
          { id: 'CHAOS_LAB', label: 'Chaos Engineering Lab', icon: AlertTriangle },
          { id: 'W3C_BAGGAGE', label: 'W3C & Baggage Headers', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TracingStudioTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-3">
          <Activity className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Synthesizing telemetry traces...</p>
        </div>
      ) : activeTrace ? (
        <div className="space-y-6">
          {activeTab === 'WATERFALL' && (
            <SpanWaterfallTimeline trace={activeTrace} />
          )}

          {activeTab === 'DEPENDENCY_DAG' && (
            <ServiceDependencyGraph trace={activeTrace} />
          )}

          {activeTab === 'CRITICAL_PATH' && (
            <CriticalPathAnalyzerCard trace={activeTrace} />
          )}

          {activeTab === 'CHAOS_LAB' && (
            <TraceChaosControlPanel
              onSimulateWithChaos={handleChaosSimulationResult}
            />
          )}

          {activeTab === 'W3C_BAGGAGE' && (
            <W3cTraceContextInspector trace={activeTrace} />
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-500">
          No trace data available. Click "Simulate Request" above to generate your first distributed trace.
        </div>
      )}

      {/* Educational Guide Drawer */}
      <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm">
        <button
          onClick={() => setShowEduGuide(!showEduGuide)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Educational Deep Dive: Distributed Tracing & OpenTelemetry Fundamentals
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Learn how spans, trace IDs, W3C standards, and critical path analysis operate in high-throughput production clusters.
              </p>
            </div>
          </div>
          {showEduGuide ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showEduGuide && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-750 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600 dark:text-gray-300">
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                1. What is a Span & Trace DAG?
              </h4>
              <p>
                A <strong>Span</strong> represents a single contiguous unit of work (e.g. an HTTP request handler, an SQL database query, or a message publisher). It captures duration, status codes, attributes, and events.
              </p>
              <p>
                A <strong>Trace</strong> is a Directed Acyclic Graph (DAG) composed of multiple Spans linked through `parentSpanId` references, allowing engineers to reconstruct the exact causality tree across 10+ decoupled microservices.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                2. W3C TraceContext vs Custom Headers
              </h4>
              <p>
                Before W3C standardization, tools used disparate headers (e.g. `X-B3-TraceId` from Zipkin, `x-datadog-trace-id`).
              </p>
              <p>
                The W3C standard specifies <code>traceparent: 00-&#123;traceId&#125;-&#123;spanId&#125;-&#123;flags&#125;</code>, enabling seamless inter-operability across Java, Go, Node.js, and Envoy service meshes.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                3. The Critical Path Method (CPM)
              </h4>
              <p>
                In a distributed system, spans often run in parallel (e.g. validating auth while pre-fetching user preferences).
              </p>
              <p>
                The <strong>Critical Path</strong> is the sequential chain of blocking parent-child spans where any latency increase directly increases total wall-clock duration. Optimizing non-critical spans yields zero perceptible user benefit!
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                4. Distributed Baggage
              </h4>
              <p>
                <strong>Baggage</strong> propagates contextual business key-value pairs (e.g. <code>tenant-id=enterprise-42</code>) across network boundaries.
              </p>
              <p>
                Downstream workers and databases can route traffic, apply rate limits, or prioritize queues based on baggage without calling back to identity providers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
