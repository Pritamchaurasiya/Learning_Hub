import React, { useState, useEffect } from 'react'
import {
  CanaryDeploymentService,
  FALLBACK_CANARY_DEPLOYMENTS,
} from '../services/canaryDeploymentService'
import { CanaryRelease, TargetRegion } from '../types/canary'
import { CanaryTrafficGauge } from '../components/canary/CanaryTrafficGauge'
import { SloHealthMatrix } from '../components/canary/SloHealthMatrix'
import { CanaryPipelineStepper } from '../components/canary/CanaryPipelineStepper'
import {
  Activity,
  AlertTriangle,
  Flame,
  Globe2,
  PlusCircle,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react'

export const CanaryConsolePage: React.FC = () => {
  const [deployments, setDeployments] = useState<CanaryRelease[]>(FALLBACK_CANARY_DEPLOYMENTS)
  const [activeDeploymentId, setActiveDeploymentId] = useState<string>(
    FALLBACK_CANARY_DEPLOYMENTS[0]?.id || ''
  )
  const [selectedRegion, setSelectedRegion] = useState<TargetRegion>('us-east-1')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showNewModal, setShowNewModal] = useState<boolean>(false)

  // Simulation form states
  const [rpsDelta, setRpsDelta] = useState<number>(250)
  const [errorDelta, setErrorDelta] = useState<number>(0.02)
  const [latencyDelta, setLatencyDelta] = useState<number>(10)

  // New Rollout form states
  const [newServiceName, setNewServiceName] = useState<string>('Search Query Indexer')
  const [newVersion, setNewVersion] = useState<string>('v2.5.0')
  const [newCommitMsg, setNewCommitMsg] = useState<string>('perf(search): migrate to HNSW vector index')

  useEffect(() => {
    loadDeployments()
  }, [])

  const loadDeployments = async () => {
    setIsLoading(true)
    try {
      const data = await CanaryDeploymentService.fetchDeployments()
      if (data && data.length > 0) {
        setDeployments(data)
        if (!activeDeploymentId || !data.some(d => d.id === activeDeploymentId)) {
          setActiveDeploymentId(data[0].id)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const activeDeployment =
    deployments.find(d => d.id === activeDeploymentId) || deployments[0]

  const handleAdvanceStage = async () => {
    if (!activeDeployment) return
    setIsLoading(true)
    try {
      const updated = await CanaryDeploymentService.advanceStage(activeDeployment.id)
      setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!activeDeployment) return
    setIsLoading(true)
    try {
      const updated = await CanaryDeploymentService.triggerRollback(
        activeDeployment.id,
        'Manual operator emergency abort via Canary Console'
      )
      setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulateLoad = async () => {
    if (!activeDeployment) return
    setIsLoading(true)
    try {
      const updated = await CanaryDeploymentService.simulateTrafficLoad(activeDeployment.id, {
        rpsIncrease: rpsDelta,
        injectErrorRatePercent: errorDelta,
        injectLatencySpikeMs: latencyDelta,
      })
      setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleTriggerAnomalySpike = async () => {
    if (!activeDeployment) return
    setIsLoading(true)
    try {
      // Inject error rate high enough to trigger autonomous rollback
      const updated = await CanaryDeploymentService.simulateTrafficLoad(activeDeployment.id, {
        rpsIncrease: 600,
        injectErrorRatePercent: 1.85,
        injectLatencySpikeMs: 80,
      })
      setDeployments(prev => prev.map(d => (d.id === updated.id ? updated : d)))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRollout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceName || !newVersion) return
    setIsLoading(true)
    try {
      const created = await CanaryDeploymentService.startRollout({
        serviceName: newServiceName,
        version: newVersion,
        region: selectedRegion,
        gitCommitMessage: newCommitMsg,
      })
      setDeployments(prev => [created, ...prev])
      setActiveDeploymentId(created.id)
      setShowNewModal(false)
    } catch (err) {
      console.error('CreateRollout Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Navigation & Status */}
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Flame className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Autonomous GitOps Progressive Delivery Studio
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Canary Rollout Orchestrator, Statistical SLI Anomaly Analysis & Automated Rollback Guardrails
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Region Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
              <select
                aria-label="Target Region"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value as TargetRegion)}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                <option value="global-mesh">global-mesh (Anycast)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadDeployments}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              New Canary Rollout
            </button>
          </div>
        </header>

        {/* Deployments Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {deployments.map(dep => {
            const isActive = dep.id === activeDeploymentId
            return (
              <button
                key={dep.id}
                type="button"
                onClick={() => setActiveDeploymentId(dep.id)}
                className={`px-4 py-2.5 rounded-xl border text-left flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {dep.serviceName}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      dep.status === 'PROMOTED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : dep.status === 'ROLLED_BACK'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {dep.version}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                  <span>Weight: {dep.trafficWeightCanary}%</span>
                  <span>•</span>
                  <span>{dep.region}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Active Deployment Details */}
        {activeDeployment && (
          <div className="space-y-6">
            {/* Pipeline Stepper */}
            <CanaryPipelineStepper
              deployment={activeDeployment}
              onAdvanceStage={handleAdvanceStage}
              onRollback={handleRollback}
            />

            {/* Traffic Shifter & SLI Health Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CanaryTrafficGauge deployment={activeDeployment} />
              <SloHealthMatrix deployment={activeDeployment} />
            </div>

            {/* Simulation & Synthetic Traffic Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Synthetic Traffic & Fault-Injection Simulator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inject controlled load, error spikes, and latency degradation to benchmark automated rollback triggers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerAnomalySpike}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Trigger Anomaly Spike (Auto-Rollback)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    RPS Increase (+{rpsDelta} req/s)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="1500"
                    step="50"
                    value={rpsDelta}
                    onChange={e => setRpsDelta(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Inject Error Rate (+{errorDelta}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={errorDelta}
                    onChange={e => setErrorDelta(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Latency Spike (+{latencyDelta}ms)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={latencyDelta}
                    onChange={e => setLatencyDelta(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSimulateLoad}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Inject Synthetic Traffic Load
                </button>
              </div>
            </div>

            {/* GitOps History Logs Terminal */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  GitOps Provenance & Deployment Event Log
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {activeDeployment.historyLogs.length} events logged
                </span>
              </div>

              <div
                data-testid="gitops-log-terminal"
                className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 font-mono text-xs max-h-52 overflow-y-auto space-y-2 text-slate-300 scrollbar-thin"
              >
                {activeDeployment.historyLogs.map((log, index) => {
                  const levelColor =
                    log.level === 'ERROR'
                      ? 'text-rose-400'
                      : log.level === 'WARN'
                      ? 'text-amber-400'
                      : log.level === 'SUCCESS'
                      ? 'text-emerald-400'
                      : 'text-blue-400'

                  return (
                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 select-none">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`font-bold ${levelColor}`}>
                        [{log.level}]
                      </span>
                      <span className="text-slate-500 font-semibold">[{log.stage}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Canary Rollout */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-1">
                Initiate New Canary Rollout
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                Configure service target version and initialize at 10% progressive traffic.
              </p>

              <form onSubmit={handleCreateRollout} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Catalog Service"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Semantic Version
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={e => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="e.g. v2.1.0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Git Commit Message
                  </label>
                  <input
                    type="text"
                    required
                    value={newCommitMsg}
                    onChange={e => setNewCommitMsg(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. feat: add payment retry queue"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleCreateRollout}
                    disabled={isLoading}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md"
                  >
                    Launch 10% Canary
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default CanaryConsolePage
