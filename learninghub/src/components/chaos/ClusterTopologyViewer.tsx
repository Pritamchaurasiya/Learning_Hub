import React from 'react'
import {
  Server,
  Database,
  Layers,
  Shield,
  Activity,
  AlertTriangle,
  Zap,
  Cpu,
} from 'lucide-react'
import {
  ClusterTopology,
  ServiceNode,
  ServiceHealthStatus,
  CircuitBreakerState,
  NetworkLinkState,
} from '../../types/chaosCluster'

interface ClusterTopologyViewerProps {
  topology: ClusterTopology
  selectedNodeId?: string
  onSelectNode?: (nodeId: string) => void
}

export const ClusterTopologyViewer: React.FC<ClusterTopologyViewerProps> = ({
  topology,
  selectedNodeId,
  onSelectNode,
}) => {
  const getNodeRoleIcon = (role: ServiceNode['role']) => {
    switch (role) {
      case 'GATEWAY':
        return <Shield className="w-4 h-4 text-indigo-400" />
      case 'CORE_LOGIC':
        return <Cpu className="w-4 h-4 text-purple-400" />
      case 'CACHE':
        return <Zap className="w-4 h-4 text-amber-400" />
      case 'DATABASE':
        return <Database className="w-4 h-4 text-emerald-400" />
      case 'MESSAGE_BUS':
        return <Layers className="w-4 h-4 text-cyan-400" />
      case 'THIRD_PARTY':
        return <Server className="w-4 h-4 text-rose-400" />
      default:
        return <Server className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: ServiceHealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HEALTHY
          </span>
        )
      case 'DEGRADED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            DEGRADED
          </span>
        )
      case 'CRASHED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            CRASHED
          </span>
        )
      case 'RECOVERING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            RECOVERING
          </span>
        )
    }
  }

  const getBreakerBadge = (state: CircuitBreakerState) => {
    switch (state) {
      case 'CLOSED':
        return (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            CB: CLOSED
          </span>
        )
      case 'OPEN':
        return (
          <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold animate-pulse">
            CB: OPEN (TRIPPED)
          </span>
        )
      case 'HALF_OPEN':
        return (
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            CB: HALF-OPEN
          </span>
        )
    }
  }

  const getLinkStateDisplay = (state: NetworkLinkState) => {
    switch (state) {
      case 'CONNECTED':
        return 'border-emerald-500/40 text-emerald-400'
      case 'PARTITIONED':
        return 'border-rose-500 text-rose-400 bg-rose-500/10 animate-pulse'
      case 'DEGRADED_LATENCY':
        return 'border-amber-500/80 text-amber-400 bg-amber-500/10'
      case 'PACKET_LOSS':
        return 'border-purple-500 text-purple-400 bg-purple-500/10'
    }
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Live Cluster Topology & Failure Mesh
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{topology.description}</p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span>{topology.nodes.length} Microservices</span>
          <span className="mx-1.5 text-slate-600">•</span>
          <span>{topology.links.length} Network Links</span>
        </div>
      </div>

      {/* Microservice Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {topology.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const threadSaturationPercent = Math.round(
            (node.threadPoolUsed / Math.max(1, node.threadPoolCapacity)) * 100
          )

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode?.(node.id)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getNodeRoleIcon(node.role)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs tracking-tight line-clamp-1">
                      {node.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">{node.id}</span>
                  </div>
                </div>
                {getStatusBadge(node.status)}
              </div>

              {/* Thread Pool Utilization Bar */}
              <div className="space-y-1 my-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Thread Pool Saturation</span>
                  <span className="font-mono text-white font-bold">
                    {node.threadPoolUsed}/{node.threadPoolCapacity} ({threadSaturationPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      threadSaturationPercent > 80
                        ? 'bg-rose-500'
                        : threadSaturationPercent > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(threadSaturationPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Circuit Breaker Status & Metrics */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                {getBreakerBadge(node.circuitBreaker.state)}
                <span className="text-slate-400 font-mono text-[10px]">
                  Err: {node.errorRatePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Network Links Overview */}
      <div className="pt-2 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Active Inter-Service Links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {topology.links.map((link) => (
            <div
              key={link.id}
              className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${getLinkStateDisplay(
                link.state
              )}`}
            >
              <div className="truncate">
                <span className="font-bold">{link.sourceNodeId.replace('svc-', '')}</span>
                <span className="mx-1 text-slate-500">→</span>
                <span className="font-bold">{link.targetNodeId.replace('svc-', '')}</span>
              </div>
              <div className="text-[10px] text-right font-bold shrink-0 ml-1">
                {link.state === 'PARTITIONED' ? 'SEVERED' : `${link.latencyMs}ms`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
