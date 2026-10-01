import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Network,
  Lock,
  Unlock,
  CheckCircle2,
  Brain,
  Sparkles,
  Target,
  RefreshCw,
  Search,
  Code2,
} from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Skeleton } from './ui/Skeleton'
import { analyticsService, type ConceptNode } from '../services/analyticsService'

export default function KnowledgeGraphVisualizer() {
  const navigate = useNavigate()
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'IN_PROGRESS' | 'MASTERED'>(
    'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: graphRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => analyticsService.getKnowledgeGraph(),
    staleTime: 5 * 60 * 1000,
  })

  const graphData = graphRes?.data ?? {
    nodes: [],
    edges: [],
    recommendedConceptId: null,
    overallProgressPercentage: 0,
  }

  // Group nodes by hierarchy level
  const groupedByLevel = useMemo(() => {
    const map = new Map<number, ConceptNode[]>()
    for (const node of graphData.nodes) {
      const list = map.get(node.level) ?? []
      list.push(node)
      map.set(node.level, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [graphData.nodes])

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(node => {
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'UNLOCKED'
            ? node.status === 'UNLOCKED' ||
              node.status === 'IN_PROGRESS' ||
              node.status === 'MASTERED'
            : node.status === statusFilter

      const matchesSearch =
        searchQuery.trim() === '' ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesStatus && matchesSearch
    })
  }, [graphData.nodes, statusFilter, searchQuery])

  const getNodeStatusBadge = (status: ConceptNode['status']) => {
    switch (status) {
      case 'MASTERED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Mastered
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
            <Brain className="w-3 h-3" /> In Progress
          </span>
        )
      case 'UNLOCKED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
            <Unlock className="w-3 h-3" /> Unlocked
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gray-500/20 text-gray-500 dark:text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" /> Prereqs Needed
          </span>
        )
    }
  }

  const handleLaunchTutor = (concept: ConceptNode) => {
    navigate('/ai-tutor', {
      state: {
        initialPrompt: `Explain the concept of ${concept.name} step-by-step with practical code examples.`,
      },
    })
  }

  const handleLaunchPractice = () => {
    navigate('/problems')
  }

  const handleLaunchTest = () => {
    navigate('/tests-a')
  }

  return (
    <Card className="p-6 md:p-8 bg-white dark:bg-gray-900 border-none shadow-2xl rounded-3xl relative overflow-hidden space-y-6">
      {/* Header & Overall Metric */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                Neural Concept Graph
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Topological Mastery Matrix & Prerequisite DAG
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Global Graph Mastery
            </p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
              {graphData.overallProgressPercentage}%
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="rounded-xl font-bold gap-2 text-xs"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Matrix
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-full sm:w-auto">
          {(['ALL', 'UNLOCKED', 'IN_PROGRESS', 'MASTERED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                statusFilter === tab
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search concepts..."
            className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Graph Visualization / Hierarchy Layers */}
      {isLoading ? (
        <div className="space-y-6 py-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="p-12 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800/40">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
            Failed to load Neural Knowledge Matrix.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-4">
            Retry Connection
          </Button>
        </div>
      ) : (
        <div className="space-y-8 py-2">
          {groupedByLevel.map(([level, nodes]) => {
            const visibleNodes = nodes.filter(n => filteredNodes.some(fn => fn.id === n.id))

            if (visibleNodes.length === 0) return null

            return (
              <div key={level} className="relative">
                {/* Level Title & Indicator */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-2.5 py-1 rounded-lg">
                    Level {level}:{' '}
                    {level === 0
                      ? 'Foundations'
                      : level === 1
                        ? 'Core Data Structures'
                        : level === 2
                          ? 'Intermediate Structures'
                          : level === 3
                            ? 'Graph & Tree Systems'
                            : level === 4
                              ? 'Dynamic Programming'
                              : 'System Architecture'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent" />
                </div>

                {/* Nodes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleNodes.map(node => {
                    const isSelected = selectedNode?.id === node.id

                    return (
                      <motion.div
                        key={node.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedNode(node)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                            : node.isRecommended
                              ? 'border-purple-400 dark:border-purple-600 bg-purple-50/20 dark:bg-purple-950/20 shadow-md shadow-purple-500/5'
                              : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        {node.isRecommended && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-2.5 h-2.5" /> Next Goal
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {node.name}
                          </h4>
                          {getNodeStatusBadge(node.status)}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed font-medium">
                          {node.description ??
                            'Fundamental concept milestone in learning trajectory.'}
                        </p>

                        {/* Mastery Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400">
                            <span>Mastery Rate</span>
                            <span className="tabular-nums font-black text-gray-700 dark:text-gray-300">
                              {Math.round(node.masteryScore * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(node.masteryScore * 100)}%` }}
                              className={`h-full rounded-full ${
                                node.masteryScore >= 0.8
                                  ? 'bg-emerald-500'
                                  : node.masteryScore > 0
                                    ? 'bg-indigo-500'
                                    : 'bg-gray-400'
                              }`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Concept Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-950 text-white border border-indigo-500/30 shadow-2xl relative"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-white/10 text-indigo-300">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black">{selectedNode.name}</h4>
                    {getNodeStatusBadge(selectedNode.status)}
                  </div>
                  <p className="text-xs text-indigo-200/70 font-medium mt-0.5">
                    Level {selectedNode.level} &bull; Type: {selectedNode.type}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs font-bold text-white/50 hover:text-white transition-colors self-start md:self-auto"
              >
                Close Panel
              </button>
            </div>

            <p className="text-sm text-white/90 leading-relaxed font-medium mb-6">
              {selectedNode.description ??
                'Master this foundational concept to unlock higher-tier algorithms and data structure problem sets.'}
            </p>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
              <Button
                onClick={() => handleLaunchTutor(selectedNode)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs gap-2 shadow-lg shadow-indigo-500/30"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Learn with AI Tutor
              </Button>
              <Button
                variant="outline"
                onClick={() => handleLaunchPractice()}
                className="text-white border-white/20 hover:bg-white/10 font-bold rounded-xl text-xs gap-2"
                leftIcon={<Code2 className="w-3.5 h-3.5" />}
              >
                Practice in DSA Lab
              </Button>
              <Button
                variant="outline"
                onClick={() => handleLaunchTest()}
                className="text-white border-white/20 hover:bg-white/10 font-bold rounded-xl text-xs gap-2"
                leftIcon={<Target className="w-3.5 h-3.5" />}
              >
                Take Adaptive Quiz
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
