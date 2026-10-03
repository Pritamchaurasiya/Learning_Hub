import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Code2,
  Zap,
  BookOpen,
  X,
  Filter,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ConceptNode, KnowledgeGraphData } from '../../services/analyticsService'
import { Card } from '../ui/Card'

interface KnowledgeGraphVisualizerProps {
  graphData: KnowledgeGraphData
  className?: string
}

export const KnowledgeGraphVisualizer: React.FC<KnowledgeGraphVisualizerProps> = ({
  graphData,
  className = '',
}) => {
  const navigate = useNavigate()
  const { nodes = [], recommendedConceptId, overallProgressPercentage } = graphData

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Selected node object
  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  )

  // Group nodes by level (Topological Depth)
  const nodesByLevel = useMemo(() => {
    const map = new Map<number, ConceptNode[]>()
    for (const node of nodes) {
      const lvl = node.level ?? 0
      const list = map.get(lvl) ?? []
      list.push(node)
      map.set(lvl, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [nodes])

  // Filtered nodes
  const filteredNodeIds = useMemo(() => {
    if (filterStatus === 'ALL') return new Set(nodes.map(n => n.id))
    return new Set(nodes.filter(n => n.status === filterStatus).map(n => n.id))
  }, [nodes, filterStatus])

  // Resolve prerequisite node names for selected node
  const prerequisiteNodes = useMemo(() => {
    if (!selectedNode || !selectedNode.prerequisiteIds) return []
    return selectedNode.prerequisiteIds
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is ConceptNode => Boolean(n))
  }, [selectedNode, nodes])

  const getNodeStatusBadge = (node: ConceptNode) => {
    switch (node.status) {
      case 'MASTERED':
        return {
          icon: CheckCircle2,
          text: 'Mastered',
          bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dotColor: 'bg-emerald-500',
        }
      case 'IN_PROGRESS':
        return {
          icon: Sparkles,
          text: 'In Progress',
          bgColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          dotColor: 'bg-indigo-500',
        }
      case 'UNLOCKED':
        return {
          icon: Unlock,
          text: 'Ready to Learn',
          bgColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          dotColor: 'bg-sky-500',
        }
      default:
        return {
          icon: Lock,
          text: 'Locked',
          bgColor: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          dotColor: 'bg-gray-400',
        }
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Progress Bar and Filter Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Curriculum Knowledge Graph & BKT Mastery Tree
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {nodes.length} Concepts
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Topological prerequisite graph with dynamic Bayesian Knowledge Tracing belief updates
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MASTERED', label: 'Mastered' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'UNLOCKED', label: 'Ready' },
            { id: 'LOCKED', label: 'Locked' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterStatus === filter.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Curriculum Mastery Progress Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="font-bold text-gray-700 dark:text-gray-300">
          Global Knowledge Graph Mastery
        </span>
        <div className="flex-1 w-full sm:max-w-md flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgressPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <span className="font-black text-gray-900 dark:text-white tabular-nums">
            {overallProgressPercentage}%
          </span>
        </div>
      </div>

      {/* Main Graph Grid Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodesByLevel.map(([level, levelNodes]) => (
          <div
            key={level}
            className="space-y-3 bg-gray-50/50 dark:bg-gray-950/40 p-4 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400 pb-1 border-b border-gray-200 dark:border-gray-800">
              <span>Tier {level + 1}</span>
              <span>{level === 0 ? 'Foundations' : level === 1 ? 'Core' : level === 2 ? 'Intermediate' : 'Advanced'}</span>
            </div>

            <div className="space-y-3">
              {levelNodes.map(node => {
                const badge = getNodeStatusBadge(node)
                const isSelected = selectedNodeId === node.id
                const isRecommended = recommendedConceptId === node.id || node.isRecommended
                const isDimmed = !filteredNodeIds.has(node.id)

                return (
                  <motion.div
                    key={node.id}
                    layout
                    whileHover={{ scale: isDimmed ? 1 : 1.02 }}
                    whileTap={{ scale: isDimmed ? 1 : 0.98 }}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden ${
                      isDimmed ? 'opacity-30' : 'opacity-100'
                    } ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-50/20 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                        : isRecommended
                        ? 'border-indigo-500/60 shadow-md bg-white dark:bg-gray-900'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">
                        Next Up
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {node.name}
                      </h4>
                      <div className={`shrink-0 w-2 h-2 rounded-full ${badge.dotColor}`} />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.bgColor}`}
                      >
                        <badge.icon className="w-3 h-3" />
                        {badge.text}
                      </span>
                      <span className="font-bold text-gray-500 dark:text-gray-400">
                        {Math.round(node.masteryScore * 100)}% Mastery
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Node Details Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
          >
            <Card className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">
                      Concept Node
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        getNodeStatusBadge(selectedNode).bgColor
                      }`}
                    >
                      {getNodeStatusBadge(selectedNode).text}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                    {selectedNode.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"
                  aria-label="Close concept drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedNode.description && (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {selectedNode.description}
                </p>
              )}

              {/* Prerequisites Tree */}
              {prerequisiteNodes.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Prerequisites:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {prerequisiteNodes.map(prereq => (
                      <span
                        key={prereq.id}
                        className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 ${
                          prereq.status === 'MASTERED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {prereq.status === 'MASTERED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        {prereq.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                <button
                  onClick={() => navigate('/problems')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Practice Problems</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
                <button
                  onClick={() => navigate('/revision')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Review Flashcards</span>
                </button>
                <button
                  onClick={() => navigate('/library')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>Read Chapter</span>
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
