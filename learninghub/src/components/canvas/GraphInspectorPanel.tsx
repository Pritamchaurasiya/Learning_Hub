import React, { useState } from 'react'
import { GraphNode, GraphEdge } from '../../types/canvasStudio'
import { canvasStudioService } from '../../services/canvasStudioService'
import { Network, Route, CheckCircle2 } from 'lucide-react'

interface GraphInspectorPanelProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onAddNode: (label: string) => void
  onAddEdge: (fromId: string, toId: string, directed: boolean) => void
}

export const GraphInspectorPanel: React.FC<GraphInspectorPanelProps> = ({
  nodes,
  edges,
  onAddNode,
  onAddEdge,
}) => {
  const [nodeInput, setNodeInput] = useState<string>('')
  const [fromNodeId, setFromNodeId] = useState<string>('')
  const [toNodeId, setToNodeId] = useState<string>('')
  const [isDirected, setIsDirected] = useState<boolean>(true)
  const [pathStartId, setPathStartId] = useState<string>('')
  const [pathEndId, setPathEndId] = useState<string>('')
  const [computedPath, setComputedPath] = useState<string[]>([])

  const topology = canvasStudioService.analyzeGraphTopology(nodes, edges)

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodeInput.trim()) return
    onAddNode(nodeInput.trim().toUpperCase())
    setNodeInput('')
  }

  const handleCreateEdge = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return
    onAddEdge(fromNodeId, toNodeId, isDirected)
  }

  const handleComputePath = () => {
    if (!pathStartId || !pathEndId) return
    const path = canvasStudioService.computeShortestPath(pathStartId, pathEndId, nodes, edges)
    setComputedPath(path)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">DSA Graph Inspector</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            |V| = {topology.nodeCount}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            |E| = {topology.edgeCount}
          </span>
        </div>
      </div>

      {/* Quick Add Node */}
      <form onSubmit={handleCreateNode} className="flex gap-2">
        <input
          type="text"
          value={nodeInput}
          onChange={e => setNodeInput(e.target.value)}
          placeholder="New Vertex Label (e.g. A, B, C)"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
        >
          Add Vertex
        </button>
      </form>

      {/* Connect Edges */}
      {nodes.length >= 2 && (
        <form onSubmit={handleCreateEdge} className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Connect Vertices with Edge:</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={fromNodeId}
              onChange={e => setFromNodeId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            >
              <option value="">From Vertex...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <select
              value={toNodeId}
              onChange={e => setToNodeId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            >
              <option value="">To Vertex...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isDirected}
                onChange={e => setIsDirected(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500"
              />
              Directed Edge (u → v)
            </label>
            <button
              type="submit"
              disabled={!fromNodeId || !toNodeId}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-50"
            >
              Link Edge
            </button>
          </div>
        </form>
      )}

      {/* Adjacency List Representation */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-400">Adjacency List Mapping:</div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs max-h-28 overflow-y-auto space-y-1">
          {Object.entries(topology.adjacencyList).length === 0 ? (
            <div className="text-slate-500 italic">No vertices added yet.</div>
          ) : (
            Object.entries(topology.adjacencyList).map(([label, neighbors]) => (
              <div key={label} className="text-slate-300">
                <span className="text-emerald-400 font-bold">{label}</span> → [
                {neighbors.map(n => n.target).join(', ')}]
              </div>
            ))
          )}
        </div>
      </div>

      {/* BFS Shortest Path Finder */}
      {nodes.length >= 2 && (
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Route className="w-3.5 h-3.5 text-amber-400" />
            <span>Shortest Path Solver (BFS)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={pathStartId}
              onChange={e => setPathStartId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            >
              <option value="">Start Node...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <select
              value={pathEndId}
              onChange={e => setPathEndId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            >
              <option value="">End Node...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleComputePath}
            disabled={!pathStartId || !pathEndId}
            className="w-full py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-40"
          >
            Compute Shortest Path
          </button>

          {computedPath.length > 0 && (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Optimal Path: {computedPath.join(' → ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
