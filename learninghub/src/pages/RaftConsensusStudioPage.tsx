import { useState, useEffect, useRef, type FC } from 'react'
import { RotateCcw } from 'lucide-react'
import { RaftClusterState } from '../types/raftSimulation'
import { raftSimulationService } from '../services/raftSimulationService'
import { RaftClusterTopologyHUD } from '../components/raft/RaftClusterTopologyHUD'
import { RaftLogReplicationMatrix } from '../components/raft/RaftLogReplicationMatrix'
import { RaftDisruptionControlPanel } from '../components/raft/RaftDisruptionControlPanel'
import { RaftInvariantAuditCard } from '../components/raft/RaftInvariantAuditCard'

export const RaftConsensusStudioPage: FC = () => {
  const [clusterState, setClusterState] = useState<RaftClusterState | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadClusterState()
  }, [])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        handleStepTick()
      }, 500)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying])

  const loadClusterState = async () => {
    try {
      const state = await raftSimulationService.getClusterState()
      setClusterState(state)
    } catch (err) {
      console.error('Failed to load cluster state:', err)
    }
  }

  const handleStepTick = async () => {
    try {
      const nextState = await raftSimulationService.stepTick(50)
      setClusterState(nextState)
    } catch (err) {
      console.error('Tick error:', err)
    }
  }

  const handleResetCluster = async (nodeCount: number) => {
    try {
      setIsPlaying(false)
      const nextState = await raftSimulationService.resetCluster(nodeCount)
      setClusterState(nextState)
      setFeedbackMessage(`Reset cluster with ${nodeCount} nodes.`)
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch (err) {
      console.error('Reset error:', err)
    }
  }

  const handleTriggerElection = async (candidateId: string) => {
    try {
      const nextState = await raftSimulationService.triggerElection(candidateId)
      setClusterState(nextState)
      setFeedbackMessage(`Triggered election round for ${candidateId}.`)
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch (err) {
      console.error('Election error:', err)
    }
  }

  const handleToggleNodeCrash = async (nodeId: string, isAlive: boolean) => {
    try {
      const nextState = isAlive
        ? await raftSimulationService.crashNode(nodeId)
        : await raftSimulationService.recoverNode(nodeId)
      setClusterState(nextState)
      setFeedbackMessage(isAlive ? `Node ${nodeId} crashed.` : `Node ${nodeId} recovered.`)
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch (err) {
      console.error('Node lifecycle error:', err)
    }
  }

  const handleInjectSplitBrain = async () => {
    try {
      // Standard 5-node split: Group A (1, 2) vs Group B (3, 4, 5)
      const nextState = await raftSimulationService.partitionCluster(
        ['node-1', 'node-2'],
        ['node-3', 'node-4', 'node-5']
      )
      setClusterState(nextState)
      setFeedbackMessage('Injected 2v3 Split-Brain Network Partition.')
      setTimeout(() => setFeedbackMessage(null), 4000)
    } catch (err) {
      console.error('Partition error:', err)
    }
  }

  const handleHealPartition = async () => {
    try {
      const nextState = await raftSimulationService.healPartition()
      setClusterState(nextState)
      setFeedbackMessage('Network partition healed. Cluster reconciled.')
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch (err) {
      console.error('Heal error:', err)
    }
  }

  const handleSubmitClientCommand = async (command: string) => {
    setIsSubmitting(true)
    try {
      const result = await raftSimulationService.submitCommand(command)
      setClusterState(result.clusterState)
      if (result.committed) {
        setFeedbackMessage(`Command '${command}' committed to majority quorum at Index #${result.entryIndex}.`)
      } else {
        setFeedbackMessage(`Command '${command}' appended but UNCOMMITTED (no majority quorum reachable).`)
      }
      setTimeout(() => setFeedbackMessage(null), 4000)
    } catch (err) {
      console.error('Command submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!clusterState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono text-slate-400">
            Initializing Raft Consensus Protocol Simulation...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
                MILESTONE 31
              </span>
              <span className="text-xs font-mono text-emerald-400">
                RAFT PROTOCOL CONSENSUS ENGINE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Distributed Consensus & Raft Protocol Simulation Studio
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Inspect leader election quorums, animated heartbeats, log replication invariants, and split-brain network partitions with mathematical state machine guarantees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {feedbackMessage && (
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-3 py-1.5 rounded-lg border border-amber-800 animate-fade-in">
                {feedbackMessage}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleResetCluster(5)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default Cluster
            </button>
          </div>
        </div>

        {/* Global Cluster Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">HIGHEST TERM</span>
            <span className="text-white font-bold text-base">Term {clusterState.term}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">ACTIVE LEADER</span>
            <span className="text-emerald-400 font-bold text-base">
              {clusterState.leaderId ? `${clusterState.leaderId}` : 'No Leader (Electing...)'}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">NETWORK STATUS</span>
            <span
              className={`font-bold text-base ${
                clusterState.networkPartitionActive ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {clusterState.networkPartitionActive ? 'SPLIT-BRAIN (2 GROUPS)' : 'UNIFIED FABRIC'}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-slate-400 block text-[10px]">INVARIANTS</span>
            <span className="text-emerald-400 font-bold text-base">
              {clusterState.invariants.allInvariantsSatisfied ? '100% VERIFIED' : 'VIOLATION DETECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* Disruption Control Panel */}
      <RaftDisruptionControlPanel
        isPlaying={isPlaying}
        networkPartitionActive={clusterState.networkPartitionActive}
        isSubmitting={isSubmitting}
        onTogglePlay={() => setIsPlaying(prev => !prev)}
        onStepTick={handleStepTick}
        onResetCluster={handleResetCluster}
        onInjectSplitBrain={handleInjectSplitBrain}
        onHealPartition={handleHealPartition}
        onSubmitClientCommand={handleSubmitClientCommand}
      />

      {/* Cluster Node Topology HUD */}
      <RaftClusterTopologyHUD
        nodes={clusterState.nodes}
        leaderId={clusterState.leaderId}
        networkPartitionActive={clusterState.networkPartitionActive}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onTriggerElection={handleTriggerElection}
        onToggleNodeCrash={handleToggleNodeCrash}
      />

      {/* Log Replication Matrix */}
      <RaftLogReplicationMatrix
        nodes={clusterState.nodes}
        leaderId={clusterState.leaderId}
      />

      {/* Invariant Audit Scorecard */}
      <RaftInvariantAuditCard invariants={clusterState.invariants} />
    </div>
  )
}

export default RaftConsensusStudioPage
