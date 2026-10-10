import React from 'react'
import {
  ArchitectureTopology,
  ArchitectureNode,
  SystemNodeType,
} from '../../types/systemDesign'
import {
  Server,
  Database,
  Layers,
  Radio,
  Globe,
  HardDrive,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

interface TopologyCanvasProps {
  topology: ArchitectureTopology
  spofNodeIds: string[]
  failedNodeIds: string[]
  saturatedNodeIds: string[]
  onToggleNodeHealth?: (nodeId: string) => void
  onIncrementReplication?: (nodeId: string) => void
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  topology,
  spofNodeIds,
  failedNodeIds,
  saturatedNodeIds,
  onToggleNodeHealth,
  onIncrementReplication,
}) => {
  const getNodeIcon = (type: SystemNodeType) => {
    switch (type) {
      case 'CLIENT':
        return <Globe className="w-5 h-5 text-sky-400" />
      case 'CDN':
        return <Radio className="w-5 h-5 text-indigo-400" />
      case 'LOAD_BALANCER':
        return <Layers className="w-5 h-5 text-emerald-400" />
      case 'API_GATEWAY':
        return <Cpu className="w-5 h-5 text-cyan-400" />
      case 'APP_SERVER':
        return <Server className="w-5 h-5 text-blue-400" />
      case 'DISTRIBUTED_CACHE':
        return <HardDrive className="w-5 h-5 text-amber-400" />
      case 'MESSAGE_QUEUE':
        return <Radio className="w-5 h-5 text-purple-400" />
      case 'PRIMARY_DATABASE':
        return <Database className="w-5 h-5 text-rose-400" />
      case 'REPLICA_DATABASE':
        return <Database className="w-5 h-5 text-teal-400" />
      case 'BLOB_STORAGE':
      default:
        return <HardDrive className="w-5 h-5 text-slate-400" />
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Interactive C4 Architecture Topology</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any node to inject localized chaos halts or scale active replication factors.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Failed / Down
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Saturated
          </span>
        </div>
      </div>

      {/* Grid of Architecture Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {topology.nodes.map((node: ArchitectureNode) => {
          const isFailed = failedNodeIds.includes(node.id) || !node.isHealthy
          const isSaturated = saturatedNodeIds.includes(node.id)
          const isSpof = spofNodeIds.includes(node.id)

          let borderClass = 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
          if (isFailed) {
            borderClass = 'border-rose-500/70 bg-rose-950/20 shadow-rose-950/30'
          } else if (isSaturated) {
            borderClass = 'border-amber-500/70 bg-amber-950/20 shadow-amber-950/30'
          } else if (isSpof) {
            borderClass = 'border-purple-500/50 bg-slate-950/80'
          }

          return (
            <div
              key={node.id}
              className={`p-4 rounded-xl border transition-all duration-200 relative flex flex-col justify-between gap-3 ${borderClass}`}
              data-testid={`node-${node.id}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {getNodeIcon(node.type)}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {isSpof && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> SPOF
                      </span>
                    )}
                    {isFailed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> FAILED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> LIVE
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{node.name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono uppercase">{node.type}</span>
                </div>
              </div>

              {/* Node Metrics & Specs */}
              <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="text-slate-200 font-semibold">{node.capacityQps.toLocaleString()} QPS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Base Latency:</span>
                  <span className="text-sky-300">{node.baseLatencyMs} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Replicas:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">x{node.replicationFactor}</span>
                    {onIncrementReplication && (
                      <button
                        type="button"
                        onClick={() => onIncrementReplication(node.id)}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        title="Add replica"
                      >
                        +1
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Node Interactive Action */}
              {onToggleNodeHealth && (
                <button
                  type="button"
                  onClick={() => onToggleNodeHealth(node.id)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isFailed
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300'
                  }`}
                >
                  {isFailed ? 'Restore Node' : 'Simulate Crash'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Network Edges / Flow Connectivity */}
      <div className="border-t border-slate-800 pt-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Inter-Service Network Topology ({topology.edges.length} Links)
        </span>
        <div className="flex flex-wrap gap-2">
          {topology.edges.map(edge => (
            <div
              key={edge.id}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
            >
              <span className="text-slate-400">{edge.sourceNodeId}</span>
              <span className="text-indigo-400 font-bold">→</span>
              <span className="text-slate-400">{edge.targetNodeId}</span>
              <span className="text-slate-500">({edge.protocol}, {edge.latencyMs}ms)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
