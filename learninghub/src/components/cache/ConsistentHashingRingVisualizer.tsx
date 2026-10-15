import React, { useState } from 'react'
import { Server, Database, Plus, Trash2, Search, ArrowRight, ShieldCheck, Activity } from 'lucide-react'
import type { RingTopology, CacheItem, NodeMigrationDiff, CacheNode } from '../../types/distributedCache'

interface ConsistentHashingRingVisualizerProps {
  topology: RingTopology
  items: CacheItem[]
  onAddNode: (node: { id: string; name: string; weight?: number }) => Promise<NodeMigrationDiff | void>
  onRemoveNode: (nodeId: string) => Promise<NodeMigrationDiff | void>
  onPutItem: (key: string, value: string) => Promise<void>
}

const NODE_COLORS: Record<string, { stroke: string; fill: string; text: string; bg: string }> = {
  'node-alpha': { stroke: '#3b82f6', fill: '#1d4ed8', text: 'text-blue-400', bg: 'bg-blue-950/60 border-blue-500/40' },
  'node-beta': { stroke: '#10b981', fill: '#047857', text: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/40' },
  'node-gamma': { stroke: '#f59e0b', fill: '#b45309', text: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-500/40' },
  'node-delta': { stroke: '#8b5cf6', fill: '#6d28d9', text: 'text-purple-400', bg: 'bg-purple-950/60 border-purple-500/40' },
  'node-epsilon': { stroke: '#ec4899', fill: '#be185d', text: 'text-pink-400', bg: 'bg-pink-950/60 border-pink-500/40' },
}

const DEFAULT_COLOR = { stroke: '#06b6d4', fill: '#0e7490', text: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-500/40' }

export const ConsistentHashingRingVisualizer: React.FC<ConsistentHashingRingVisualizerProps> = ({
  topology,
  items,
  onAddNode,
  onRemoveNode,
  onPutItem,
}) => {
  const [searchKey, setSearchKey] = useState('user:session:usr_9901')
  const [newItemKey, setNewItemKey] = useState('')
  const [newItemVal, setNewItemVal] = useState('')
  const [newNodeName, setNewNodeName] = useState('')
  const [selectedNode, setSelectedNode] = useState<CacheNode | null>(null)
  const [migrationDiff, setMigrationDiff] = useState<NodeMigrationDiff | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Find active searched item
  const searchedItem = items.find(it => it.key === searchKey) || items[0]

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNodeName.trim()) return
    setIsSubmitting(true)
    try {
      const id = `node-${newNodeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      const diff = await onAddNode({ id, name: newNodeName })
      if (diff) setMigrationDiff(diff)
      setNewNodeName('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveNode = async (nodeId: string) => {
    setIsSubmitting(true)
    try {
      const diff = await onRemoveNode(nodeId)
      if (diff) setMigrationDiff(diff)
      if (selectedNode?.id === nodeId) setSelectedNode(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePutItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemKey.trim()) return
    setIsSubmitting(true)
    try {
      await onPutItem(newItemKey, newItemVal || '{"active":true}')
      setSearchKey(newItemKey)
      setNewItemKey('')
      setNewItemVal('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const radius = 135
  const center = 170

  return (
    <div className="space-y-6">
      {/* Migration Notice Banner */}
      {migrationDiff && (
        <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-4 flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-indigo-200">
                Key Migration Verified ({migrationDiff.action === 'ADD_NODE' ? 'Node Joined' : 'Node Evicted'})
              </h4>
              <p className="text-xs text-indigo-300/80 mt-1">{migrationDiff.impactSummary}</p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-emerald-400 font-mono">
                  Consistent Hashing: {migrationDiff.migrationPercentage}% keys moved
                </span>
                <span className="text-red-400 line-through font-mono">
                  Naive Modulo Hashing: {migrationDiff.naiveModuloMigrationPercentage}% invalidated
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMigrationDiff(null)}
            className="text-xs text-indigo-400 hover:text-indigo-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Ring Canvas & Cluster Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: SVG Circular Ring Visualizer */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Consistent Hashing Ring ($[0, 2^{32}-1]$)
              </h3>
              <p className="text-xs text-slate-400">
                {topology.totalVnodes} virtual nodes ({topology.vnodesPerNode} vnodes/node) with clockwise successor routing
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                {topology.nodes.length} Nodes
              </span>
            </div>
          </div>

          <div className="relative w-[340px] h-[340px] my-2 flex items-center justify-center">
            <svg width="340" height="340" className="overflow-visible">
              {/* Outer circular track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.4"
              />

              {/* Physical & Virtual node markers placed around the circumference */}
              {topology.nodes.map((node, nodeIdx) => {
                const colors = NODE_COLORS[node.id] || DEFAULT_COLOR
                const angle = (nodeIdx / topology.nodes.length) * 2 * Math.PI - Math.PI / 2
                const cx = center + radius * Math.cos(angle)
                const cy = center + radius * Math.sin(angle)
                const isSelected = selectedNode?.id === node.id
                const isPrimaryForSearch = searchedItem?.assignedNodeId === node.id
                const isReplicaForSearch = searchedItem?.replicaNodeIds.includes(node.id)

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Glow pulse if active primary */}
                    {isPrimaryForSearch && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="20"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="2"
                        className="animate-ping opacity-60"
                      />
                    )}
                    {/* Physical Node circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 16 : 14}
                      fill={colors.fill}
                      stroke={isPrimaryForSearch ? '#38bdf8' : isReplicaForSearch ? '#a855f7' : colors.stroke}
                      strokeWidth={isPrimaryForSearch || isReplicaForSearch ? 3 : 1.5}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {node.name.slice(-1)}
                    </text>
                  </g>
                )
              })}

              {/* Searched key placement marker */}
              {searchedItem && (
                (() => {
                  const normalizedAngle = ((searchedItem.hash % 1000) / 1000) * 2 * Math.PI - Math.PI / 2
                  const keyX = center + (radius - 22) * Math.cos(normalizedAngle)
                  const keyY = center + (radius - 22) * Math.sin(normalizedAngle)
                  return (
                    <g>
                      <circle cx={keyX} cy={keyY} r="6" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
                      <line
                        x1={center}
                        y1={center}
                        x2={keyX}
                        y2={keyY}
                        stroke="#f43f5e"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        opacity="0.6"
                      />
                    </g>
                  )
                })()
              )}

              {/* Center Ring Info Hub */}
              <circle cx={center} cy={center} r="60" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text x={center} y={center - 14} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
                ACTIVE KEYS
              </text>
              <text x={center} y={center + 12} textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="bold">
                {items.length}
              </text>
              <text x={center} y={center + 28} textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                Hash Space: 2^32
              </text>
            </svg>
          </div>

          {/* Quick Key Lookup Simulator Bar */}
          <div className="w-full mt-3 bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                Live Key Router & Replicas ($N={topology.replicationFactor}$)
              </span>
              {searchedItem && (
                <span className="text-[10px] text-cyan-400 font-mono">
                  Hash: {searchedItem.hash}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchKey}
                onChange={e => setSearchKey(e.target.value)}
                placeholder="e.g. user:session:usr_9901"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {searchedItem && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Primary Node:</span>
                  <span className="font-semibold text-white bg-blue-900/60 border border-blue-500/40 px-2 py-0.5 rounded">
                    {searchedItem.assignedNodeId}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Replicas:</span>
                  <div className="flex gap-1">
                    {searchedItem.replicaNodeIds.map(rId => (
                      <span key={rId} className="text-[10px] font-mono bg-purple-950/80 border border-purple-500/40 text-purple-300 px-1.5 py-0.5 rounded">
                        {rId.replace('node-', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cluster Nodes & Ingestion Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Node Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topology.nodes.map(node => {
              const colors = NODE_COLORS[node.id] || DEFAULT_COLOR
              const isPrimary = searchedItem?.assignedNodeId === node.id
              const isReplica = searchedItem?.replicaNodeIds.includes(node.id)

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${
                    isPrimary
                      ? 'border-blue-400 bg-blue-950/40 shadow-lg shadow-blue-500/10'
                      : isReplica
                      ? 'border-purple-400/60 bg-purple-950/30'
                      : colors.bg
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-slate-300" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{node.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {node.host}:{node.port}
                        </span>
                      </div>
                    </div>
                    {topology.nodes.length > 2 && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveNode(node.id)
                        }}
                        disabled={isSubmitting}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-700/50 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Keys Held</span>
                      <span className="font-bold text-white font-mono">{node.keysCount} keys</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">RAM Utilization</span>
                      <span className="font-mono text-cyan-300">
                        {node.memoryUsedMb}MB / {node.maxMemoryMb}MB
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Weight: {node.weight}x</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono ${node.status === 'HEALTHY' ? 'text-emerald-400 bg-emerald-950/80' : 'text-amber-400 bg-amber-950/80'}`}>
                      {node.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Node & Ingest Item Accordion */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Physical Node (Simulate Rebalance)
              </h4>
              <form onSubmit={handleAddNode} className="flex gap-2">
                <input
                  type="text"
                  value={newNodeName}
                  onChange={e => setNewNodeName(e.target.value)}
                  placeholder="e.g. Cluster Epsilon"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newNodeName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Node
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Write Cache Key-Value Pair
              </h4>
              <form onSubmit={handlePutItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newItemKey}
                  onChange={e => setNewItemKey(e.target.value)}
                  placeholder="Key (e.g. course:meta:algo)"
                  className="sm:col-span-6 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <input
                  type="text"
                  value={newItemVal}
                  onChange={e => setNewItemVal(e.target.value)}
                  placeholder='JSON Value: {"price":99}'
                  className="sm:col-span-4 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newItemKey.trim()}
                  className="sm:col-span-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold px-2 py-1 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  Store
                </button>
              </form>
            </div>
          </div>

          {/* Quick Mathematical Invariant Audit */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Standard Deviation ($\sigma$): <strong className="text-white font-mono">{topology.standardDeviation}</strong></span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Balance: {topology.standardDeviation < 1.0 ? 'Optimal (Homogeneous)' : 'Moderate Skew'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
