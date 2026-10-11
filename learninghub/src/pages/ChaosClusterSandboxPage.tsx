import React, { useState, useEffect } from 'react'
import {
  Flame,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import {
  ClusterTopology,
  ChaosExperimentConfig,
  ChaosSimulationResult,
} from '../types/chaosCluster'
import { chaosClusterService } from '../services/chaosClusterService'
import { ClusterTopologyViewer } from '../components/chaos/ClusterTopologyViewer'
import { ChaosExperimentControlPanel } from '../components/chaos/ChaosExperimentControlPanel'
import { CircuitBreakerStatusHUD } from '../components/chaos/CircuitBreakerStatusHUD'
import { ResilienceAuditScorecard } from '../components/chaos/ResilienceAuditScorecard'

export const ChaosClusterSandboxPage: React.FC = () => {
  const [topology, setTopology] = useState<ClusterTopology | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<ChaosSimulationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'topology' | 'breakers' | 'audit'>('all')

  useEffect(() => {
    loadInitialTopology()
  }, [])

  const loadInitialTopology = async () => {
    try {
      setErrorMsg(null)
      const data = await chaosClusterService.getTopology()
      setTopology(data)
    } catch (err) {
      console.error('Failed to load cluster topology:', err)
      setErrorMsg('Failed to load topology from cluster service.')
    }
  }

  const handleRunExperiment = async (config: ChaosExperimentConfig) => {
    setIsSimulating(true)
    setErrorMsg(null)
    try {
      const result = await chaosClusterService.runSimulation(config)
      setSimulationResult(result)
      setTopology(result.finalTopology)
      if (result.experimentConfig.targetNodeId) {
        setSelectedNodeId(result.experimentConfig.targetNodeId)
      }
    } catch (err) {
      console.error('Chaos experiment failed:', err)
      setErrorMsg('Error executing chaos simulation.')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleResetCluster = async () => {
    setIsSimulating(true)
    setErrorMsg(null)
    try {
      const healthy = await chaosClusterService.resetTopology()
      setTopology(healthy)
      setSimulationResult(null)
      setSelectedNodeId(undefined)
    } catch (err) {
      console.error('Cluster reset failed:', err)
      setErrorMsg('Error resetting cluster state.')
    } finally {
      setIsSimulating(false)
    }
  }

  if (!topology) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono text-slate-400">
            Initializing Distributed Microservice Cluster Mesh...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame className="w-48 h-48 text-rose-500" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Chaos Monkey Virtual Sandbox
              </span>
              <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                Milestone 23 • Distributed Systems
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Autonomous Chaos Monkey & Network Partition Sandbox
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Stress-test virtual microservice clusters against real-world failure dynamics:
              network partitions, latency spikes, packet loss, thread exhaustion, and node crashes.
              Observe circuit breaker shedding, fallback activation, and automated post-mortem auditing.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Nodes</span>
              <span className="text-lg font-mono font-bold text-white">{topology.nodes.length}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Links</span>
              <span className="text-lg font-mono font-bold text-indigo-400">{topology.links.length}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Breakers</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {topology.nodes.filter((n) => n.circuitBreaker.state === 'CLOSED').length}/
                {topology.nodes.length}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Unified Lab View
            </button>
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'topology'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Cluster Topology & Fault Mesh
            </button>
            <button
              onClick={() => setActiveTab('breakers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'breakers'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Circuit Breakers HUD
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Resilience Audit & Post-Mortem
            </button>
          </div>

          <button
            onClick={handleResetCluster}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset to Healthy Baseline
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Layout */}
      {(activeTab === 'all' || activeTab === 'topology') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ClusterTopologyViewer
              topology={topology}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => setSelectedNodeId(id)}
            />
          </div>
          <div className="lg:col-span-5">
            <ChaosExperimentControlPanel
              topology={topology}
              isSimulating={isSimulating}
              onRunExperiment={handleRunExperiment}
              onResetCluster={handleResetCluster}
            />
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'breakers') && (
        <div className="grid grid-cols-1 gap-6">
          <CircuitBreakerStatusHUD
            topology={topology}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'audit') && simulationResult && (
        <div className="grid grid-cols-1 gap-6">
          <ResilienceAuditScorecard
            scorecard={simulationResult.auditScorecard}
            telemetryEvents={simulationResult.telemetryEvents}
          />
        </div>
      )}
    </div>
  )
}

export default ChaosClusterSandboxPage
