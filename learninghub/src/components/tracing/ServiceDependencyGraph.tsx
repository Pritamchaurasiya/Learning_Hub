import React, { useState } from 'react'
import {
  Network,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { TraceAggregate, Span } from '../../types/distributedTracing'

interface ServiceDependencyGraphProps {
  trace: TraceAggregate
  onSelectService?: (serviceName: string) => void
}

interface ServiceNode {
  name: string
  totalDurationMs: number
  spanCount: number
  hasError: boolean
  isRoot: boolean
  onCriticalPath: boolean
  spans: Span[]
}

interface ServiceEdge {
  from: string
  to: string
  callCount: number
  avgLatencyMs: number
}

export const ServiceDependencyGraph: React.FC<ServiceDependencyGraphProps> = ({
  trace,
  onSelectService,
}) => {
  const [selectedService, setSelectedService] = useState<string | null>(null)

  // Aggregate spans by service
  const serviceMap = new Map<string, ServiceNode>()

  trace.spans.forEach((span) => {
    const existing = serviceMap.get(span.serviceName) || {
      name: span.serviceName,
      totalDurationMs: 0,
      spanCount: 0,
      hasError: false,
      isRoot: span.parentSpanId === null,
      onCriticalPath: false,
      spans: [],
    }

    existing.totalDurationMs += span.durationMs
    existing.spanCount += 1
    if (span.statusCode === 'ERROR') {
      existing.hasError = true
    }
    if (span.isCriticalPath) {
      existing.onCriticalPath = true
    }
    existing.spans.push(span)
    serviceMap.set(span.serviceName, existing)
  })

  const services = Array.from(serviceMap.values())

  // Derive edges from parent-child span relations
  const spanIdToService = new Map<string, string>()
  trace.spans.forEach((s) => spanIdToService.set(s.spanId, s.serviceName))

  const edgeMap = new Map<string, ServiceEdge>()
  trace.spans.forEach((span) => {
    if (span.parentSpanId && spanIdToService.has(span.parentSpanId)) {
      const parentService = spanIdToService.get(span.parentSpanId)!
      if (parentService !== span.serviceName) {
        const edgeKey = `${parentService}->${span.serviceName}`
        const edge = edgeMap.get(edgeKey) || {
          from: parentService,
          to: span.serviceName,
          callCount: 0,
          avgLatencyMs: 0,
        }
        edge.callCount += 1
        edge.avgLatencyMs = (edge.avgLatencyMs + span.durationMs) / 2
        edgeMap.set(edgeKey, edge)
      }
    }
  })

  const edges = Array.from(edgeMap.values())

  const handleNodeClick = (svcName: string) => {
    const next = selectedService === svcName ? null : svcName
    setSelectedService(next)
    if (onSelectService && next) {
      onSelectService(next)
    }
  }

  const getServiceBadgeColor = (service: string) => {
    switch (service) {
      case 'api-gateway':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
      case 'auth-service':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
      case 'course-service':
        return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
      case 'postgres-db':
        return 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300'
      case 'payment-service':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
      case 'notification-worker':
        return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  const selectedNode = selectedService ? serviceMap.get(selectedService) : null

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Network className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Microservice Dependency DAG & Call Topology
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Directed acyclic graph showing RPC communication paths, cross-service propagation, and error distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Normal
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> Error Injection
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Critical Path
          </span>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const isSelected = selectedService === svc.name
          const badgeClass = getServiceBadgeColor(svc.name)

          return (
            <div
              key={svc.name}
              onClick={() => handleNodeClick(svc.name)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]'
                  : 'hover:border-indigo-300 dark:hover:border-indigo-700'
              } ${badgeClass}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold tracking-wider uppercase opacity-75">
                    {svc.isRoot ? 'Ingress Entrypoint' : 'Microservice'}
                  </span>
                  <h4 className="text-base font-bold mt-0.5">{svc.name}</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  {svc.onCriticalPath && (
                    <span
                      title="On Critical Latency Path"
                      className="p-1 bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-md"
                    >
                      <Sparkles className="w-4 h-4" />
                    </span>
                  )}
                  {svc.hasError ? (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-current/15 text-xs">
                <div>
                  <span className="opacity-75">Total Duration:</span>
                  <p className="font-mono font-bold text-sm">
                    {svc.totalDurationMs.toFixed(1)} ms
                  </p>
                </div>
                <div>
                  <span className="opacity-75">Spans Executed:</span>
                  <p className="font-mono font-bold text-sm">{svc.spanCount} spans</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edges Flow List */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Observed RPC Calls & Propagation Links
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {edges.map((edge) => (
            <div
              key={`${edge.from}-${edge.to}`}
              className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-750 text-xs"
            >
              <div className="flex items-center gap-2 font-mono font-semibold">
                <span className="text-gray-900 dark:text-gray-100">{edge.from}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="text-indigo-600 dark:text-indigo-400">{edge.to}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 font-mono">
                <span>{edge.callCount} call(s)</span>
                <span className="text-gray-400">|</span>
                <span>~{edge.avgLatencyMs.toFixed(0)} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Service Spans in {selectedNode.name} ({selectedNode.spans.length})
            </h4>
            <button
              onClick={() => setSelectedService(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Close
            </button>
          </div>

          <div className="divide-y divide-indigo-100 dark:divide-indigo-900/30">
            {selectedNode.spans.map((span) => (
              <div
                key={span.spanId}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {span.name}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    [{span.kind}]
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-gray-600 dark:text-gray-300">
                    {span.durationMs.toFixed(1)} ms
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      span.statusCode === 'ERROR'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {span.statusCode}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
